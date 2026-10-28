const API = "/api";

const movieList = document.getElementById("movie-list");
const movieStatus = document.getElementById("movie-status");
const searchInput = document.getElementById("search-input");
const genreFilter = document.getElementById("genre-filter");
const showtimeSelect = document.getElementById("showtime-select");
const seatArea = document.getElementById("seat-area");
const seatMap = document.getElementById("seat-map");
const seatStatus = document.getElementById("seat-status");
const bookButton = document.getElementById("book-button");

// Modals
const paymentModal = document.getElementById("payment-modal");
const closePaymentModalBtn = document.getElementById("close-payment-modal");
const payConfirmBtn = document.getElementById("pay-confirm-button");
const paymentProcessing = document.getElementById("payment-processing");
const paymentProcessingText = document.getElementById("payment-processing-text");
const ticketModal = document.getElementById("ticket-modal");
const closeTicketModalBtn = document.getElementById("close-ticket-modal");
const printTicketBtn = document.getElementById("print-ticket-button");
const newBookingBtn = document.getElementById("new-booking-button");

let movies = [];
let showtimes = [];
let bookedSeats = [];
let selectedMovie = null;
let selectedShowtime = null;
let selectedSeats = new Set();
let submitting = false;
let currentCustomerName = "";
let currentCustomerEmail = "";
let selectedPaymentMethod = "upi";

const fallbackMovies = [
    {
        id: "m1",
        title: "Pushpa 2: The Rule",
        genre: "Action",
        duration_minutes: 175,
        base_price: 295,
        description: "Pushpa Raj expands his red sandalwood empire while clashing with SP Bhanwar Singh in an explosive face-off."
    },
    {
        id: "m2",
        title: "Kalki 2898 AD",
        genre: "Sci-Fi",
        duration_minutes: 181,
        base_price: 250,
        description: "In a dystopian world, the bounty hunter Bhairava and protector Ashwatthama battle over destiny."
    },
    {
        id: "m3",
        title: "Devara: Part 1",
        genre: "Action",
        duration_minutes: 178,
        base_price: 250,
        description: "A courageous coastal warrior defends his people and traditions against treacherous forces."
    },
    {
        id: "m4",
        title: "RRR",
        genre: "Drama",
        duration_minutes: 187,
        base_price: 220,
        description: "Two legendary Indian revolutionaries join forces against British colonial rule in an epic saga."
    },
    {
        id: "m5",
        title: "Tillu Square",
        genre: "Comedy",
        duration_minutes: 125,
        base_price: 180,
        description: "DJ Tillu gets tangled in a hilarious web of international espionage and quirky romance."
    },
    {
        id: "m6",
        title: "Sita Ramam",
        genre: "Romance",
        duration_minutes: 163,
        base_price: 190,
        description: "An orphaned soldier and an anonymous letter-writer discover a deeply touching love story."
    },
    {
        id: "m7",
        title: "Hi Nanna",
        genre: "Drama",
        duration_minutes: 155,
        base_price: 190,
        description: "A devoted father and his daughter form an emotional bond with a compassionate stranger."
    },
    {
        id: "m8",
        title: "Salaar: Part 1 - Ceasefire",
        genre: "Action",
        duration_minutes: 175,
        base_price: 240,
        description: "A hardened fighter enters the lawless city of Khansaar to fulfill an unbreakable vow of loyalty."
    }
];

function generateFallbackShowtimes(movieId) {
    const movie = fallbackMovies.find(m => m.id === movieId);
    const times = [];
    const now = new Date();
    const hours = [11, 14, 18, 21];
    const mins = [0, 30, 30, 45];

    for (let day = 0; day < 5; day++) {
        for (let s = 0; s < 4; s++) {
            const d = new Date(now);
            d.setDate(now.getDate() + day);
            d.setHours(hours[s], mins[s], 0, 0);

            if (d > now) {
                times.push({
                    id: `st_${movieId}_${day}_${s}`,
                    starts_at: d.toISOString(),
                    ticket_price: movie ? movie.base_price : 220
                });
            }
        }
    }
    return times;
}

const money = value =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value));

