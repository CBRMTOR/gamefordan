const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const PORT = 5022;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Vivaa'
};

const pool = mysql.createPool(dbConfig);

app.get('/api/posts', async (req, res) => {
  try {
    const [posts] = await pool.execute(`
      SELECT p.*, u.username, u.profile_pic, 
      (SELECT COUNT(*) FROM postreactions pr WHERE pr.post_id = p.post_id) AS reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) AS comment_count,
      (SELECT COUNT(*) FROM postshares ps WHERE ps.post_id = p.post_id) AS share_count
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      ORDER BY p.created_at DESC
    `);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', async (req, res) => {
  const { user_id, group_id, content, media_url } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, group_id, content, media_url) VALUES (?, ?, ?, ?)',
      [user_id, group_id, content, media_url]
    );
    const [post] = await pool.execute(
      'SELECT p.*, u.username, u.profile_pic FROM posts p JOIN users u ON p.user_id = u.user_id WHERE p.post_id = ?',
      [result.insertId]
    );
    res.status(201).json(post[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.post('/api/reactions', async (req, res) => {
  const { post_id, user_id, reaction_type } = req.body;
  try {
    const [existing] = await pool.execute(
      'SELECT * FROM postreactions WHERE post_id = ? AND user_id = ?',
      [post_id, user_id]
    );
    
    if (existing.length > 0) {
      await pool.execute(
        'UPDATE postreactions SET reaction_type = ? WHERE reaction_id = ?',
        [reaction_type, existing[0].reaction_id]
      );
    } else {
      await pool.execute(
        'INSERT INTO postreactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [post_id, user_id, reaction_type]
      );
    }
    
    const [reactions] = await pool.execute(
      'SELECT COUNT(*) AS count FROM postreactions WHERE post_id = ?',
      [post_id]
    );
    
    res.json({ count: reactions[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const [comments] = await pool.execute(`
      SELECT c.*, u.username, u.profile_pic 
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `, [req.params.postId]);
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', async (req, res) => {
  const { post_id, user_id, content, parent_id } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [post_id, user_id, content, parent_id]
    );
    const [comment] = await pool.execute(
      'SELECT c.*, u.username, u.profile_pic FROM comments c JOIN users u ON c.user_id = u.user_id WHERE c.comment_id = ?',
      [result.insertId]
    );
    res.status(201).json(comment[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/quizzes/:quizId/attempt', async (req, res) => {
  const { quizId } = req.params;
  const { user_id, answers } = req.body;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [attemptResult] = await connection.execute(
      'INSERT INTO quizattempts (quiz_id, user_id) VALUES (?, ?)',
      [quizId, user_id]
    );
    const attemptId = attemptResult.insertId;

    let correctAnswers = 0;
    const answerPromises = answers.map(async (answer) => {
      const [question] = await connection.execute(
        'SELECT * FROM questions WHERE question_id = ?',
        [answer.question_id]
      );
      
      let isCorrect = false;
      
      if (question[0].type === 'multiple_choice') {
        const [option] = await connection.execute(
          'SELECT * FROM options WHERE option_id = ? AND question_id = ?',
          [answer.answer, answer.question_id]
        );
        isCorrect = option[0]?.is_correct === 1;
      } else {
        isCorrect = answer.answer.toLowerCase() === question[0].correct_answer.toLowerCase();
      }

      if (isCorrect) correctAnswers++;
      
      await connection.execute(
        'INSERT INTO answers (attempt_id, question_id, selected_option, written_answer, is_correct) VALUES (?, ?, ?, ?, ?)',
        [attemptId, answer.question_id, 
         answer.answer.match(/^\d+$/) ? answer.answer : null,
         !answer.answer.match(/^\d+$/) ? answer.answer : null,
         isCorrect ? 1 : 0]
      );
    });

    await Promise.all(answerPromises);
    
    const score = (correctAnswers / answers.length) * 100;
    
    await connection.execute(
      'UPDATE quizattempts SET completed_at = NOW(), score = ? WHERE attempt_id = ?',
      [score, attemptId]
    );

    await connection.commit();
    res.json({ score });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Quiz submission error:', err);
    res.status(500).json({ 
      error: 'Failed to submit quiz',
      details: err.message
    });
  } finally {
    if (connection) connection.release();
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));