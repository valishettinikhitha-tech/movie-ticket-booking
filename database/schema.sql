
-- MovieBox: Movie Ticket Booking
-- Run this script in your Supabase SQL Editor.

create extension if not exists pgcrypto;

-- 1. Movie catalogue
create table if not exists public.movies (
    id uuid primary key default gen_random_uuid(),
    title text not null check (length(trim(title)) between 1 and 120),
    description text not null default '',
    genre text not null check (length(trim(genre)) between 1 and 60),
    duration_minutes integer not null check (duration_minutes between 1 and 600),
    base_price numeric(10,2) not null check (base_price >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 2. Showtimes
create table if not exists public.showtimes (
    id uuid primary key default gen_random_uuid(),
    movie_id uuid not null references public.movies(id),
    starts_at timestamptz not null,
    ticket_price numeric(10,2) not null check (ticket_price >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (movie_id, starts_at)
);

create index if not exists idx_showtimes_movie_date
    on public.showtimes(movie_id, starts_at);

-- 3. Bookings
create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    booking_reference text not null unique
        check (booking_reference ~ '^MB-[A-F0-9]{12}$'),
    showtime_id uuid not null references public.showtimes(id),
    customer_name text not null
        check (length(trim(customer_name)) between 2 and 80),
    customer_email text not null
        check (length(customer_email) between 3 and 254),
    total_amount numeric(10,2) not null check (total_amount >= 0),
    status text not null default 'confirmed'
        check (status in ('confirmed', 'cancelled')),
    created_at timestamptz not null default now()
);

create index if not exists idx_bookings_showtime_status
    on public.bookings(showtime_id, status);

-- 4. Seats belonging to a booking.
-- Seat names are A1-A10, B1-B10, C1-C10, D1-D10, E1-E10.
create table if not exists public.booking_seats (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null
        references public.bookings(id) on delete cascade,
    showtime_id uuid not null
        references public.showtimes(id),
    seat_number text not null
        check (seat_number ~ '^[A-E](10|[1-9])$'),
    created_at timestamptz not null default now(),
    unique (showtime_id, seat_number)
);

create index if not exists idx_booking_seats_booking
    on public.booking_seats(booking_id);

-- 5. Protect tables with Row Level Security.
-- This demo accesses them through the backend's secret key.
-- No public/anonymous access policies are created.
alter table public.movies enable row level security;
alter table public.showtimes enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_seats enable row level security;

-- 6. Booking lookup view.
-- Only the trusted backend should query this view.
create or replace view public.booking_lookup
with (security_invoker = true)
as
select
    b.booking_reference,
    b.customer_email,
    m.title as movie_title,
    s.starts_at,
    coalesce(
        array_agg(bs.seat_number order by bs.seat_number)
            filter (where bs.seat_number is not null),
        array[]::text[]
    ) as seat_numbers,
    b.total_amount,
    b.status
from public.bookings b
join public.showtimes s on s.id = b.showtime_id
join public.movies m on m.id = s.movie_id
left join public.booking_seats bs
    on bs.booking_id = b.id
where b.status = 'confirmed'
group by
    b.id, b.booking_reference, b.customer_email,
    m.title, s.starts_at, b.total_amount, b.status;

-- 7. Atomic booking function.
-- Inserts one booking and all selected seats in a single transaction.
create or replace function public.create_movie_booking(
    p_showtime_id uuid,
    p_seat_numbers text[],
    p_customer_name text,
    p_customer_email text,
    p_booking_reference text
)
returns table (
    booking_reference text,
    total_amount numeric,
    status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_price numeric(10,2);
    v_booking_id uuid;
    v_total numeric(10,2);
    v_count integer;
begin
    if p_customer_name is null
       or length(trim(p_customer_name)) < 2
       or length(trim(p_customer_name)) > 80 then
        raise exception 'Invalid customer name' using errcode = '22023';
    end if;

    if p_customer_email is null
       or length(p_customer_email) > 254
       or p_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        raise exception 'Invalid email address' using errcode = '22023';
    end if;

    if p_booking_reference is null
       or p_booking_reference !~ '^MB-[A-F0-9]{12}$' then
        raise exception 'Invalid booking reference' using errcode = '22023';
    end if;

    if p_seat_numbers is null
       or cardinality(p_seat_numbers) < 1
       or cardinality(p_seat_numbers) > 8 then
        raise exception 'Select between 1 and 8 seats' using errcode = '22023';
    end if;

    if exists (
        select 1
        from unnest(p_seat_numbers) as item(seat)
        where item.seat is null
           or item.seat !~ '^[A-E](10|[1-9])$'
    ) then
        raise exception 'Invalid seat number' using errcode = '22023';
    end if;

    select count(distinct seat)
    into v_count
    from unnest(p_seat_numbers) as item(seat);

    if v_count <> cardinality(p_seat_numbers) then
        raise exception 'Duplicate seats were selected' using errcode = '22023';
    end if;

    -- Lock the showtime row while checking and creating the booking.
    select s.ticket_price
    into v_price
    from public.showtimes s
    where s.id = p_showtime_id
      and s.is_active = true
      and s.starts_at > now()
    for update;

    if not found then
        raise exception 'Showtime is unavailable' using errcode = '22023';
    end if;

    -- The unique seat constraint also protects against competing requests.
    if exists (
        select 1
        from public.booking_seats bs
        join public.bookings b on b.id = bs.booking_id
        where bs.showtime_id = p_showtime_id
          and bs.seat_number = any(p_seat_numbers)
          and b.status = 'confirmed'
    ) then
        raise exception 'One or more seats are already booked'
            using errcode = '23505';
    end if;

    v_total := v_price * cardinality(p_seat_numbers);

    insert into public.bookings (
        booking_reference,
        showtime_id,
        customer_name,
        customer_email,
        total_amount,
        status
    )
    values (
        p_booking_reference,
        p_showtime_id,
        trim(p_customer_name),
        lower(trim(p_customer_email)),
        v_total,
        'confirmed'
    )
    returning id into v_booking_id;

    insert into public.booking_seats (
        booking_id,
        showtime_id,
        seat_number
    )
    select
        v_booking_id,
        p_showtime_id,
        item.seat
    from unnest(p_seat_numbers) as item(seat);

    return query
    select
        b.booking_reference,
        b.total_amount,
        b.status
    from public.bookings b
    where b.id = v_booking_id;
end;
$$;

-- Restrict the booking function to the server-side Supabase role.
revoke all on function public.create_movie_booking(
    uuid, text[], text, text, text
) from public, anon, authenticated;

grant execute on function public.create_movie_booking(
    uuid, text[], text, text, text
) to service_role;

-- 8. Sample movie data (Top Telugu Hits).
insert into public.movies
    (title, description, genre, duration_minutes, base_price)
values
    ('Pushpa 2: The Rule', 'Pushpa Raj expands his empire while clashing with SP Bhanwar Singh in an explosive face-off.', 'Action', 175, 295.00),
    ('Kalki 2898 AD', 'In a dystopian world, the bounty hunter Bhairava and protector Ashwatthama battle over destiny.', 'Sci-Fi', 181, 250.00),
    ('Devara: Part 1', 'A courageous coastal warrior defends his people and traditions against treacherous forces.', 'Action', 178, 250.00),
    ('RRR', 'Two legendary revolutionaries join forces against British colonial rule in an epic saga.', 'Drama', 187, 220.00),
    ('Tillu Square', 'DJ Tillu gets tangled in a hilarious web of international espionage and quirky romance.', 'Comedy', 125, 180.00),
    ('Sita Ramam', 'An orphaned soldier and an anonymous letter-writer discover a deeply touching love story.', 'Romance', 163, 190.00),
    ('Hi Nanna', 'A devoted father and his daughter form an emotional bond with a compassionate stranger.', 'Drama', 155, 190.00),
    ('Salaar: Part 1 - Ceasefire', 'A hardened fighter enters the lawless city of Khansaar to fulfill an unbreakable vow of loyalty.', 'Action', 175, 240.00)
on conflict do nothing;

-- 9. Sample future showtimes.
insert into public.showtimes (movie_id, starts_at, ticket_price)
select m.id, t.starts_at, m.base_price
from public.movies m
cross join (
    values
        ('2027-02-01 10:00:00+05:30'::timestamptz),
        ('2027-02-01 14:00:00+05:30'::timestamptz),
        ('2027-02-01 18:00:00+05:30'::timestamptz),
        ('2027-02-02 11:00:00+05:30'::timestamptz),
        ('2027-02-02 16:00:00+05:30'::timestamptz),
        ('2027-02-02 20:00:00+05:30'::timestamptz)
) as t(starts_at)
where t.starts_at > now()
on conflict (movie_id, starts_at) do nothing;