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

      const reColCheck = await query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name IN 
           ('phone','school_name','major','desired_job','graduation_year','department_name','withdraw_reason','withdrawn_at')`
      );
      const reExistingCols = reColCheck.rows.map(r => r.column_name);

      const reOptional = { phone, school_name, major: major || null, desired_job: desired_job || null, graduation_year: graduation_year || null, department_name: department_name || null };
      let setClauses = ['password_hash = $1', 'name = $2', 'user_type = $3', 'is_active = true', 'updated_at = CURRENT_TIMESTAMP'];
      let updateVals = [password_hash, name, user_type];
      let pIdx = 3;

      for (const [col, val] of Object.entries(reOptional)) {
        if (reExistingCols.includes(col)) {
          pIdx++;
          setClauses.push(`${col} = $${pIdx}`);
          updateVals.push(val);
        }
      }
      if (reExistingCols.includes('withdraw_reason')) setClauses.push('withdraw_reason = NULL');
      if (reExistingCols.includes('withdrawn_at')) setClauses.push('withdrawn_at = NULL');

      pIdx++;
      updateVals.push(found.id);

      const reResult = await query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${pIdx} RETURNING *`,
        updateVals
      );
      const { password_hash: _ph, ...user } = reResult.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, user_type: user.user_type },
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

    // 실제 존재하는 컬럼만 INSERT (AWS DB가 구버전일 수 있음)
    const colCheck = await query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name IN 
         ('phone','school_name','major','desired_job','graduation_year','department_name')`
    );
    const existingCols = colCheck.rows.map(r => r.column_name);

    const optionalFields = { phone, school_name, major: major || null, desired_job: desired_job || null, graduation_year: graduation_year || null, department_name: department_name || null };
    const insertCols = ['email', 'password_hash', 'name', 'user_type'];
    const insertVals = [email, password_hash, name, user_type];

    for (const [col, val] of Object.entries(optionalFields)) {
      if (existingCols.includes(col)) {
        insertCols.push(col);
        insertVals.push(val);
      }
    }

    const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      insertVals
    );

    const { password_hash: _, ...user } = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, user_type: user.user_type },
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
      { id: user.id, email: user.email, name: user.name, user_type: user.user_type },
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
        profile_image: user.profile_image,
        is_counselor: user.is_counselor || false
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
    
    // SELECT * 사용으로 컬럼 존재 여부에 무관하게 동작
    const result = await query(
      `SELECT * FROM users WHERE id = $1 AND is_active = true`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // password_hash 제외하고 반환
    const { password_hash, ...userData } = result.rows[0];
    res.json({ user: userData });
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
