const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

// Stats endpoint (메인 페이지용 통계)
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE is_active = true) AS total_members,
        COUNT(*) FILTER (WHERE is_active = true AND user_type IN ('student','graduate')) AS total_students,
        COUNT(*) FILTER (WHERE is_active = true AND user_type = 'company') AS total_companies,
        COUNT(*) FILTER (WHERE is_active = true AND user_type = 'teacher') AS total_teachers
      FROM users
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Self-withdraw (자진 회원탈퇴)
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.user.id;

    let result;
    try {
      result = await query(
        `UPDATE users
         SET is_active = false,
             withdraw_reason = $1,
             withdrawn_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, email, name`,
        [reason || null, userId]
      );
    } catch (colError) {
      console.warn('Withdraw fallback (missing columns):', colError.message);
      result = await query(
        `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, name`,
        [userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: '회원 탈퇴가 완료되었습니다.', user: result.rows[0] });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to withdraw' });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let result;
    try {
      result = await query(
        `SELECT u.id, u.email, u.name, u.user_type, u.phone, u.school_name, u.major, u.desired_job, u.profile_image, u.created_at,
                u.graduation_year, u.department_name,
                gp.major AS gp_major, gp.current_company, gp.current_position, 
                gp.bio, gp.skills, gp.is_mentor
         FROM users u
         LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
         WHERE u.id = $1 AND u.is_active = true`,
        [id]
      );
    } catch (colError) {
      console.warn('GET /:id fallback (missing columns):', colError.message);
      result = await query(
        `SELECT u.id, u.email, u.name, u.user_type, u.phone, u.school_name, u.major, u.desired_job, u.profile_image, u.created_at,
                null AS graduation_year, null AS department_name,
                gp.major AS gp_major, gp.current_company, gp.current_position, 
                gp.bio, gp.skills, gp.is_mentor
         FROM users u
         LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
         WHERE u.id = $1 AND u.is_active = true`,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, profile_image, school_name, major, desired_job, graduation_year, department_name } = req.body;
    const userId = req.user.id;

    let result;
    try {
      // graduation_year, department_name 컬럼 포함 시도
      result = await query(
        `UPDATE users 
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             profile_image = COALESCE($3, profile_image),
             school_name = COALESCE($4, school_name),
             major = COALESCE($5, major),
             desired_job = COALESCE($6, desired_job),
             graduation_year = COALESCE($7, graduation_year),
             department_name = COALESCE($8, department_name),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING id, email, name, user_type, phone, school_name, major, desired_job, graduation_year, department_name, profile_image`,
        [name, phone, profile_image, school_name, major, desired_job, graduation_year || null, department_name || null, userId]
      );
    } catch (colError) {
      // 컬럼이 없는 경우 기본 필드만으로 fallback
      console.warn('Falling back to basic profile update (missing columns):', colError.message);
      result = await query(
        `UPDATE users 
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             profile_image = COALESCE($3, profile_image),
             school_name = COALESCE($4, school_name),
             major = COALESCE($5, major),
             desired_job = COALESCE($6, desired_job),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, email, name, user_type, phone, school_name, major, desired_job, profile_image`,
        [name, phone, profile_image, school_name, major, desired_job, userId]
      );
    }

    res.json({ 
      message: 'Profile updated successfully',
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get or create graduate profile
router.get('/graduate-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      'SELECT * FROM graduate_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Graduate profile not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Get graduate profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update graduate profile
router.put('/graduate-profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      graduation_year,
      major,
      current_company,
      current_position,
      career_start_date,
      bio,
      skills,
      linkedin_url,
      portfolio_url,
      is_mentor,
      mentor_capacity
    } = req.body;

    // Check if profile exists
    const existing = await query(
      'SELECT id FROM graduate_profiles WHERE user_id = $1',
      [userId]
    );

    let result;
    if (existing.rows.length === 0) {
      // Create new profile
      result = await query(
        `INSERT INTO graduate_profiles 
         (user_id, graduation_year, major, current_company, current_position, 
          career_start_date, bio, skills, linkedin_url, portfolio_url, is_mentor, mentor_capacity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [userId, graduation_year, major, current_company, current_position,
         career_start_date, bio, skills, linkedin_url, portfolio_url, is_mentor, mentor_capacity]
      );
    } else {
      // Update existing profile
      result = await query(
        `UPDATE graduate_profiles 
         SET graduation_year = COALESCE($1, graduation_year),
             major = COALESCE($2, major),
             current_company = COALESCE($3, current_company),
             current_position = COALESCE($4, current_position),
             career_start_date = COALESCE($5, career_start_date),
             bio = COALESCE($6, bio),
             skills = COALESCE($7, skills),
             linkedin_url = COALESCE($8, linkedin_url),
             portfolio_url = COALESCE($9, portfolio_url),
             is_mentor = COALESCE($10, is_mentor),
             mentor_capacity = COALESCE($11, mentor_capacity),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $12
         RETURNING *`,
        [graduation_year, major, current_company, current_position,
         career_start_date, bio, skills, linkedin_url, portfolio_url, 
         is_mentor, mentor_capacity, userId]
      );
    }

    res.json({ 
      message: 'Graduate profile updated successfully',
      profile: result.rows[0] 
    });
  } catch (error) {
    console.error('Update graduate profile error:', error);
    res.status(500).json({ error: 'Failed to update graduate profile' });
  }
});

// Search users
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      user_type, 
      graduation_year, 
      major,
      is_mentor,
      include_withdrawn,
      page = 1, 
      limit = 20 
    } = req.query;

    const showWithdrawn = include_withdrawn === 'true';

    const buildQuery = (withExtra) => {
      const extraCols = withExtra
        ? ', u.withdraw_reason, u.withdrawn_at'
        : ', null AS withdraw_reason, null AS withdrawn_at';
      let q = `
        SELECT u.id, u.email, u.name, u.user_type, u.phone, u.school_name, u.major, u.desired_job, u.profile_image, u.created_at,
               u.is_active${extraCols},
               gp.graduation_year, gp.major AS gp_major, gp.current_company, 
               gp.current_position, gp.is_mentor
        FROM users u
        LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
        WHERE ${showWithdrawn ? 'u.is_active = false' : 'u.is_active = true'}
      `;
      return q;
    };

    const params = [];
    let paramCount = 0;
    let filterSql = '';

    if (search) {
      paramCount++;
      filterSql += ` AND (u.name ILIKE $${paramCount} OR gp.current_company ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (user_type) {
      paramCount++;
      filterSql += ` AND u.user_type = $${paramCount}`;
      params.push(user_type);
    }
    if (graduation_year) {
      paramCount++;
      filterSql += ` AND gp.graduation_year = $${paramCount}`;
      params.push(graduation_year);
    }
    if (major) {
      paramCount++;
      filterSql += ` AND gp.major ILIKE $${paramCount}`;
      params.push(`%${major}%`);
    }
    if (is_mentor === 'true') {
      filterSql += ` AND gp.is_mentor = true`;
    }

    const orderLimit = ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    const pageParams = [...params, limit, (page - 1) * limit];

    let result;
    try {
      result = await query(buildQuery(true) + filterSql + orderLimit, pageParams);
    } catch (colError) {
      console.warn('Falling back to basic user list (missing columns):', colError.message);
      result = await query(buildQuery(false) + filterSql + orderLimit, pageParams);
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM users u
      LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
      WHERE ${showWithdrawn ? 'u.is_active = false' : 'u.is_active = true'}
    `;
    const countParams = [];
    let countParamNum = 0;

    if (search) {
      countParamNum++;
      countQuery += ` AND (u.name ILIKE $${countParamNum} OR gp.current_company ILIKE $${countParamNum})`;
      countParams.push(`%${search}%`);
    }
    if (user_type) {
      countParamNum++;
      countQuery += ` AND u.user_type = $${countParamNum}`;
      countParams.push(user_type);
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Update user (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, user_type, phone } = req.body;
    
    // Only admins can update other users
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           user_type = COALESCE($3, user_type),
           phone = COALESCE($4, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, name, user_type, phone`,
      [name, email, user_type, phone, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Deactivate user (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    
    // Only admins can deactivate users
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    let result;
    try {
      result = await query(
        `UPDATE users 
         SET is_active = false,
             withdraw_reason = COALESCE($1, withdraw_reason),
             withdrawn_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, email, name`,
        [reason || null, id]
      );
    } catch (colError) {
      console.warn('Deactivate fallback (missing columns):', colError.message);
      result = await query(
        `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, name`,
        [id]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'User deactivated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;
