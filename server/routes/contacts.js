const express = require('express');
const router = express.Router();
const { User, TrustedContact } = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/contacts - List all emergency contacts for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const contacts = await TrustedContact.find({ user_id: req.user._id });
    res.json(contacts);
  } catch (err) {
    console.error('Failed to fetch contacts:', err.message);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts - Add a new emergency contact
router.post('/', authMiddleware, async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const contact = await TrustedContact.create({
      user_id: req.user._id,
      name: name.trim(),
      phone: phone.trim()
    });

    res.status(201).json(contact);
  } catch (err) {
    console.error('Failed to add contact:', err.message);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// DELETE /api/contacts/:id - Remove an emergency contact
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await TrustedContact.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id
    });
    if (!result) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact removed' });
  } catch (err) {
    console.error('Failed to delete contact:', err.message);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

module.exports = router;
