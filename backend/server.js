const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const supabase = require("./supabase");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, "../frontend")));

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

// GET /api/movies - list all active movies
app.get("/api/movies", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("movies")
            .select("id, title, description, genre, duration_minutes, base_price")
            .eq("is_active", true)
            .order("title");

        if (error) {
            console.error("Error fetching movies:", error);
            return res.status(500).json({ error: "Could not load movies." });
        }

        res.json(data || []);
    } catch (err) {
        console.error("Unexpected error in /api/movies:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/movies/:movieId/showtimes - list upcoming showtimes for a movie
app.get("/api/movies/:movieId/showtimes", async (req, res) => {
    const { movieId } = req.params;

    try {
        const { data, error } = await supabase
            .from("showtimes")
            .select("id, starts_at, ticket_price")
            .eq("movie_id", movieId)
            .eq("is_active", true)
            .gt("starts_at", new Date().toISOString())
            .order("starts_at");

        if (error) {
            console.error("Error fetching showtimes:", error);
            return res.status(500).json({ error: "Could not load showtimes." });
        }

        res.json(data || []);
    } catch (err) {
        console.error("Unexpected error in /api/movies/:movieId/showtimes:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/showtimes/:showtimeId/seats - get booked seats for a showtime
app.get("/api/showtimes/:showtimeId/seats", async (req, res) => {
    const { showtimeId } = req.params;

    try {
        const { data, error } = await supabase
            .from("booking_seats")
            .select("seat_number, bookings!inner(status)")
            .eq("showtime_id", showtimeId)
            .eq("bookings.status", "confirmed");

        if (error) {
            console.error("Error fetching booked seats:", error);
            return res.status(500).json({ error: "Could not load seat availability." });
        }

        const bookedSeats = (data || []).map(row => row.seat_number);
        res.json({ bookedSeats });
    } catch (err) {
        console.error("Unexpected error in /api/showtimes/:showtimeId/seats:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST /api/bookings - create a new booking
app.post("/api/bookings", async (req, res) => {
    const { showtimeId, seatNumbers, customerName, customerEmail } = req.body;

    // Basic server-side validation
    if (!showtimeId) {
        return res.status(400).json({ error: "Showtime is required." });
    }

    if (!Array.isArray(seatNumbers) || seatNumbers.length < 1 || seatNumbers.length > 8) {
        return res.status(400).json({ error: "Select between 1 and 8 seats." });
    }

    if (!customerName || customerName.trim().length < 2 || customerName.trim().length > 80) {
        return res.status(400).json({ error: "Please provide a valid name (2-80 characters)." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || customerEmail.length > 254 || !emailRegex.test(customerEmail)) {
        return res.status(400).json({ error: "Please provide a valid email address." });
    }

    // Generate reference formatted as MB- followed by 12 uppercase hex characters
    const bookingReference = `MB-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    try {
        const { data, error } = await supabase.rpc("create_movie_booking", {
            p_showtime_id: showtimeId,
            p_seat_numbers: seatNumbers,
            p_customer_name: customerName.trim(),
            p_customer_email: customerEmail.trim().toLowerCase(),
            p_booking_reference: bookingReference
        });

        if (error) {
            console.error("Error creating booking:", error);
            return res.status(400).json({ error: error.message || "Failed to complete booking." });
        }

        if (!data || data.length === 0) {
            return res.status(400).json({ error: "Booking could not be confirmed." });
        }

        const booking = data[0];
        res.status(201).json({
            bookingReference: booking.booking_reference,
            totalAmount: Number(booking.total_amount),
            status: booking.status
        });
    } catch (err) {
        console.error("Unexpected error in /api/bookings:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

// GET /api/bookings/:reference - lookup a booking by reference and email
app.get("/api/bookings/:reference", async (req, res) => {
    const { reference } = req.params;
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Customer email is required for lookup." });
    }

    try {
        const { data, error } = await supabase
            .from("booking_lookup")
            .select("*")
            .eq("booking_reference", reference.trim().toUpperCase())
            .ilike("customer_email", email.trim())
            .maybeSingle();

        if (error) {
            console.error("Error looking up booking:", error);
            return res.status(500).json({ error: "Could not retrieve booking details." });
        }

        if (!data) {
            return res.status(404).json({ error: "No booking found matching that reference and email." });
        }

        res.json({
            bookingReference: data.booking_reference,
            customerEmail: data.customer_email,
            movieTitle: data.movie_title,
            startsAt: data.starts_at,
            seatNumbers: data.seat_numbers || [],
            totalAmount: Number(data.total_amount),
            status: data.status
        });
    } catch (err) {
        console.error("Unexpected error in /api/bookings/:reference:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Fallback to frontend index.html for any non-API route
app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
        return next();
    }
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
    console.log(`MovieBox is running at http://localhost:${PORT}`);
});
