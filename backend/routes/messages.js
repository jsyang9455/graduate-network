const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

// 테이블 자동 생성 (AWS DB 호환)
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id)
  `);
}
ensureTable().catch(err => console.error('messages 테이블 생성 실패:', err));

// POST /api/messages - 메시지 전송
router.post('/', auth, async (req, res) => {
  try {
    const { to_user_id, message } = req.body;
    if (!to_user_id || !message || !message.trim()) {
      return res.status(400).json({ error: '받는 사람과 메시지 내용은 필수입니다.' });
    }
    if (String(to_user_id) === String(req.user.id)) {
      return res.status(400).json({ error: '자신에게는 메시지를 보낼 수 없습니다.' });
    }

    const result = await query(
      `INSERT INTO messages (from_user_id, to_user_id, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, to_user_id, message.trim()]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/inbox - 받은 메시지
router.get('/inbox', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, u.name AS from_user_name
       FROM messages m
       LEFT JOIN users u ON m.from_user_id = u.id
       WHERE m.to_user_id = $1
       ORDER BY m.sent_at DESC`,
      [req.user.id]
    );
    const unread = result.rows.filter(m => !m.is_read).length;
    res.json({ messages: result.rows, unread_count: unread });
  } catch (err) {
    console.error('Get inbox error:', err);
    res.status(500).json({ error: 'Failed to get inbox' });
  }
});

// GET /api/messages/sent - 보낸 메시지
router.get('/sent', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, u.name AS to_user_name
       FROM messages m
       LEFT JOIN users u ON m.to_user_id = u.id
       WHERE m.from_user_id = $1
       ORDER BY m.sent_at DESC`,
      [req.user.id]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error('Get sent messages error:', err);
    res.status(500).json({ error: 'Failed to get sent messages' });
  }
});

// PUT /api/messages/:id/read - 읽음 처리
router.put('/:id/read', auth, async (req, res) => {
  try {
    const result = await query(
      `UPDATE messages SET is_read = TRUE
       WHERE id = $1 AND to_user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: result.rows[0] });
  } catch (err) {
    console.error('Read message error:', err);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// DELETE /api/messages/:id - 삭제 (보내거나 받은 사람만)
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM messages
       WHERE id = $1 AND (from_user_id = $2 OR to_user_id = $2)
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
