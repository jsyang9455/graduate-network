const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

// Get user's certificates
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM certificates 
       WHERE user_id = $1 
       ORDER BY requested_at DESC`,
      [req.user.id]
    );

    res.json({ certificates: result.rows });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ error: 'Failed to get certificates' });
  }
});

// Request certificate
router.post('/', auth, async (req, res) => {
  try {
    const { certificate_type, purpose } = req.body;

    if (!certificate_type) {
      return res.status(400).json({ error: 'Certificate type is required' });
    }

    const result = await query(
      `INSERT INTO certificates (user_id, certificate_type, purpose, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [req.user.id, certificate_type, purpose]
    );

    res.status(201).json({
      message: 'Certificate request submitted',
      certificate: result.rows[0]
    });
  } catch (error) {
    console.error('Request certificate error:', error);
    res.status(500).json({ error: 'Failed to request certificate' });
  }
});

// Get single certificate
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, u.name, u.email
       FROM certificates c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ certificate: result.rows[0] });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ error: 'Failed to get certificate' });
  }
});

module.exports = router;
