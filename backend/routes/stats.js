const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { auth, checkRole } = require('../middleware/auth');

// site_stats 테이블 자동 생성 및 초기 데이터 삽입
async function initStatsTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS site_stats (
                key VARCHAR(50) PRIMARY KEY,
                value VARCHAR(100) NOT NULL DEFAULT '0',
                label VARCHAR(100) NOT NULL,
                sort_order INT NOT NULL DEFAULT 0
            )
        `);
        await query(`
            INSERT INTO site_stats (key, value, label, sort_order) VALUES
                ('total_students', '0', '등록 학생', 1),
                ('employment_rate', '0%', '취업률', 2),
                ('active_members', '0', '활동 회원', 3)
            ON CONFLICT (key) DO NOTHING
        `);
        console.log('site_stats 테이블 초기화 완료');
    } catch (err) {
        console.error('site_stats 테이블 초기화 오류:', err.message);
    }
}
initStatsTable();

// GET /api/stats - 공개 (메인페이지에서 사용)
router.get('/', async (req, res) => {
    try {
        const result = await query(
            'SELECT key, value, label FROM site_stats ORDER BY sort_order ASC'
        );
        const stats = {};
        result.rows.forEach(row => {
            stats[row.key] = { value: row.value, label: row.label };
        });
        res.json(stats);
    } catch (err) {
        console.error('GET /stats 오류:', err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// PUT /api/stats - 관리자 전용
router.put('/', auth, checkRole('admin'), async (req, res) => {
    const updates = req.body;
    const client = await getClient();
    try {
        await client.query('BEGIN');
        for (const [key, data] of Object.entries(updates)) {
            if (data && data.value !== undefined) {
                await client.query(
                    `UPDATE site_stats SET value = $1, label = $2 WHERE key = $3`,
                    [data.value, data.label || key, key]
                );
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: '주요 현황이 저장되었습니다.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('PUT /stats 오류:', err);
        res.status(500).json({ error: '저장 오류' });
    } finally {
        client.release();
    }
});

module.exports = router;
