const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth, checkRole } = require('../middleware/auth');

// Get counseling sessions
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT cs.*,
              u1.name as user_name, u1.email as user_email,
              u2.name as counselor_name
       FROM counseling_sessions cs
       JOIN users u1 ON cs.user_id = u1.id
       LEFT JOIN users u2 ON cs.counselor_id = u2.id
       WHERE cs.user_id = $1 OR cs.counselor_id = $1
       ORDER BY cs.session_date DESC`,
      [req.user.id]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Book counseling session
router.post('/', auth, async (req, res) => {
  try {
    const {
      session_type,
      session_date,
      duration_minutes = 60,
      topic
    } = req.body;

    if (!session_date) {
      return res.status(400).json({ error: 'Session date is required' });
    }

    const result = await query(
      `INSERT INTO counseling_sessions 
       (user_id, session_type, session_date, duration_minutes, topic, status)
       VALUES ($1, $2, $3, $4, $5, 'scheduled')
       RETURNING *`,
      [req.user.id, session_type, session_date, duration_minutes, topic]
    );

    res.status(201).json({
      message: 'Counseling session booked successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({ error: 'Failed to book session' });
  }
});

// Update counseling session
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      counselor_id,
      session_date,
      duration_minutes,
      status,
      notes
    } = req.body;

    // Check if session exists and user has access
    const sessionCheck = await query(
      `SELECT * FROM counseling_sessions 
       WHERE id = $1 AND (user_id = $2 OR counselor_id = $2)`,
      [id, req.user.id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = await query(
      `UPDATE counseling_sessions 
       SET counselor_id = COALESCE($1, counselor_id),
           session_date = COALESCE($2, session_date),
           duration_minutes = COALESCE($3, duration_minutes),
           status = COALESCE($4, status),
           notes = COALESCE($5, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [counselor_id, session_date, duration_minutes, status, notes, id]
    );

    res.json({
      message: 'Session updated successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Cancel counseling session
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists and user is the owner
    const sessionCheck = await query(
      'SELECT user_id FROM counseling_sessions WHERE id = $1',
      [id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (sessionCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await query(
      `UPDATE counseling_sessions 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Session cancelled successfully' });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
});

// Get available time slots (for counselors)
router.get('/available-slots', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Get all counselors
    const counselors = await query(
      `SELECT id, name FROM users WHERE user_type = 'teacher' AND is_active = true`
    );

    // Get booked sessions for the date
    const bookedSessions = await query(
      `SELECT counselor_id, session_date, duration_minutes 
       FROM counseling_sessions 
       WHERE DATE(session_date) = $1 AND status = 'scheduled'`,
      [date]
    );

    // Generate available slots (simplified version)
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        available: true
      });
    }

    res.json({
      date,
      counselors: counselors.rows,
      slots,
      bookedSessions: bookedSessions.rows
    });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Failed to get available slots' });
  }
});

module.exports = router;
