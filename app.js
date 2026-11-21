require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, "public");
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production.");
}
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many account requests. Please try again later." },
});
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
});

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createAuthToken(user) {
  return jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: "7d" });
}

function setAuthCookie(res, user) {
  res.cookie("techkart_auth", createAuthToken(user), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  res.clearCookie("techkart_auth", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
}

function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value) {
  return typeof value === "string" && value.length >= 10 && Buffer.byteLength(value, "utf8") <= 72;
}

function resetMailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

app.post(
  "/api/auth/register",
  authLimiter,
  asyncRoute(async (req, res) => {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!name || name.length > 80 || !validEmail(email) || !validPassword(password)) {
      return res.status(400).json({ error: "Enter a name, valid email, and password (10–72 UTF-8 bytes)." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const user = await User.create({ name, email, passwordHash });
      setAuthCookie(res, user);
      return res.status(201).json({ user: { name: user.name, email: user.email } });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "An account with that email already exists." });
      throw error;
    }
  })
);

app.post(
  "/api/auth/login",
  authLimiter,
  asyncRoute(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = validEmail(email) && Buffer.byteLength(password, "utf8") <= 72
      ? await User.findOne({ email }).select("+passwordHash")
      : null;
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!passwordMatches) return res.status(401).json({ error: "Email or password is incorrect." });
    setAuthCookie(res, user);
    return res.json({ user: { name: user.name, email: user.email } });
  })
);

app.get(
  "/api/auth/me",
  asyncRoute(async (req, res) => {
    const token = req.cookies && req.cookies.techkart_auth;
    if (!token) return res.status(401).json({ error: "Sign in to continue." });
    try {
      const claims = jwt.verify(token, jwtSecret);
      const user = await User.findById(claims.sub).select("name email");
      if (!user) return res.status(401).json({ error: "Sign in to continue." });
      return res.json({ user: { name: user.name, email: user.email } });
    } catch {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Sign in to continue." });
    }
  })
);

app.post("/api/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.sendStatus(204);
});

app.post(
  "/api/auth/forgot-password",
  resetLimiter,
  asyncRoute(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });

    const user = await User.findOne({ email });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
      user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetUrl = new URL("/", process.env.APP_URL || `http://localhost:${port}`);
      resetUrl.searchParams.set("resetToken", resetToken);
      const mailer = resetMailer();
      if (mailer && process.env.SMTP_FROM) {
        await mailer.sendMail({
          from: process.env.SMTP_FROM,
          to: user.email,
          subject: "Reset your TechKart password",
          text: `Use this link within one hour to reset your password: ${resetUrl.toString()}`,
        });
      } else if (isProduction) {
        throw new Error("Password reset email is not configured. Set SMTP_HOST and SMTP_FROM.");
      } else {
        return res.json({
          message: "If an account exists for that email, reset instructions are ready.",
          resetUrl: resetUrl.toString(),
        });
      }
    }
    return res.json({ message: "If an account exists for that email, reset instructions have been sent." });
  })
);

app.post(
  "/api/auth/reset-password",
  authLimiter,
  asyncRoute(async (req, res) => {
    const token = typeof req.body.token === "string" ? req.body.token : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) {
      return res.status(400).json({ error: "The reset link or password is invalid." });
    }
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetTokenHash,
      resetTokenExpiresAt: { $gt: new Date() },
    }).select("+resetTokenHash +resetTokenExpiresAt");
    if (!user) return res.status(400).json({ error: "This reset link is invalid or has expired." });

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();
    return res.json({ message: "Password updated. You can now sign in." });
  })
);

app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use(express.static(publicDirectory, { dotfiles: "deny", index: "index.html" }));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  return res.status(500).json({ error: "The request could not be completed. Please try again." });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/techkart");
  app.listen(port, "0.0.0.0", () => {
    console.log(`TechKart is running at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Could not start TechKart. Check MongoDB and MONGODB_URI.", error);
  process.exitCode = 1;
});
