const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

// Get all majors
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, created_at FROM majors WHERE is_active = true ORDER BY name ASC'
    );

    res.json({ majors: result.rows });
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({ error: 'Failed to get majors' });
  }
});

// Create major (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Major name is required' });
    }

    const result = await query(
      'INSERT INTO majors (name) VALUES ($1) RETURNING id, name, created_at',
      [name.trim()]
    );

    res.json({ 
      message: 'Major created successfully',
      major: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Major already exists' });
    }
    console.error('Create major error:', error);
    res.status(500).json({ error: 'Failed to create major' });
  }
});

// Update major (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Major name is required' });
    }

    const result = await query(
      `UPDATE majors 
       SET name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_active = true
       RETURNING id, name, created_at`,
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Major not found' });
    }

    res.json({ 
      message: 'Major updated successfully',
      major: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Major name already exists' });
    }
    console.error('Update major error:', error);
    res.status(500).json({ error: 'Failed to update major' });
  }
});

// Delete major (admin only - soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await query(
      `UPDATE majors 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Major not found' });
    }

    res.json({ 
      message: 'Major deleted successfully',
      major: result.rows[0]
    });
  } catch (error) {
    console.error('Delete major error:', error);
    res.status(500).json({ error: 'Failed to delete major' });
  }
});

module.exports = router;
