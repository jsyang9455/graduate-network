const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { body, validationResult } = require('express-validator');

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('user_type').isIn(['student', 'graduate', 'teacher', 'company', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, user_type, phone, school_name, major, desired_job, graduation_year, department_name } = req.body;

    // Check if user exists
    const existingUser = await query(
      'SELECT id, is_active FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const found = existingUser.rows[0];
      if (found.is_active) {
        // 이미 활성 계정 존재
        return res.status(400).json({ error: 'Email already registered' });
      }
      // 탈퇴한 계정 → 재가입: 기존 레코드 갱신
      const password_hash = await bcrypt.hash(password, 10);
      let result;
      try {
        result = await query(
          `UPDATE users 
           SET password_hash = $1, name = $2, user_type = $3, phone = $4,
               school_name = $5, major = $6, desired_job = $7, graduation_year = $8, department_name = $9,
               is_active = true, withdraw_reason = NULL, withdrawn_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $10
           RETURNING id, email, name, user_type, phone, school_name, major, desired_job, graduation_year, department_name, created_at`,
          [password_hash, name, user_type, phone, school_name, major || null, desired_job || null, graduation_year || null, department_name || null, found.id]
        );
      } catch (colError) {
        console.warn('Re-register fallback (missing columns):', colError.message);
        result = await query(
          `UPDATE users 
           SET password_hash = $1, name = $2, user_type = $3, phone = $4,
               school_name = $5, major = $6, desired_job = $7,
               is_active = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $8
           RETURNING id, email, name, user_type, phone, school_name, major, desired_job, created_at`,
          [password_hash, name, user_type, phone, school_name, major || null, desired_job || null, found.id]
        );
      }
      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, user_type: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );
      return res.status(201).json({
        message: 'User registered successfully',
        user: { id: user.id, email: user.email, name: user.name, user_type: user.user_type,
                phone: user.phone, school_name: user.school_name, major: user.major,
                desired_job: user.desired_job, graduation_year: user.graduation_year, department_name: user.department_name },
        token
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    let result;
    try {
      result = await query(
        `INSERT INTO users (email, password_hash, name, user_type, phone, school_name, major, desired_job, graduation_year, department_name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING id, email, name, user_type, phone, school_name, major, desired_job, graduation_year, department_name, created_at`,
        [email, password_hash, name, user_type, phone, school_name, major || null, desired_job || null, graduation_year || null, department_name || null]
      );
    } catch (colError) {
      console.warn('Register fallback (missing columns):', colError.message);
      result = await query(
        `INSERT INTO users (email, password_hash, name, user_type, phone, school_name, major, desired_job) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id, email, name, user_type, phone, school_name, major, desired_job, created_at`,
        [email, password_hash, name, user_type, phone, school_name, major || null, desired_job || null]
      );
    }

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        user_type: user.user_type,
        phone: user.phone,
        school_name: user.school_name,
        major: user.major,
        desired_job: user.desired_job,
        graduation_year: user.graduation_year,
        department_name: user.department_name,
        profile_image: user.profile_image
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('Login attempt:', { email, password: '***' });

    // Get user
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    
    console.log('Query result:', { rowCount: result.rows.length });

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        user_type: user.user_type,
        phone: user.phone,
        school_name: user.school_name,
        major: user.major,
        desired_job: user.desired_job,
        profile_image: user.profile_image
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let result;
    try {
      result = await query(
        `SELECT id, email, name, user_type, phone, school_name, major, desired_job, graduation_year, department_name, profile_image, created_at, last_login 
         FROM users WHERE id = $1 AND is_active = true`,
        [decoded.id]
      );
    } catch (colError) {
      console.warn('/me fallback (missing columns):', colError.message);
      result = await query(
        `SELECT id, email, name, user_type, phone, school_name, major, desired_job, profile_image, created_at, last_login 
         FROM users WHERE id = $1 AND is_active = true`,
        [decoded.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password_hash, decoded.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = router;
