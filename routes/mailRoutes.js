const express = require("express");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const router = express.Router();

// In-memory OTP storage (use Redis in production)
const otpStore = new Map(); // email -> { otp, expiresAt, attempts }

// Re-usable verify middleware for this router
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

// Configure transporter via env or fallback to Gmail (requires App Password)
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true;
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
});

async function sendEmail(to, subject, html) {
  const fromAddress = process.env.MAIL_FROM || smtpUser || "no-reply@example.com";
  return transporter.sendMail({ from: fromAddress, to, subject, html });
}

// Generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Clean expired OTPs
function cleanExpiredOTPs() {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}

router.post("/signup", verifyToken, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: "User email not found on token" });
    await sendEmail(
        email,
        "Welcome to GramSeva",
        emailTemplate({
          title: "Welcome to GramSeva 🎉",
          message: "Hi,<br>Your account was created successfully.<br>Thanks for joining <b>GramSeva</b>! We’re excited to have you.",
          footer: "If you have any questions, just reply to this email."
        })
      );
      
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to send signup email", error: err.message });
  }
});

router.post("/login", verifyToken, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: "User email not found on token" });
    await sendEmail(
        email,
        "Login Notification",
        emailTemplate({
          title: "New Login Detected",
          message: "Hi,<br>You logged in successfully to <b>GramSeva</b>.<br>If this wasn’t you, please secure your account immediately.",
          footer: "Stay safe with GramSeva 🌿"
        })
      );
      
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to send login email", error: err.message });
  }
});

// Generate and send OTP for login
router.post("/otp/generate", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Clean expired OTPs
    cleanExpiredOTPs();

    // Check if user exists in Firebase (optional validation)
    // For now, we'll trust the email and generate OTP

    const otp = generateOTP();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store OTP
    otpStore.set(email, {
      otp,
      expiresAt,
      attempts: 0
    });

    // Send OTP via email
    await sendEmail(
        email,
        "Your GramSeva Login OTP",
        emailTemplate({
          title: "Login OTP Verification",
          message: "Hi,<br>Your one-time password (OTP) for login is below:",
          footer: "This OTP will expire in 5 minutes. If you didn't request it, please ignore this email.",
          otp
        })
      );
      

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP", error: err.message });
  }
});

// Verify OTP
router.post("/otp/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    // Clean expired OTPs
    cleanExpiredOTPs();

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    // Check attempts
    if (storedData.attempts >= 3) {
      otpStore.delete(email);
      return res.status(400).json({ message: "Too many attempts. Please request a new OTP." });
    }

    // Check if expired
    if (storedData.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts++;
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid, remove it
    otpStore.delete(email);

    // Check if user exists in Firebase Auth
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      // User exists, create custom token with UID
      const customToken = await admin.auth().createCustomToken(userRecord.uid);
      res.json({ 
        message: "OTP verified successfully", 
        customToken,
        email,
        uid: userRecord.uid
      });
    } catch (userErr) {
      // User doesn't exist in Firebase, signal frontend to create account
      res.json({ 
        message: "OTP verified successfully", 
        email,
        needsSignup: true 
      });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to verify OTP", error: err.message });
  }
});

function emailTemplate({ title, message, footer, otp }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial, sans-serif;color:#333;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding:30px 15px;">
            <table style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;">
              <tr>
                <td style="background:#4CAF50;color:#fff;text-align:center;padding:20px;font-size:24px;font-weight:bold;">
                  🌿 GramSeva
                </td>
              </tr>
              <tr>
                <td style="padding:30px 20px;text-align:left;">
                  <h2 style="margin-top:0;color:#333;">${title}</h2>
                  <p style="font-size:16px;line-height:1.6;">${message}</p>
                  ${otp ? `<div style="margin:25px 0;text-align:center;">
                    <span style="display:inline-block;background:#4CAF50;color:#fff;padding:12px 20px;font-size:20px;font-weight:bold;border-radius:8px;letter-spacing:3px;">
                      ${otp}
                    </span>
                  </div>` : ""}
                  <p style="margin-top:30px;font-size:14px;color:#555;">${footer}</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f9f9f9;text-align:center;padding:15px;font-size:12px;color:#777;">
                  © ${new Date().getFullYear()} GramSeva. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }
  

module.exports = router;



