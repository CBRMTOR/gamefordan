require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT_LEADERBOARD;

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
};
app.use(cors(corsOptions));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20
});

app.get('/user/:userId/stats', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const [userStats] = await pool.execute(
      `
      SELECT 
        u.UserID as user_id,
        u.Username as username,
        COUNT(DISTINCT qa.attempt_id) as quizzes_taken,
        COALESCE(SUM(qa.score), 0) as total_score,
        COUNT(DISTINCT qa.quiz_id) as unique_quizzes_completed,
        COALESCE(AVG(qa.score), 0) as average_score
      FROM users u
      LEFT JOIN quizattempts qa ON u.UserID = qa.user_id AND qa.completed_at IS NOT NULL
      WHERE u.UserID = ?
      GROUP BY u.UserID, u.Username
      `,
      [userId]
    );

    if (userStats.length === 0) {
      return res.json({
        user_id: userId,
        quizzes_taken: 0,
        total_score: 0,
        unique_quizzes_completed: 0,
        average_score: 0
      });
    }

    res.json(userStats[0]);
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: 'Failed to load user statistics' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const [results] = await pool.execute(`
      SELECT 
        ranked.attempt_id,
        ranked.quiz_id,
        ranked.quiz_title,
        ranked.user_id,
        ranked.username,
        ranked.score,
        ranked.started_at,
        ranked.completed_at,
        ranked.duration_seconds,
        ranked.avg_attempts_per_question,
        ranked.avg_hints_per_question,
        ranked.rank
      FROM (
        SELECT 
          qa.attempt_id,
          qa.quiz_id,
          q.title AS quiz_title,
          qa.user_id,
          u.Username AS username,
          qa.score,
          qa.started_at,
          qa.completed_at,
          TIMESTAMPDIFF(SECOND, qa.started_at, qa.completed_at) AS duration_seconds,
          -- Calculate averages instead of sums for more meaningful metrics
          ROUND(AVG(a.attempts), 2) AS avg_attempts_per_question,
          ROUND(AVG(a.hints_used), 2) AS avg_hints_per_question,
          ROW_NUMBER() OVER (
            PARTITION BY qa.quiz_id 
            ORDER BY 
              qa.score DESC, -- Highest score first
              -- Only consider time for valid attempts within time limit
              CASE 
                WHEN q.duration_minutes IS NULL OR 
                     TIMESTAMPDIFF(MINUTE, qa.started_at, qa.completed_at) <= q.duration_minutes 
                THEN TIMESTAMPDIFF(SECOND, qa.started_at, qa.completed_at)
                ELSE 999999 -- Penalize time-exceeded attempts with very high duration
              END ASC,
              AVG(a.hints_used) ASC -- Fewer hints for same scores and duration
          ) AS \`rank\`
        FROM quizattempts qa
        JOIN quizzes q ON qa.quiz_id = q.quiz_id
        JOIN users u ON qa.user_id = u.UserID
        LEFT JOIN answers a ON qa.attempt_id = a.attempt_id
        WHERE qa.completed_at IS NOT NULL -- Only include completed attempts
          AND qa.score IS NOT NULL -- Ensure score is calculated
        GROUP BY qa.attempt_id, qa.quiz_id, q.title, qa.user_id, u.Username, 
                 qa.score, qa.started_at, qa.completed_at, q.duration_minutes
      ) AS ranked
      WHERE ranked.rank <= 100 -- Limit to top 100 per quiz
      ORDER BY ranked.quiz_id, ranked.rank;
    `);
    
    res.json(results);
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
  }
});

app.get('/api/leaderboard/user/:userId/stats', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const [userStats] = await pool.execute(
      `
      SELECT 
        u.UserID as user_id,
        u.Username as username,
        COUNT(DISTINCT qa.attempt_id) as quizzes_taken,
        COALESCE(SUM(qa.score), 0) as total_score,
        COUNT(DISTINCT qa.quiz_id) as unique_quizzes_completed,
        COALESCE(AVG(qa.score), 0) as average_score,
        -- Add more meaningful stats
        COUNT(CASE WHEN qa.score >= 90 THEN 1 END) as excellent_scores,
        COUNT(CASE WHEN qa.score >= 70 AND qa.score < 90 THEN 1 END) as good_scores,
        COUNT(CASE WHEN qa.score < 70 THEN 1 END) as needs_improvement
      FROM users u
      LEFT JOIN quizattempts qa ON u.UserID = qa.user_id AND qa.completed_at IS NOT NULL
      WHERE u.UserID = ?
      GROUP BY u.UserID, u.Username
      `,
      [userId]
    );

    if (userStats.length === 0) {
      return res.json({
        user_id: userId,
        quizzes_taken: 0,
        total_score: 0,
        unique_quizzes_completed: 0,
        average_score: 0,
        excellent_scores: 0,
        good_scores: 0,
        needs_improvement: 0
      });
    }

    res.json(userStats[0]);
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: 'Failed to load user statistics' });
  }
});

app.get('/api/leaderboard/user/:userId/quiz/:quizId', async (req, res) => {
  try {
    const { userId, quizId } = req.params;
    
    const [userRanking] = await pool.execute(`
      SELECT * FROM (
        SELECT 
          qa.attempt_id,
          qa.quiz_id,
          q.title AS quiz_title,
          qa.user_id,
          u.Username AS username,
          qa.score,
          qa.started_at,
          qa.completed_at,
          TIMESTAMPDIFF(SECOND, qa.started_at, qa.completed_at) AS duration_seconds,
          ROUND(AVG(a.attempts), 2) AS avg_attempts_per_question,
          ROUND(AVG(a.hints_used), 2) AS avg_hints_per_question,
          ROW_NUMBER() OVER (
            PARTITION BY qa.quiz_id 
            ORDER BY 
              qa.score DESC,
              CASE 
                WHEN q.duration_minutes IS NULL OR 
                     TIMESTAMPDIFF(MINUTE, qa.started_at, qa.completed_at) <= q.duration_minutes 
                THEN TIMESTAMPDIFF(SECOND, qa.started_at, qa.completed_at)
                ELSE 999999
              END ASC,
              AVG(a.hints_used) ASC
          ) AS \`rank\`
        FROM quizattempts qa
        JOIN quizzes q ON qa.quiz_id = q.quiz_id
        JOIN users u ON qa.user_id = u.UserID
        LEFT JOIN answers a ON qa.attempt_id = a.attempt_id
        WHERE qa.completed_at IS NOT NULL 
          AND qa.score IS NOT NULL
          AND qa.quiz_id = ?
        GROUP BY qa.attempt_id
      ) AS ranked
      WHERE ranked.user_id = ?
      ORDER BY ranked.rank
      LIMIT 1
    `, [quizId, userId]);

    if (userRanking.length === 0) {
      return res.status(404).json({ 
        error: 'No completed attempts found for this user and quiz',
        user_id: userId,
        quiz_id: quizId
      });
    }

    res.json(userRanking[0]);
  } catch (err) {
    console.error('User quiz ranking error:', err);
    res.status(500).json({ error: 'Failed to fetch user ranking' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Connected'
  });
});

app.listen(PORT, () => {
  console.log(`Leaderboard service running on http://localhost:${PORT}`);
});