require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const port = process.env.PORT_POST_USER;

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization']
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

    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
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
  connectionLimit: 50,
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
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const cursor = parseInt(req.query.cursor) || null;
    
    let baseQuery = `
      SELECT 
        p.*, 
        u.username, 
        u.profile_picture AS avatar_url,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) AS comment_count,
        (SELECT COUNT(*) FROM postreactions pr WHERE pr.post_id = p.post_id) AS reaction_count
      FROM posts p
      JOIN users u ON p.user_id = u.UserID
    `;
    
    let whereClauses = [];
    let queryParams = [];
    
    if (cursor) {
      whereClauses.push('p.post_id < ?');
      queryParams.push(cursor);
    }
    
    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    baseQuery += ` ORDER BY p.post_id DESC LIMIT ${limit + 1}`;
    
    const posts = await query(baseQuery, queryParams);
    
    let hasMore = false;
    let nextCursor = null;
    
    if (posts.length > limit) {
      hasMore = true;
      posts.pop();
    }
    
    if (posts.length > 0) {
      nextCursor = posts[posts.length - 1].post_id;
    }
    
    res.json({
      data: posts,
      pagination: {
        hasMore,
        nextCursor
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
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

app.put('/api/posts/:id', upload.single('media'), async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const { content, userId } = req.body;

    const [existingPost] = await connection.execute(
      'SELECT * FROM posts WHERE post_id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingPost.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this post or post not found' });
    }

    let mediaUrl = existingPost[0].media_url;
    let shouldDeleteOldMedia = false;
    if (req.file) {
      shouldDeleteOldMedia = !!existingPost[0].media_url;
      const filename = path.basename(req.file.path);
      const type = req.file.mimetype.split('/')[0];
      const subfolder = ['image', 'video', 'audio'].includes(type) ? `${type}s` : 'documents';
      mediaUrl = `/uploads/${subfolder}/${filename}`;
    }

    await connection.execute(
      'UPDATE posts SET content = ?, media_url = ? WHERE post_id = ?',
      [content || null, mediaUrl || null, id]
    );
    if (shouldDeleteOldMedia && existingPost[0].media_url) {
      const oldFilePath = path.join(__dirname, existingPost[0].media_url);
      fs.unlink(oldFilePath, err => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to delete old media file:', err);
        }
      });
    }

    const [updatedPost] = await connection.execute(`
      SELECT p.*, u.username, u.profile_picture as avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.UserID
      WHERE p.post_id = ?
    `, [id]);

    await connection.commit();
    res.json(updatedPost[0]);
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

    console.error('Error updating post:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update post',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.body.userId; 

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // First get post to verify ownership and find media to delete
    const [post] = await connection.execute(
      'SELECT * FROM posts WHERE post_id = ? AND user_id = ?',
      [id, userId]
    );

    if (post.length === 0) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }

    if (post[0].media_url) {
      const filePath = path.join(__dirname, post[0].media_url);
      fs.unlink(filePath, err => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to delete media file:', err);
        }
      });
    }

    await connection.execute('DELETE FROM posts WHERE post_id = ?', [id]);

    await connection.commit();
    res.status(204).end();
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  } finally {
    if (connection) connection.release();
  }
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});