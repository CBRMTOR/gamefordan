const express = require('express');
const app = express();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT_ATTENDANCE || 5040;
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_ATTENDANCE_DATABASE || 'attendance_database',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const cache = new Map();
app.use((req, res, next) => {
  if (req.method === 'GET') {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp < 5000)) {
      return res.json(cached.data);
    }
  }
  next();
});

// middleware
function checkAllowedOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (!origin || corsOptions.origin === '*' || corsOptions.origin.includes(origin)) {
    return next();
  }
  return res.status(403).json({ error: 'Origin not allowed' });
}

// Create attendance session
app.post('/api/attendance/create', checkAllowedOrigin, async (req, res) => {
  const { title, description, duration, createdBy = 'System' } = req.body;
  if (!title) return res.status(400).json({ error: 'Attendance title is required' });
  if (!duration || duration < 1) return res.status(400).json({ error: 'Valid duration is required' });

  try {
    const sessionId = uuidv4();
    const qrData = JSON.stringify({ 
      type: 'attendance',
      sessionId: sessionId,
      title: title,
      description: description || '',
      duration: duration,
      createdBy: createdBy,
      expiresAt: new Date(Date.now() + duration * 60000).toISOString()
    });
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 3,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const expiresAt = new Date(Date.now() + duration * 60000);
    const [result] = await pool.execute(
      `INSERT INTO attendance_sessions 
       (session_id, title, description, duration, created_by, qr_code, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, title, description, duration, createdBy, qrCode, expiresAt]
    );

    res.json({ 
      success: true, 
      sessionId, 
      qrCode, 
      qrData: qrData,
      message: 'Attendance session created successfully' 
    });
  } catch (err) {
    console.error('Error creating attendance session:', err);
    res.status(500).json({ error: 'Failed to create attendance session' });
  }
});

app.get('/api/attendance/sessions', checkAllowedOrigin, async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      `SELECT s.*, s.created_by as created_by_name 
       FROM attendance_sessions s 
       ORDER BY s.created_at DESC`
    );
    cache.set(req.originalUrl, {
      data: { sessions },
      timestamp: Date.now()
    });
    
    res.json({ sessions });
  } catch (err) {
    console.error('Error fetching attendance sessions:', err);
    res.status(500).json({ error: 'Failed to fetch attendance sessions' });
  }
});

// Submit attendance via QR code scan
app.post('/api/attendance/submit', checkAllowedOrigin, async (req, res) => {
  const { sessionId, username, userId, department, section, team } = req.body;

  if (!sessionId || !username) {
    return res.status(400).json({ error: 'Session ID and username are required' });
  }

  let connection;
  try {
   connection = await pool.getConnection();
    await connection.beginTransaction();
const [sessions] = await connection.execute(
      `SELECT * FROM attendance_sessions WHERE session_id = ?`,
         [sessionId]
    );
    
    if (sessions.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid attendance session' });
    }

   const session = sessions[0];
    if (new Date(session.expires_at) < new Date()) {
      await connection.rollback();
      return res.status(400).json({ error: 'Attendance session has expired' });
    }

    let checkDuplicateQuery;
    let checkDuplicateParams;
    
    if (userId) {
      checkDuplicateQuery = `SELECT * FROM attendance_logs WHERE user_id = ? AND session_id = ?`;
      checkDuplicateParams = [userId, sessionId];
    } else {
      checkDuplicateQuery = `SELECT * FROM attendance_logs WHERE username = ? AND session_id = ?`;
      checkDuplicateParams = [username, sessionId];
    }

    const [existingLogs] = await connection.execute(
      checkDuplicateQuery,
      checkDuplicateParams
    );
    
    if (existingLogs.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'You have already taken attendance for this session' });
    }

    // Convert undefined values to null for MySQL
    const safeDepartment = department !== undefined ? department : null;
    const safeSection = section !== undefined ? section : null;
    const safeTeam = team !== undefined ? team : null;
    const safeUserId = userId !== undefined ? userId : null;

    // Insert attendance record with all user information
    await connection.execute(
      `INSERT INTO attendance_logs 
       (username, user_id, department, section, team, session_id, check_in_time, status) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Present')`,
      [username, safeUserId, safeDepartment, safeSection, safeTeam, sessionId]
    );

    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Attendance submitted successfully', 
      sessionTitle: session.title 
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error submitting attendance:', err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'You have already taken attendance for this session' });
    }
    
    res.status(500).json({ error: 'Failed to submit attendance' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/attendance/logs/:sessionId', checkAllowedOrigin, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const [logs] = await pool.execute(
      `SELECT * FROM attendance_logs WHERE session_id = ? ORDER BY check_in_time DESC`,
      [sessionId]
    );
    
    cache.set(req.originalUrl, {
      data: { logs },
      timestamp: Date.now()
    });
    
    res.json({ logs });
  } catch (err) {
    console.error('Error fetching attendance logs:', err);
    res.status(500).json({ error: 'Failed to fetch attendance logs' });
  }
});

app.delete('/api/attendance/sessions/:sessionId', checkAllowedOrigin, async (req, res) => {
  const { sessionId } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `DELETE FROM attendance_logs WHERE session_id = ?`,
      [sessionId]
    );

    const [result] = await connection.execute(
      `DELETE FROM attendance_sessions WHERE session_id = ?`,
      [sessionId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Session not found' });
    }

    await connection.commit();
    
    cache.clear();
    
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => res.send('Attendance API is running!'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));