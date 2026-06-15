const express = require('express');
const router = express.Router();
const { User, TrustedContact } = require('../db');

// GET /api/contacts - List all emergency contacts for the default user
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne();
    if (!user) {
      return res.json([]);
    }
    const contacts = await TrustedContact.find({ user_id: user._id });
    res.json(contacts);
  } catch (err) {
    console.error('Failed to fetch contacts:', err.message);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts - Add a new emergency contact
router.post('/', async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    // Get or create default user
    let user = await User.findOne();
    if (!user) {
      user = await User.create({ name: 'Default User', phone: '+910000000000' });
    }

    const contact = await TrustedContact.create({
      user_id: user._id,
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
router.delete('/:id', async (req, res) => {
  try {
    const result = await TrustedContact.findByIdAndDelete(req.params.id);
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
