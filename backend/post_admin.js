require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const port = process.env.PORT_POST_ADMIN;

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const type = file.mimetype.split('/')[0];
    const subfolder = ['image', 'video', 'audio'].includes(type) ? `${type}s` : 'documents';
    const typeDir = path.join(uploadDir, subfolder);
    if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
    
    cb(null, typeDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, audio, and documents are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024,
    files: 1
  }
});
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamification',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(dbConfig);

async function query(sql, params, connection = null) {
  const client = connection || db;
  try {
    const [rows] = await client.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

app.post('/api/posts', upload.single('media'), async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const { content, userId, groupId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    if (!content?.trim() && !req.file) {
      return res.status(400).json({ error: 'Post content or media is required' });
    }

    const postContent = content?.trim() || null;
    let mediaUrl = null;
    
    if (req.file) {
      const filename = path.basename(req.file.path);
      const type = req.file.mimetype.split('/')[0];
      const subfolder = ['image', 'video', 'audio'].includes(type) ? `${type}s` : 'documents';
      mediaUrl = `/uploads/${subfolder}/${filename}`;
    }

    const [result] = await connection.execute(
      'INSERT INTO posts (user_id, group_id, content, media_url) VALUES (?, ?, ?, ?)',
      [userId, groupId || null, postContent, mediaUrl]
    );

    const [post] = await connection.execute(`
      SELECT p.*, u.username, u.profile_picture as avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.UserID
      WHERE p.post_id = ?
    `, [result.insertId]);

    await connection.commit();
    res.status(201).json(post[0]);
  } catch (error) {
    if (connection) await connection.rollback();
    
    if (req.file) {
      const filePath = req.file.path;
      fs.unlink(filePath, err => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to delete uploaded file:', err);
        }
      });
    }

    console.error('Post creation error:', error);
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
    res.status(status).json({ 
      error: error.message || 'Failed to create post',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const { groupId, userId } = req.query;
    
    const filterParams = [];
    const whereClauses = [];
    
    if (groupId) {
      whereClauses.push('p.group_id = ?');
      filterParams.push(parseInt(groupId));
    }
    
    if (userId) {
      whereClauses.push('p.user_id = ?');
      filterParams.push(parseInt(userId));
    }
    
    const queryParams = [...filterParams];
    queryParams.push(parseInt(limit));
    queryParams.push(parseInt(offset));
    
const baseQuery = `
  SELECT 
    p.*, 
    u.username, 
    u.profile_picture as avatar_url,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count,
    (SELECT COUNT(*) FROM postreactions pr WHERE pr.post_id = p.post_id) as reaction_count
  FROM posts p
  JOIN users u ON p.user_id = u.UserID
  ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
  ORDER BY p.created_at DESC
  LIMIT ${limit} OFFSET ${offset}
`;
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM posts p
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
    `;
const [posts, [total]] = await Promise.all([
  query(baseQuery, filterParams),   // no limit/offset in params
  query(countQuery, filterParams)
]);

    
    res.json({
      data: posts,
      pagination: {
        page,
        limit,
        total: total.total,
        totalPages: Math.ceil(total.total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch posts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.delete('/api/admin/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
        const [post] = await query('SELECT media_url FROM posts WHERE post_id = ?', [id]);
    
    if (post.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
        if (post[0].media_url) {
      const filePath = path.join(__dirname, post[0].media_url);
      fs.unlink(filePath, err => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to delete media file:', err);
        }
      });
    }
        await query('DELETE FROM posts WHERE post_id = ?', [id]);
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});