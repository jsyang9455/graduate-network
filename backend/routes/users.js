const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.id, u.email, u.name, u.user_type, u.phone, u.profile_image, u.created_at,
              gp.graduation_year, gp.major, gp.current_company, gp.current_position, 
              gp.bio, gp.skills, gp.is_mentor
       FROM users u
       LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
       WHERE u.id = $1 AND u.is_active = true`,
      [id]
    );

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
    const { name, phone, profile_image } = req.body;
    const userId = req.user.id;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           profile_image = COALESCE($3, profile_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, name, user_type, phone, profile_image`,
      [name, phone, profile_image, userId]
    );

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
      page = 1, 
      limit = 20 
    } = req.query;

    let queryText = `
      SELECT u.id, u.name, u.user_type, u.profile_image,
             gp.graduation_year, gp.major, gp.current_company, 
             gp.current_position, gp.is_mentor
      FROM users u
      LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
      WHERE u.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (u.name ILIKE $${paramCount} OR gp.current_company ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (user_type) {
      paramCount++;
      queryText += ` AND u.user_type = $${paramCount}`;
      params.push(user_type);
    }

    if (graduation_year) {
      paramCount++;
      queryText += ` AND gp.graduation_year = $${paramCount}`;
      params.push(graduation_year);
    }

    if (major) {
      paramCount++;
      queryText += ` AND gp.major ILIKE $${paramCount}`;
      params.push(`%${major}%`);
    }

    if (is_mentor === 'true') {
      queryText += ` AND gp.is_mentor = true`;
    }

    queryText += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, (page - 1) * limit);

    const result = await query(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM users u
      LEFT JOIN graduate_profiles gp ON u.id = gp.user_id
      WHERE u.is_active = true
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

module.exports = router;
