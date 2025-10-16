const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });
const {
  pool,
  authenticateToken,
  checkAllowedOrigin,
  hashPassword
} = require('./middleware');


// Get all users with 

router.get('/aapi/admin/users', checkAllowedOrigin, authenticateToken, async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
     const [users] = await pool.query(
      `SELECT 
         UserID, Username, Email, Role, Team, department, Section, 
         PhoneNumber, IsActive, LastLogin
       FROM users 
       ORDER BY UserID DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      currentPage: page,
      totalPages,
      totalUsers: total,
      users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'An unexpected error occurred while fetching users.' });
  }
});


// Create new user (admin only)
router.post('/aapi/admin/users', checkAllowedOrigin, authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { user_id, username, email, password, role, team, phone_number, department, section } = req.body;

  if (!user_id || !username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT UserID FROM users WHERE UserID = ? OR Username = ? OR Email = ?',
      [user_id, username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User ID, username or email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    await pool.execute(
      `INSERT INTO users (UserID, Username, Email, PasswordHash, Role, Team, 
        PhoneNumber, department, Section, IsActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [user_id, username, email, hashedPassword, role, team, phone_number, department, section]
    );

    res.json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});


// Bulk user upload
router.post('/aapi/admin/users/bulk', checkAllowedOrigin, authenticateToken, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const results = [];
    for (const row of data) {
      try {
        if (!row.user_id || !row.username || !row.email || !row.password) {
          results.push({
            row,
            status: 'skipped',
            error: 'Missing required fields'
          });
          continue;
        }

        const [existing] = await pool.execute(
          'SELECT UserID FROM users WHERE UserID = ? OR Username = ? OR Email = ?',
          [row.user_id, row.username, row.email]
        );

        if (existing.length > 0) {
          results.push({
            row,
            status: 'skipped',
            error: 'User already exists'
          });
          continue;
        }

        const hashedPassword = await hashPassword(row.password);
        
        await pool.execute(
          `INSERT INTO users (UserID, Username, Email, PasswordHash, Role, Team, 
            PhoneNumber, department, Section, IsActive)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            row.user_id,
            row.username,
            row.email,
            hashedPassword,
            row.role || 'user',
            row.team || null,
            row.phone_number || null,
            row.department || null,
            row.section || null
          ]
        );

        results.push({ row, status: 'success' });
      } catch (err) {
        results.push({
          row,
          status: 'error',
          error: err.message
        });
      }
    }

    res.json({ message: 'Bulk upload processed', results });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

// Get all users with search and pagination (superadmin)
router.get('/aapi/superadmin/users', checkAllowedOrigin, async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    //  Interpolation
    const query = `
      SELECT UserID, Username, Email, Role, Team, PhoneNumber, 
             CreatedAt, UpdatedAt, LastLogin, department, Section,
             FailedLoginAttempts, IsLocked, IsActive
      FROM users
      WHERE Username LIKE ? OR Email LIKE ? OR PhoneNumber LIKE ?
      ORDER BY CreatedAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [users] = await pool.query(query, [
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    ]);

    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM users
       WHERE Username LIKE ? OR Email LIKE ? OR PhoneNumber LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );

    res.json({
      users,
      total: count[0].total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


// Get single user (superadmin)
router.get('/aapi/superadmin/users/:id', checkAllowedOrigin, async (req, res) => {
  try {
    const [user] = await pool.query(
      `SELECT UserID, Username, Email, Role, Team, PhoneNumber, 
             department, Section, IsLocked, IsActive
       FROM users WHERE UserID = ?`,
      [req.params.id]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});


// details for (superadmin)
router.put('/aapi/superadmin/users/:id', checkAllowedOrigin, async (req, res) => {
  try {
    const { id } = req.params;
    const { Username, Email, Role, Team, PhoneNumber, department, Section } = req.body;

    const [existing] = await pool.query('SELECT UserID FROM users WHERE UserID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      `UPDATE users SET 
        Username = ?, Email = ?, Role = ?, Team = ?, 
        PhoneNumber = ?, department = ?, Section = ?, UpdatedAt = NOW()
       WHERE UserID = ?`,
      [Username, Email, Role, Team, PhoneNumber, department, Section, id]
    );

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


// userfor (superadmin)
router.patch('/aapi/superadmin/users/:id/status', checkAllowedOrigin, async (req, res) => {
  try {
    const { id } = req.params;
    const { IsActive, IsLocked } = req.body;

    await pool.query(
      `UPDATE users SET 
        IsActive = ?, IsLocked = ?, UpdatedAt = NOW()
       WHERE UserID = ?`,
      [IsActive, IsLocked, id]
    );

    res.json({ message: 'User status updated successfully' });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});


// Reset password (superadmin) === for users
router.post('/aapi/superadmin/users/:id/reset-password', checkAllowedOrigin, async (req, res) => {
  try {
    const { id } = req.params;
    const { NewPassword } = req.body;

    if (!NewPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const hashedPassword = await hashPassword(NewPassword);

    await pool.query(
      `UPDATE users SET 
        PasswordHash = ?, PasswordChangedAt = NOW(), TokenVersion = TokenVersion + 1
       WHERE UserID = ?`,
      [hashedPassword, id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});


// delete users (superadmin)
router.delete('/aapi/superadmin/users/:id', checkAllowedOrigin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM users WHERE UserID = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


module.exports = router;
