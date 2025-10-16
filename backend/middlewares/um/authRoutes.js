const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  app,
  pool,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  COOKIE_MAX_AGE,
  authenticateToken,
  authLimiter,
  bruteForceLimiter,
  sensitiveActionLimiter,
  isStrongPassword,
  hashPassword,
  checkAllowedOrigin
} = require('./middleware.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fileUpload = require('express-fileupload');

// Configure file upload middleware
app.use(fileUpload({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  abortOnLimit: true,
  responseOnLimit: 'File size limit has been reached (2MB max)'
}));

// Set up profile pictures directory
const uploadsDir = path.join(__dirname, '../../uploads');
const profilePicturesPath = path.join(uploadsDir, 'profile_pictures');

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profilePicturesPath)) {
  fs.mkdirSync(profilePicturesPath, { recursive: true });
}

// Serve static files from the profile pictures directory
app.use('/profile_pictures', express.static(profilePicturesPath));

// Login endpoint
router.post('/aapi/auth/login', authLimiter, checkAllowedOrigin, bruteForceLimiter, async (req, res) => {
  const { user_id, password } = req.body;
  
  if (!user_id || !password) {
    return res.status(400).json({ error: 'User ID and password are required' });
  }
  
  if (!/^\d+$/.test(user_id)) {
    return res.status(400).json({ error: 'User ID must be numeric' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT UserID, PasswordHash, Role, Team, department, Section, 
       FailedLoginAttempts, LastFailedLogin, IsLocked, IsActive, profile_picture
       FROM users WHERE UserID = ?`,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    
    if (!user.IsActive) {
      return res.status(403).json({ error: 'Account is disabled' });
    }
    
    if (user.IsLocked) {
      const unlockTime = new Date(user.LastFailedLogin);
      unlockTime.setMinutes(unlockTime.getMinutes() + 30);
      
      if (new Date() < unlockTime) {
        return res.status(403).json({ 
          error: 'Account locked due to too many failed attempts',
          unlock_time: unlockTime
        });
      } else {
        await pool.execute(
          'UPDATE users SET IsLocked = 0, FailedLoginAttempts = 0 WHERE UserID = ?',
          [user.UserID]
        );
      }
    }

    const match = await bcrypt.compare(password, user.PasswordHash);
    
    if (!match) {
      const newAttempts = user.FailedLoginAttempts + 1;
      const isLocked = newAttempts >= 5;
      
      await pool.execute(
        'UPDATE users SET FailedLoginAttempts = ?, LastFailedLogin = NOW(), IsLocked = ? WHERE UserID = ?',
        [newAttempts, isLocked, user.UserID]
      );
      
      const remainingAttempts = 5 - newAttempts;
      return res.status(401).json({ 
        error: 'Invalid credentials',
        remaining_attempts: remainingAttempts > 0 ? remainingAttempts : 0,
        account_locked: isLocked
      });
    }

    await pool.execute(
      'UPDATE users SET FailedLoginAttempts = 0, LastLogin = NOW() WHERE UserID = ?',
      [user.UserID]
    );

    const token = jwt.sign(
      {
        user_id: user.UserID,
        role: user.Role,
        team: user.Team,
        department: user.department,
        profile_picture: user.profile_picture,
        section: user.Section,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    });

    res.json({
      user: {
        user_id: user.UserID,
        role: user.Role,
        team: user.Team,
        department: user.department,
        section: user.Section,
        profile_picture: user.profile_picture
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout endpoint
router.post('/aapi/auth/logout', checkAllowedOrigin, (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.json({ message: 'Logged out successfully' });
});

// User info endpoint
router.get('/aapi/auth/me', checkAllowedOrigin, authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT UserID, Username, Email, Role, Team, department, Section, LastLogin, 
              PhoneNumber, profile_picture, bio
       FROM users 
       WHERE UserID = ? AND IsActive = 1`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    
    // Construct full URL for profile picture if it exists
    let profilePictureUrl = null;
    if (user.profile_picture) {
      profilePictureUrl = `${req.protocol}://${req.get('host')}/profile_pictures/${user.profile_picture}`;
    }

    res.json({
      user_id: user.UserID,
      username: user.Username,
      email: user.Email,
      role: user.Role,
      team: user.Team,
      department: user.department,
      section: user.Section,
      lastLogin: user.LastLogin,
      phoneNumber: user.PhoneNumber,
      profile_picture: profilePictureUrl,
      bio: user.bio
    });
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Change password endpoint
router.post('/aapi/auth/change-password', checkAllowedOrigin, authenticateToken, sensitiveActionLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords are required' });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
    });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT PasswordHash FROM users WHERE UserID = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].PasswordHash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await pool.execute(
      'UPDATE users SET PasswordHash = ?, PasswordChangedAt = NOW() WHERE UserID = ?',
      [hashedPassword, req.user.user_id]
    );

    try {
      await pool.execute(
        'UPDATE users SET TokenVersion = COALESCE(TokenVersion, 0) + 1 WHERE UserID = ?',
        [req.user.user_id]
      );
    } catch (tokenErr) {
      console.warn('TokenVersion column missing or update failed:', tokenErr.sqlMessage);
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Profile picture upload endpoint
// Profile picture upload endpoint
router.post('/aapi/auth/upload-profile-picture', authenticateToken, async (req, res) => {
  if (!req.files || !req.files.profile_picture) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const profilePicture = req.files.profile_picture;
  const userId = req.user.user_id;
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validTypes.includes(profilePicture.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' });
  }

  // Validate file size (max 2MB)
  if (profilePicture.size > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size too large. Maximum 2MB allowed.' });
  }

  try {
    // Generate unique filename
    const fileExt = profilePicture.name.split('.').pop();
    const filename = `profile_${userId}_${Date.now()}.${fileExt}`;
    const uploadPath = path.join(profilePicturesPath, filename);

    // Move the file to upload directory
    await profilePicture.mv(uploadPath);

    // Delete old profile picture if it exists
    const [userRows] = await pool.execute(
      'SELECT profile_picture FROM users WHERE UserID = ?',
      [userId]
    );
    
    if (userRows.length > 0 && userRows[0].profile_picture) {
      const oldFilePath = path.join(profilePicturesPath, userRows[0].profile_picture);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update user profile picture in database
    await pool.execute(
      'UPDATE users SET profile_picture = ? WHERE UserID = ?',
      [filename, userId]
    );

    // Construct the URL based on environment
    let imageUrl;
    if (process.env.NODE_ENV === 'production') {
      // In production, use the domain name with HTTPS
      imageUrl = `https://${req.get('host')}/profile_pictures/${filename}`;
    } else {
      // In development, use the original protocol and host
      imageUrl = `${req.protocol}://${req.get('host')}/profile_pictures/${filename}`;
    }

    res.json({ 
      success: true, 
      filename,
      imageUrl
    });
  } catch (err) {
    console.error('Profile picture upload error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

router.put('/aapi/auth/update-profile', authenticateToken, async (req, res) => {
  const { username, email, phoneNumber, bio, department, section } = req.body;
  const userId = req.user.user_id;

  // validation
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  try {
    const [emailCheck] = await pool.execute(
      'SELECT UserID FROM users WHERE Email = ? AND UserID != ?',
      [email, userId]
    );

    if (emailCheck.length > 0) {
      return res.status(400).json({ error: 'Email is already in use by another account' });
    }

    // Update user profile
    await pool.execute(
      `UPDATE users 
       SET Username = ?, Email = ?, PhoneNumber = ?, bio = ?, 
           department = ?, Section = ?, UpdatedAt = NOW()
       WHERE UserID = ?`,
      [username, email, phoneNumber, bio, department, section, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;