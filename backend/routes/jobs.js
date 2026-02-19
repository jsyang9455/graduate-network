const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { auth, checkRole } = require('../middleware/auth');

// Get all jobs (with filters)
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      location, 
      job_type, 
      experience_level,
      status = 'active',
      page = 1, 
      limit = 20 
    } = req.query;

    let queryText = `
      SELECT j.*, 
             u.name as company_name,
             cp.logo_url as company_logo
      FROM jobs j
      JOIN users u ON j.company_id = u.id
      LEFT JOIN company_profiles cp ON u.id = cp.user_id
      WHERE j.status = $1
    `;
    const params = [status];
    let paramCount = 1;

    if (search) {
      paramCount++;
      queryText += ` AND (j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (location) {
      paramCount++;
      queryText += ` AND j.location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }

    if (job_type) {
      paramCount++;
      queryText += ` AND j.job_type = $${paramCount}`;
      params.push(job_type);
    }

    if (experience_level) {
      paramCount++;
      queryText += ` AND j.experience_level = $${paramCount}`;
      params.push(experience_level);
    }

    queryText += ` ORDER BY j.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, (page - 1) * limit);

    const result = await query(queryText, params);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM jobs WHERE status = $1',
      [status]
    );

    res.json({
      jobs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Increment views
    await query('UPDATE jobs SET views_count = views_count + 1 WHERE id = $1', [id]);

    const result = await query(
      `SELECT j.*, 
              u.name as company_name, u.email as company_email, u.phone as company_phone,
              cp.logo_url, cp.website, cp.description as company_description
       FROM jobs j
       JOIN users u ON j.company_id = u.id
       LEFT JOIN company_profiles cp ON u.id = cp.user_id
       WHERE j.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job: result.rows[0] });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// Create job (company only)
router.post('/', auth, checkRole('company', 'admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      location,
      job_type,
      salary_range,
      experience_level,
      deadline
    } = req.body;

    const result = await query(
      `INSERT INTO jobs 
       (company_id, title, description, requirements, location, job_type, 
        salary_range, experience_level, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, title, description, requirements, location, job_type,
       salary_range, experience_level, deadline]
    );

    res.status(201).json({
      message: 'Job created successfully',
      job: result.rows[0]
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
router.put('/:id', auth, checkRole('company', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      requirements,
      location,
      job_type,
      salary_range,
      experience_level,
      deadline,
      status
    } = req.body;

    // Check ownership
    const jobCheck = await query(
      'SELECT company_id FROM jobs WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobCheck.rows[0].company_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `UPDATE jobs 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           requirements = COALESCE($3, requirements),
           location = COALESCE($4, location),
           job_type = COALESCE($5, job_type),
           salary_range = COALESCE($6, salary_range),
           experience_level = COALESCE($7, experience_level),
           deadline = COALESCE($8, deadline),
           status = COALESCE($9, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [title, description, requirements, location, job_type, salary_range,
       experience_level, deadline, status, id]
    );

    res.json({
      message: 'Job updated successfully',
      job: result.rows[0]
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', auth, checkRole('company', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const jobCheck = await query(
      'SELECT company_id FROM jobs WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobCheck.rows[0].company_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await query('DELETE FROM jobs WHERE id = $1', [id]);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Apply for job
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cover_letter, resume_url } = req.body;

    // Check if already applied
    const existing = await query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    // Check if job exists and is active
    const jobCheck = await query(
      'SELECT id, status FROM jobs WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobCheck.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'Job is not active' });
    }

    const result = await query(
      `INSERT INTO job_applications (job_id, user_id, cover_letter, resume_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.user.id, cover_letter, resume_url]
    );

    // Update applications count
    await query(
      'UPDATE jobs SET applications_count = applications_count + 1 WHERE id = $1',
      [id]
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Apply job error:', error);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// Get my applications
router.get('/my/applications', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT ja.*, j.title, j.location, j.job_type,
              u.name as company_name
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       JOIN users u ON j.company_id = u.id
       WHERE ja.user_id = $1
       ORDER BY ja.applied_at DESC`,
      [req.user.id]
    );

    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

module.exports = router;
