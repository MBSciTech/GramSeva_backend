const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// ✅ Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { username, email, phoneNo, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }, { phoneNo }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with provided email/username/phone" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      email,
      phoneNo,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body; 
    // identifier can be email, phoneNo, or username

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phoneNo: identifier }]
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({ message: "Login successful", user: { username: user.username, email: user.email, phoneNo: user.phoneNo } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
