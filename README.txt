# TechKart Gadget Store

Responsive gadget storefront with an Express/MongoDB authentication API.

## Requirements
- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Run locally
1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB connection string and set a long random `JWT_SECRET`.
3. If you want password reset links emailed, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. In development without SMTP, the forgot-password form provides a local reset link.
4. Run `npm install`, then `npm start`.
5. Open [http://localhost:3000](http://localhost:3000).

## Features
- Gadget storefront, category filters, search, and a browser-saved cart
- MongoDB user accounts with sign up and sign in
- Passwords hashed with bcrypt; authentication uses an HTTP-only cookie
- One-hour, single-use password reset links; SMTP delivery can be configured
- Rate limiting and security headers

The catalog and checkout are still sample experiences; payments and order processing are not connected. Do not use a production database until you have configured a strong secret, SMTP, HTTPS, and production-grade rate-limit storage.