async function apiRequest(path, options = {}) {
    try {
        const response = await fetch(`${API}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        // Fallback for static hosting (GitHub Pages)
        if (path === "/movies") {
            return fallbackMovies;
        }

        if (path.startsWith("/movies/") && path.endsWith("/showtimes")) {
            const match = path.match(/\/movies\/([^/]+)\/showtimes/);
            return generateFallbackShowtimes(match ? match[1] : "");
        }

        if (path.startsWith("/showtimes/") && path.endsWith("/seats")) {
            return { bookedSeats: ["A3", "A4", "C7"] };
        }

        if (path === "/bookings" && options.method === "POST") {
            const body = JSON.parse(options.body || "{}");
            const hex = Math.random().toString(16).substring(2, 14).toUpperCase().padEnd(12, "F");
            const ref = `MB-${hex}`;
            const total = (body.seatNumbers || []).length * (selectedShowtime ? selectedShowtime.ticket_price : 200);

            const record = {
                bookingReference: ref,
                movieTitle: selectedMovie ? selectedMovie.title : "Telugu Cinema",
                startsAt: selectedShowtime ? selectedShowtime.starts_at : new Date().toISOString(),
                seatNumbers: body.seatNumbers || [],
                totalAmount: total,
                status: "confirmed",
                customerEmail: body.customerEmail
            };

            const saved = JSON.parse(localStorage.getItem("moviebox_bookings") || "[]");
            saved.push(record);
            localStorage.setItem("moviebox_bookings", JSON.stringify(saved));

            return {
                bookingReference: ref,
                totalAmount: total,
                status: "confirmed"
            };
        }

        if (path.startsWith("/bookings/")) {
            const match = path.match(/\/bookings\/([^?]+)/);
            const ref = match ? decodeURIComponent(match[1]) : "";
            const saved = JSON.parse(localStorage.getItem("moviebox_bookings") || "[]");
            const found = saved.find(b => b.bookingReference === ref);
            if (found) return found;
            throw new Error("No ticket found with this reference.");
        }

        throw new Error(err.message || "Failed to load.");
    }
}

function showMessage(element, message, type = "") {
    element.textContent = message;
    element.className = `message ${type}`.trim();
}

async function loadMovies() {
    showMessage(movieStatus, "Loading Telugu movies...");

    try {
        movies = await apiRequest("/movies");
        populateGenres();
        renderMovies();
        showMessage(movieStatus,
            movies.length ? "" : "No Telugu movies found.");
    } catch (error) {
        showMessage(movieStatus, error.message, "error");
    }
}

function populateGenres() {
    const genres = [...new Set(movies.map(movie => movie.genre))].sort();

    genreFilter.replaceChildren(new Option("All Genres", ""));

    genres.forEach(genre => {
        genreFilter.add(new Option(genre, genre));
    });
}

const pastelGradients = [
    { a: "#fca5a5", b: "#f43f5e" }, // Pushpa 2
    { a: "#93c5fd", b: "#6366f1" }, // Kalki 2898 AD
    { a: "#6ee7b7", b: "#0d9488" }, // Devara
    { a: "#fed7aa", b: "#ea580c" }, // RRR
    { a: "#fde047", b: "#f59e0b" }, // Tillu Square
    { a: "#fbcfe8", b: "#db2777" }, // Sita Ramam
    { a: "#c4b5fd", b: "#7c3aed" }, // Hi Nanna
    { a: "#cbd5e1", b: "#475569" }  // Salaar
];

function renderMovies() {
    const query = searchInput.value.trim().toLowerCase();
    const genre = genreFilter.value;

    const filtered = movies.filter(movie =>
        movie.title.toLowerCase().includes(query) &&
        (!genre || movie.genre === genre)
    );

    movieList.replaceChildren();

    filtered.forEach((movie, index) => {
        const card = document.createElement("article");
        card.className = "movie-card";

        const grad = pastelGradients[index % pastelGradients.length];

        const poster = document.createElement("div");
        poster.className = "poster";
        poster.style.setProperty("--poster-a", grad.a);
        poster.style.setProperty("--poster-b", grad.b);

        const symbol = document.createElement("span");
        symbol.className = "poster-symbol";
        symbol.textContent = "TOLLYWOOD • TELUGU";

        const posterTitle = document.createElement("span");
        posterTitle.className = "poster-title";
        posterTitle.textContent = movie.title;

        poster.append(symbol, posterTitle);

        const info = document.createElement("div");
        info.className = "movie-info";

        const title = document.createElement("h3");
        title.textContent = movie.title;

        const meta = document.createElement("div");
        meta.className = "movie-meta";
        meta.textContent = `${movie.genre} • ${movie.duration_minutes} MINS • UA`;

        const description = document.createElement("p");
        description.className = "movie-description";
        description.textContent = movie.description || "Enjoy this Telugu blockbuster with 4K projection & Dolby Atmos.";

        const bottom = document.createElement("div");
        bottom.className = "movie-bottom";

        const price = document.createElement("span");
        price.className = "price";
        price.textContent = `${money(movie.base_price)} / seat`;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Book Seats →";
        button.addEventListener("click", () => selectMovie(movie.id));

        bottom.append(price, button);
        info.append(title, meta, description, bottom);
        card.append(poster, info);
        movieList.append(card);
    });

    if (!filtered.length) {
        showMessage(movieStatus, "No movies match your search.");
    } else {
        showMessage(movieStatus, "");
    }
}

async function selectMovie(movieId) {
    selectedMovie = movies.find(movie => movie.id === movieId);
    selectedShowtime = null;
    selectedSeats.clear();
    bookedSeats = [];

    seatArea.classList.add("hidden");
    seatMap.replaceChildren();
    updateSummary();
    bookButton.disabled = true;

    document.getElementById("selected-movie-description").textContent =
        `Selected: ${selectedMovie.title} (Telugu 2D • Screen 1)`;

    showtimeSelect.disabled = true;
    showtimeSelect.replaceChildren(new Option("Loading showtimes for Screen 1...", ""));

    document.getElementById("booking").scrollIntoView({ behavior: "smooth" });

    try {
        showtimes = await apiRequest(`/movies/${movieId}/showtimes`);

        showtimeSelect.replaceChildren(
            new Option(
                showtimes.length ? "Choose a theatre showtime" : "No showtimes available currently",
                ""
            )
        );

        showtimes.forEach(showtime => {
            const date = new Date(showtime.starts_at);
            const label = `${date.toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            })} • ${money(showtime.ticket_price)}`;

            showtimeSelect.add(new Option(label, showtime.id));
        });

        showtimeSelect.disabled = !showtimes.length;

        if (showtimes.length > 0) {
            showtimeSelect.value = showtimes[0].id;
            await selectShowtime(showtimes[0].id);
        } else {
            showMessage(seatStatus, "No showtimes are available for this movie right now.");
        }
    } catch (error) {
        showtimeSelect.replaceChildren(new Option("Could not load showtimes", ""));
        showMessage(seatStatus, error.message, "error");
    }
}

async function selectShowtime(showtimeId) {
    selectedShowtime = showtimes.find(show => show.id === showtimeId) || null;
    selectedSeats.clear();
    bookedSeats = [];
    updateSummary();
    bookButton.disabled = true;

    if (!selectedShowtime) {
        seatArea.classList.add("hidden");
        showMessage(seatStatus, "Choose a showtime to view seats.");
        return;
    }

    showMessage(seatStatus, "Checking live seat availability...");
    seatArea.classList.remove("hidden");
    seatMap.replaceChildren();

    try {
        const result = await apiRequest(`/showtimes/${showtimeId}/seats`);
        bookedSeats = result.bookedSeats || [];
        renderSeats();
        showMessage(seatStatus, "Select up to 8 seats from the available green slots.");
    } catch (error) {
        seatArea.classList.add("hidden");
        showMessage(seatStatus, error.message, "error");
    }
}

function renderSeats() {
    seatMap.replaceChildren();

    for (let row = 0; row < 5; row++) {
        const letter = String.fromCharCode(65 + row);

        for (let column = 1; column <= 10; column++) {
            const seatName = `${letter}${column}`;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "seat";
            button.textContent = seatName;
            button.setAttribute("aria-label", `Seat ${seatName}`);

            if (bookedSeats.includes(seatName)) {
                button.classList.add("booked");
                button.disabled = true;
                button.setAttribute("aria-label", `Seat ${seatName}, booked`);
            } else if (selectedSeats.has(seatName)) {
                button.classList.add("selected");
                button.setAttribute("aria-pressed", "true");
            } else {
                button.setAttribute("aria-pressed", "false");
            }

            button.addEventListener("click", () => toggleSeat(seatName));
            seatMap.append(button);
        }
    }

    updateSummary();
}

function toggleSeat(seatName) {
    if (selectedSeats.has(seatName)) {
        selectedSeats.delete(seatName);
    } else {
        if (selectedSeats.size >= 8) {
            showMessage(seatStatus, "You can select a maximum of 8 seats per booking.", "error");
            return;
        }

        selectedSeats.add(seatName);
    }

    renderSeats();
    showMessage(seatStatus, `${selectedSeats.size} seat(s) selected: ${[...selectedSeats].sort().join(", ")}`);
}

function updateSummary() {
    document.getElementById("summary-movie").textContent =
        selectedMovie ? selectedMovie.title : "No movie selected";

    document.getElementById("summary-time").textContent =
        selectedShowtime
            ? new Date(selectedShowtime.starts_at).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            })
            : "—";

    document.getElementById("summary-seats").textContent =
        [...selectedSeats].sort().join(", ") || "None";

    const total = selectedShowtime ? selectedSeats.size * selectedShowtime.ticket_price : 0;
    document.getElementById("summary-total").textContent = money(total);

    bookButton.disabled =
        submitting || !selectedShowtime || selectedSeats.size === 0;

    if (selectedSeats.size > 0) {
        bookButton.textContent = `Proceed to Payment (${money(total)}) →`;
    } else {
        bookButton.textContent = "Select seats to proceed";
    }
}

// INTERCEPT BOOKING FORM TO OPEN PAYMENT MODAL
document.getElementById("booking-form").addEventListener("submit", event => {
    event.preventDefault();

    if (submitting || !selectedMovie || !selectedShowtime || selectedSeats.size === 0) {
        return;
    }

    currentCustomerName = document.getElementById("customer-name").value.trim();
    currentCustomerEmail = document.getElementById("customer-email").value.trim();

    if (currentCustomerName.length < 2 || !currentCustomerEmail) {
        showMessage(seatStatus, "Please enter your name and email correctly.", "error");
        return;
    }

    const total = selectedSeats.size * selectedShowtime.ticket_price;

    document.getElementById("modal-movie-title").textContent = selectedMovie.title;
    document.getElementById("modal-showtime-text").textContent =
        `Screen 1 • ${new Date(selectedShowtime.starts_at).toLocaleString("en-IN", {
            day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true
        })} • Seats: ${[...selectedSeats].sort().join(", ")}`;
    document.getElementById("modal-total-amount").textContent = money(total);
    document.getElementById("pay-button-amount").textContent = money(total);

    paymentProcessing.classList.add("hidden");
    payConfirmBtn.disabled = false;
    payConfirmBtn.classList.remove("hidden");

    paymentModal.classList.remove("hidden");
});

// PAYMENT METHOD TABS
document.querySelectorAll(".payment-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".payment-tab").forEach(t => {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        selectedPaymentMethod = tab.getAttribute("data-method");
        const panel = document.getElementById(`panel-${selectedPaymentMethod}`);
        if (panel) {
            panel.classList.add("active");
        }
    });
});

// CLOSE PAYMENT MODAL
closePaymentModalBtn.addEventListener("click", () => {
    if (!submitting) {
        paymentModal.classList.add("hidden");
    }
});

// CONFIRM PAYMENT & CREATE BOOKING
payConfirmBtn.addEventListener("click", async () => {
    if (submitting || !selectedShowtime || selectedSeats.size === 0) return;

    submitting = true;
    payConfirmBtn.disabled = true;
    paymentProcessing.classList.remove("hidden");

    const methodLabels = {
        upi: "UPI (Google Pay / PhonePe)",
        card: "Credit / Debit Card",
        netbanking: "Net Banking",
        wallet: "Digital Wallet"
    };

    paymentProcessingText.textContent = `Connecting to ${methodLabels[selectedPaymentMethod]} gateway...`;

    try {
        await new Promise(r => setTimeout(r, 700));
        paymentProcessingText.textContent = "Verifying payment authorization...";

        const booking = await apiRequest("/bookings", {
            method: "POST",
            body: JSON.stringify({
                showtimeId: selectedShowtime.id,
                seatNumbers: [...selectedSeats],
                customerName: currentCustomerName,
                customerEmail: currentCustomerEmail
            })
        });

        await new Promise(r => setTimeout(r, 600));
        paymentProcessingText.textContent = "Payment approved! Generating ticket...";
        await new Promise(r => setTimeout(r, 300));

        paymentModal.classList.add("hidden");

        // Populate Ticket Modal
        document.getElementById("ticket-movie-title").textContent = selectedMovie.title;
        document.getElementById("ticket-movie-meta").textContent =
            `Telugu • 2D • Screen 1 (Dolby Atmos)`;
        document.getElementById("ticket-reference").textContent = booking.bookingReference;
        document.getElementById("ticket-showtime").textContent =
            new Date(selectedShowtime.starts_at).toLocaleString("en-IN", {
                weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true
            });
        document.getElementById("ticket-seats").textContent = [...selectedSeats].sort().join(", ");
        document.getElementById("ticket-total").textContent = money(booking.totalAmount);
        document.getElementById("ticket-customer-name").textContent = currentCustomerName;

        // Auto-fill lookup inputs
        document.getElementById("lookup-reference").value = booking.bookingReference;
        document.getElementById("lookup-email").value = currentCustomerEmail;

        ticketModal.classList.remove("hidden");

        selectedSeats.clear();
        await selectShowtime(selectedShowtime.id);

        showMessage(
            seatStatus,
            `Booking confirmed! Ref: ${booking.bookingReference}. Save your ticket!`,
            "success"
        );
    } catch (error) {
        paymentProcessing.classList.add("hidden");
        payConfirmBtn.disabled = false;
        alert("Payment Error: " + error.message);
        showMessage(seatStatus, error.message, "error");

        if (selectedShowtime) {
            await selectShowtime(selectedShowtime.id);
        }
    } finally {
        submitting = false;
        updateSummary();
    }
});

closeTicketModalBtn.addEventListener("click", () => {
    ticketModal.classList.add("hidden");
});

printTicketBtn.addEventListener("click", () => {
    window.print();
});

newBookingBtn.addEventListener("click", () => {
    ticketModal.classList.add("hidden");
    selectedMovie = null;
    selectedShowtime = null;
    selectedSeats.clear();
    seatArea.classList.add("hidden");
    document.getElementById("booking-form").reset();
    updateSummary();
    document.getElementById("movies").scrollIntoView({ behavior: "smooth" });
});

// LOOKUP BOOKING
document.getElementById("lookup-form").addEventListener("submit", async event => {
    event.preventDefault();

    const reference = document.getElementById("lookup-reference").value.trim();
    const email = document.getElementById("lookup-email").value.trim();
    const result = document.getElementById("lookup-result");

    result.replaceChildren();
    showMessage(result, "Searching for your ticket...");

    try {
        const booking = await apiRequest(
            `/bookings/${encodeURIComponent(reference)}?email=${encodeURIComponent(email)}`
        );

        result.replaceChildren();

        const card = document.createElement("div");
        card.className = "lookup-result-card";

        const title = document.createElement("h3");
        title.textContent = "🎟️ Confirmed Ticket Found";

        const details = document.createElement("p");
        details.innerHTML =
            `<strong>Movie:</strong> ${booking.movieTitle} (Telugu)<br>` +
            `<strong>Booking Ref:</strong> <span style="color:#f43f5e; font-weight:bold">${booking.bookingReference}</span><br>` +
            `<strong>Showtime:</strong> ${new Date(booking.startsAt).toLocaleString("en-IN", {
                weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true
            })}<br>` +
            `<strong>Seats:</strong> <span style="color:#8b5cf6; font-weight:bold">${booking.seatNumbers.join(", ")}</span><br>` +
            `<strong>Total Paid:</strong> ${money(booking.totalAmount)}<br>` +
            `<strong>Status:</strong> <span style="color:#10b981; font-weight:bold">${booking.status.toUpperCase()}</span>`;

        card.append(title, details);
        result.append(card);
    } catch (error) {
        showMessage(result, error.message, "error");
    }
});

searchInput.addEventListener("input", renderMovies);
genreFilter.addEventListener("change", renderMovies);
showtimeSelect.addEventListener("change", () => selectShowtime(showtimeSelect.value));

document.getElementById("current-year").textContent = new Date().getFullYear();

loadMovies();
