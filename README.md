
# Movie Ticket Booking

A beginner-friendly full-stack movie ticket booking application built using HTML, CSS, Vanilla JavaScript, Node.js, Express.js, and Supabase PostgreSQL.

## 1. Project Overview

MovieBox allows users to browse movies, select a showtime, view seat availability, select seats, calculate the ticket price, and create a booking.

The project demonstrates how a frontend, REST API, and PostgreSQL database work together.

## 2. Problem Statement

Manually managing movie reservations can lead to duplicate seat bookings and incorrect booking records. This project demonstrates an online process for displaying showtimes, selecting seats, calculating prices, and recording reservations.

## 3. Objectives

- Build a responsive movie booking interface.
- Learn how to create a REST API.
- Store application data in PostgreSQL.
- Validate user input on the server.
- Prevent duplicate seat reservations.
- Learn Git and GitHub basics.

## 4. Users and Features

The current version does not require accounts.

Features:
- Browse and search movies.
- Filter movies by genre.
- View upcoming showtimes.
- View booked and available seats.
- Select up to eight seats per booking.
- Calculate ticket totals.
- Save bookings in Supabase.
- Retrieve a booking using its reference and email.

## 5. Technology Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express.js
- Supabase PostgreSQL
- Git and GitHub

## 6. Folder Structure

movie-ticket-booking/
- frontend/index.html
- frontend/styles.css
- frontend/app.js
- backend/server.js
- backend/supabase.js
- backend/package.json
- backend/.env
- backend/.env.example
- backend/.gitignore
- database/schema.sql
- .gitignore
- README.md

## 7. Prerequisites

Install:
- Visual Studio Code: https://code.visualstudio.com/
- Node.js LTS: https://nodejs.org/
- Git: https://git-scm.com/
- Supabase account: https://supabase.com/

Node.js includes npm.

## 8. Installation

Open the project root in Visual Studio Code.

Open Terminal > New Terminal.

Move to the backend directory:

    cd backend

Install dependencies:

    npm install

## 9. Database Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Copy and execute database/schema.sql.
4. Open Table Editor.
5. Verify movies, showtimes, bookings, and booking_seats.

Sample movies are inserted by the SQL script. The sample showtimes are dated February 2027 and should be replaced if they are no longer in the future.

## 10. Environment Configuration

Create backend/.env using backend/.env.example as a template.

Configure:

    PORT=3000
    NODE_ENV=development
    SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
    SUPABASE_SECRET_KEY=YOUR_SERVER_SIDE_SECRET_KEY

Use your actual Supabase URL and server-side secret key.

Never commit .env or expose the secret key in frontend code.

## 11. Start the Application

From the backend directory:

    npm start

Expected terminal message:

    MovieBox is running at http://localhost:3000

Open this URL in your browser:

    http://localhost:3000

Do not open index.html directly from File Explorer. The application uses the Express server for API requests.

## 12. Architecture

Browser:
HTML + CSS + JavaScript
        |
        | fetch()
        v
Express REST API
        |
        | Supabase JavaScript client
        v
Supabase PostgreSQL

The frontend does not connect directly to PostgreSQL. Database credentials remain on the server.

## 13. API Reference

- GET /api/health
- GET /api/movies
- GET /api/movies/:movieId/showtimes
- GET /api/showtimes/:showtimeId/seats
- POST /api/bookings
- GET /api/bookings/:reference?email=...

The booking creation endpoint validates the request and calls a PostgreSQL function to calculate the total and save the booking.

## 14. Manual Testing

1. Open the application.
2. Verify that movie cards appear.
3. Search for a movie.
4. Select a movie and a showtime.
5. Select available seats.
6. Enter a name and email.
7. Confirm the booking.
8. Copy the booking reference.
9. Search using that reference and the same email.
10. Verify the booking and seats in Supabase Table Editor.

Also test invalid input, unavailable seats, invalid references, and mobile layouts.

## 15. Troubleshooting

### Cannot connect to Supabase

- Check SUPABASE_URL.
- Check the server-side secret key.
- Check your internet connection.
- Review the backend terminal for errors.

### Movies are not loading

- Confirm the schema ran successfully.
- Check whether sample movies exist.
- Visit http://localhost:3000/api/health.
- Visit http://localhost:3000/api/movies.

### No showtimes appear

- Confirm the movie has showtimes in the database.
- Ensure starts_at is in the future.
- Replace expired sample dates with future dates.

### Port 3000 is already in use

Change PORT in backend/.env to 3001 and restart the server.

### Module not found

Run npm install from the backend directory.

## 16. GitHub Upload

From the project root:

    git init
    git status
    git add .
    git status
    git commit -m "Build project"
    git branch -M main
    git remote add origin YOUR_GITHUB_REPOSITORY_URL
    git push -u origin main

Replace YOUR_GITHUB_REPOSITORY_URL with your own repository URL.

Verify that .env and node_modules are excluded before pushing.

If a secret has already been committed, removing it from the latest commit or adding it to .gitignore is not enough. Rotate the exposed credential and remove it from repository history as appropriate.

## 17. Security Notes

- Keep the Supabase server-side secret private.
- Validate input on the backend.
- Use database constraints to prevent duplicate seat assignments.
- Use HTTPS and stronger authentication before public deployment.
- Booking-reference and email lookup is for demonstration only.
- This project does not process payments.
- Do not use this version as a production ticketing service.

## 18. Limitations and Future Improvements

- User registration and login.
- Customer-owned booking history.
- Admin movie and showtime management.
- Booking cancellation and refund rules.
- Payment gateway integration.
- Automated backend tests.
- Production-grade booking expiration and seat locking.

## 19. License

This project is intended for learning and college demonstration.
