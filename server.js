const express = require("express");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// 🔑 Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json"); 
// Download this from Firebase Console → Project Settings → Service Accounts

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware to verify Firebase token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
}

// ✅ Protected route
app.get("/api/profile", verifyToken, (req, res) => {
  res.json({ message: "Welcome!", uid: req.user.uid, email: req.user.email });
});

// 📧 Email routes (signup/login notifications)
const mailRoutes = require("./routes/mailRoutes");
app.use("/api/email", mailRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
