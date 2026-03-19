const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth, checkRole } = require('../middleware/auth');

// ─── GET /api/counseling-journals ────────────────────────────
// 교사: 본인 작성 일지, 학생/졸업생: 본인 관련 공개 일지, 관리자: 전체
router.get('/', auth, async (req, res) => {
    try {
        const { user_type, id: userId } = req.user;
        let result;

        if (user_type === 'admin') {
            result = await query(
                `SELECT * FROM counseling_journals ORDER BY counseling_date DESC, created_at DESC`
            );
        } else if (user_type === 'teacher') {
            result = await query(
                `SELECT * FROM counseling_journals
                 WHERE teacher_id = $1
                 ORDER BY counseling_date DESC, created_at DESC`,
                [userId]
            );
        } else {
            // student, graduate: 본인 관련 + 공개 일지만
            result = await query(
                `SELECT * FROM counseling_journals
                 WHERE student_id = $1 AND is_private = FALSE
                 ORDER BY counseling_date DESC, created_at DESC`,
                [userId]
            );
        }

        res.json({ journals: result.rows });
    } catch (error) {
        console.error('Get journals error:', error);
        res.status(500).json({ error: '상담일지를 불러오지 못했습니다.' });
    }
});

// ─── GET /api/counseling-journals/:id ────────────────────────
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM counseling_journals WHERE id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '상담일지를 찾을 수 없습니다.' });
        }
        const journal = result.rows[0];

        // 접근 권한 체크
        const { user_type, id: userId } = req.user;
        if (user_type === 'admin') {
            // 전체 허용
        } else if (user_type === 'teacher') {
            if (journal.teacher_id !== userId) {
                return res.status(403).json({ error: '접근 권한이 없습니다.' });
            }
        } else {
            if (journal.student_id !== userId || journal.is_private) {
                return res.status(403).json({ error: '접근 권한이 없습니다.' });
            }
        }

        res.json({ journal });
    } catch (error) {
        console.error('Get journal error:', error);
        res.status(500).json({ error: '상담일지를 불러오지 못했습니다.' });
    }
});

// ─── POST /api/counseling-journals ───────────────────────────
// 교사, 관리자만 작성 가능
router.post('/', auth, checkRole('teacher', 'admin'), async (req, res) => {
    try {
        const { id: teacherId, name: teacherName, user_type } = req.user;
        const {
            student_id = null,
            student_name,
            counseling_date,
            type,
            title,
            content,
            follow_up = null,
            is_private = false,
        } = req.body;

        if (!student_name || !counseling_date || !type || !title || !content) {
            return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
        }

        const result = await query(
            `INSERT INTO counseling_journals
             (teacher_id, teacher_name, student_id, student_name,
              counseling_date, type, title, content, follow_up, is_private)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [teacherId, teacherName || '', student_id, student_name,
             counseling_date, type, title, content, follow_up, is_private]
        );

        res.status(201).json({ journal: result.rows[0] });
    } catch (error) {
        console.error('Create journal error:', error);
        res.status(500).json({ error: '상담일지 작성에 실패했습니다.' });
    }
});

// ─── PUT /api/counseling-journals/:id ────────────────────────
// 작성자 교사 또는 관리자만 수정 가능
router.put('/:id', auth, checkRole('teacher', 'admin'), async (req, res) => {
    try {
        const { user_type, id: userId } = req.user;

        // 기존 일지 확인
        const existing = await query(
            `SELECT * FROM counseling_journals WHERE id = $1`,
            [req.params.id]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: '상담일지를 찾을 수 없습니다.' });
        }
        const journal = existing.rows[0];

        if (user_type !== 'admin' && journal.teacher_id !== userId) {
            return res.status(403).json({ error: '수정 권한이 없습니다.' });
        }

        const {
            student_id   = journal.student_id,
            student_name = journal.student_name,
            counseling_date = journal.counseling_date,
            type         = journal.type,
            title        = journal.title,
            content      = journal.content,
            follow_up    = journal.follow_up,
            is_private   = journal.is_private,
        } = req.body;

        const result = await query(
            `UPDATE counseling_journals SET
               student_id = $1, student_name = $2,
               counseling_date = $3, type = $4,
               title = $5, content = $6,
               follow_up = $7, is_private = $8
             WHERE id = $9
             RETURNING *`,
            [student_id, student_name, counseling_date, type,
             title, content, follow_up, is_private, req.params.id]
        );

        res.json({ journal: result.rows[0] });
    } catch (error) {
        console.error('Update journal error:', error);
        res.status(500).json({ error: '상담일지 수정에 실패했습니다.' });
    }
});

// ─── DELETE /api/counseling-journals/:id ─────────────────────
// 작성자 교사 또는 관리자만 삭제 가능
router.delete('/:id', auth, checkRole('teacher', 'admin'), async (req, res) => {
    try {
        const { user_type, id: userId } = req.user;

        const existing = await query(
            `SELECT * FROM counseling_journals WHERE id = $1`,
            [req.params.id]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: '상담일지를 찾을 수 없습니다.' });
        }

        if (user_type !== 'admin' && existing.rows[0].teacher_id !== userId) {
            return res.status(403).json({ error: '삭제 권한이 없습니다.' });
        }

        await query(`DELETE FROM counseling_journals WHERE id = $1`, [req.params.id]);
        res.json({ message: '상담일지가 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete journal error:', error);
        res.status(500).json({ error: '상담일지 삭제에 실패했습니다.' });
    }
});

module.exports = router;
