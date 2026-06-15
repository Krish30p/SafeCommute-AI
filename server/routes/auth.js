const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../db');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'safecommute_jwt_secret_fallback_key';

// POST /api/auth/signup - Register new user
router.post('/signup', async (req, res) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password || !name || !phone) {
    return res.status(400).json({ error: 'All fields (email, password, name, phone) are required.' });
  }

  try {
    // Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in DB
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      phone: phone.trim()
    });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        uid: user._id, // For Firebase display compatibility
        email: user.email,
        name: user.name,
        displayName: user.name, // For Firebase display compatibility
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Failed to register user. ' + err.message });
  }
});

// POST /api/auth/login - Log in existing user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        uid: user._id, // For Firebase display compatibility
        email: user.email,
        name: user.name,
        displayName: user.name, // For Firebase display compatibility
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me - Get current user profile from token
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      uid: req.user._id, // For Firebase display compatibility
      email: req.user.email,
      name: req.user.name,
      displayName: req.user.name, // For Firebase display compatibility
      phone: req.user.phone
    }
  });
});

module.exports = router;
