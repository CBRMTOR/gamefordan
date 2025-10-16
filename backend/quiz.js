require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT_USER_QUIZ;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS.split(','),
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Vivaa',
  waitForConnections: true,
  connectionLimit: 20
});

const cache = {};
const cacheMiddleware = (key, ttl = 60) => (req, res, next) => {
  if (req.query.timestamp || req.query.bypassCache) {
    return next();
  }
  
  const cacheKey = `${key}_${JSON.stringify(req.query)}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < ttl * 1000) {
    return res.json(cache[cacheKey].data);
  }
  
  res.sendResponse = res.json;
  res.json = (data) => {
    cache[cacheKey] = { data, timestamp: Date.now() };
    res.sendResponse(data);
  };
  next();
};

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});

const isQuizActive = (quiz) => {
  const now = new Date();
  const activeFrom = quiz.active_from ? new Date(quiz.active_from) : null;
  const activeTo = quiz.active_to ? new Date(quiz.active_to) : null;
  
  if (!activeFrom && !activeTo) return true;
  
  const isAfterStart = !activeFrom || now >= activeFrom;
  const isBeforeEnd = !activeTo || now <= activeTo;
  
  return isAfterStart && isBeforeEnd;
};

app.get('/api/quizzes', cacheMiddleware('quizzes', 5), async (req, res) => {
  try {
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
    const offset = (page - 1) * limit;
    const { userId, search = '' } = req.query;

    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const searchPattern = `%${search}%`;

    const [quizzes] = await pool.execute(
      `SELECT q.*, 
       (SELECT COUNT(*) FROM quizattempts WHERE quiz_id = q.quiz_id AND user_id = ? AND completed_at IS NOT NULL) AS attempted,
       (SELECT attempt_id FROM quizattempts WHERE quiz_id = q.quiz_id AND user_id = ? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1) AS attempt_id
       FROM quizzes q
       WHERE q.is_active = 1 
       AND (q.title LIKE ? OR q.description LIKE ?)
       ORDER BY q.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId, userId, searchPattern, searchPattern]
    );

    const [[count]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM quizzes 
       WHERE is_active = 1 AND (title LIKE ? OR description LIKE ?)`,
      [searchPattern, searchPattern]
    );

    const now = new Date();
    const enhancedQuizzes = quizzes.map(quiz => {
      const activeFrom = quiz.active_from ? new Date(quiz.active_from) : null;
      const activeTo = quiz.active_to ? new Date(quiz.active_to) : null;
      const isActive = isQuizActive(quiz);
      
      return {
        ...quiz,
        is_active_now: isActive,
        active_from: activeFrom,
        active_to: activeTo,
        time_until_active: !isActive && activeFrom && now < activeFrom ? 
          Math.max(0, activeFrom.getTime() - now.getTime()) : 0,
        time_until_expired: isActive && activeTo && now < activeTo ? 
          Math.max(0, activeTo.getTime() - now.getTime()) : 0
      };
    });

    res.json({
      data: enhancedQuizzes,
      pagination: {
        total: count.total,
        page,
        limit,
        totalPages: Math.ceil(count.total / limit)
      }
    });
  } catch (err) {
    console.error('Quiz fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    const quizId = req.params.id;

    const [quiz] = await pool.execute(
      'SELECT * FROM quizzes WHERE quiz_id = ? AND is_active = 1',
      [quizId]
    );
    if (quiz.length === 0) return res.status(404).json({ error: 'Quiz not found' });

    const quizData = quiz[0];
    const isActive = isQuizActive(quizData);
    
    if (!isActive) {
      const now = new Date();
      const activeFrom = quizData.active_from ? new Date(quizData.active_from) : null;
      
      if (activeFrom && now < activeFrom) {
        return res.status(403).json({ 
          error: 'This quiz is not yet available',
          available_at: activeFrom.toISOString(),
          time_until_active: Math.max(0, activeFrom.getTime() - now.getTime())
        });
      } else {
        return res.status(403).json({ 
          error: 'This quiz has expired',
          expired: true
        });
      }
    }

    const [questions] = await pool.execute(
      `SELECT * FROM questions 
       WHERE quiz_id = ? 
       AND type IN ('multiple_choice', 'true_false', 'short_answer')
       ORDER BY display_order`,
      [quizId]
    );

    const enhancedQuestions = await Promise.all(questions.map(async (question) => {
      const questionData = { ...question };
      
      if (question.metadata) {
        try {
          questionData.metadata = JSON.parse(question.metadata);
        } catch (e) {
          questionData.metadata = {};
        }
      }

      switch (question.type) {
        case 'multiple_choice':
          const [options] = await pool.execute(
            'SELECT * FROM options WHERE question_id = ? ORDER BY order_position',
            [question.question_id]
          );
          questionData.options = options;
          break;
          
        case 'true_false':
        case 'short_answer':
          break;
      }
      
      return questionData;
    }));

    res.json({ 
      ...quizData, 
      questions: enhancedQuestions,
      totalQuestions: enhancedQuestions.length,
      is_active_now: true,
      active_from: quizData.active_from ? new Date(quizData.active_from) : null,
      active_to: quizData.active_to ? new Date(quizData.active_to) : null
    });
  } catch (err) {
    console.error('Quiz details error:', err);
    res.status(500).json({ error: 'Failed to load quiz details' });
  }
});

app.post('/api/quizzes/:id/start', async (req, res) => {
  const { user_id } = req.body;
  const quizId = req.params.id;

  try {
    const [quiz] = await pool.execute(
      'SELECT * FROM quizzes WHERE quiz_id = ? AND is_active = 1',
      [quizId]
    );
    if (quiz.length === 0) return res.status(404).json({ error: 'Quiz not found or inactive' });

    const quizData = quiz[0];
    const now = new Date();
    
    const activeFrom = quizData.active_from ? new Date(quizData.active_from) : null;
    const activeTo = quizData.active_to ? new Date(quizData.active_to) : null;
    
    const isAfterStart = !activeFrom || now >= activeFrom;
    const isBeforeEnd = !activeTo || now <= activeTo;
    const isActive = isAfterStart && isBeforeEnd;
    
    if (!isActive) {
      if (activeFrom && now < activeFrom) {
        return res.status(403).json({ 
          error: 'This quiz is not yet available',
          available_at: activeFrom.toISOString(),
          time_until_active: Math.max(0, activeFrom.getTime() - now.getTime())
        });
      } else {
        return res.status(403).json({ 
          error: 'This quiz has expired',
          expired: true
        });
      }
    }

    const [completedAttempts] = await pool.execute(
      `SELECT attempt_id FROM quizattempts 
       WHERE quiz_id = ? AND user_id = ? AND completed_at IS NOT NULL`,
      [quizId, user_id]
    );

    if (completedAttempts.length > 0) {
      return res.status(403).json({ 
        error: 'You have already completed this quiz and cannot restart it',
        attempted: true
      });
    }

    const [incompleteAttempts] = await pool.execute(
      `SELECT attempt_id, started_at FROM quizattempts 
       WHERE quiz_id = ? AND user_id = ? AND completed_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
      [quizId, user_id]
    );

    if (incompleteAttempts.length > 0) {
            const attemptStartTime = new Date(incompleteAttempts[0].started_at);
      const timeElapsed = now - attemptStartTime;
      
      if (quizData.duration_minutes && timeElapsed > quizData.duration_minutes * 60000) {
        await pool.execute(
          `UPDATE quizattempts SET 
           completed_at = ?, 
           score = 0,
           last_activity_at = ?
           WHERE attempt_id = ?`,
          [attemptStartTime, attemptStartTime, incompleteAttempts[0].attempt_id]
        );
      } else {
        return res.status(200).json({ 
          attempt_id: incompleteAttempts[0].attempt_id,
          message: 'Resuming incomplete attempt' 
        });
      }
    }    const startTime = new Date();
    const [result] = await pool.execute(
      `INSERT INTO quizattempts (quiz_id, user_id, started_at, last_activity_at) 
       VALUES (?, ?, ?, ?)`,
      [quizId, user_id, startTime, startTime]
    );

    res.status(201).json({ 
      attempt_id: result.insertId,
      started_at: startTime.toISOString(),
      message: 'Quiz attempt started successfully'
    });
  } catch (err) {
    console.error('Start attempt error:', err);
    res.status(500).json({ error: 'Failed to start quiz attempt' });
  }
});

app.post('/api/quizzes/:id/attempt', async (req, res) => {
  const { user_id, answers, attempt_id, total_hints_used } = req.body;
  const quizId = req.params.id;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
        const [attempt] = await connection.execute(
      `SELECT qa.*, q.duration_minutes 
       FROM quizattempts qa
       JOIN quizzes q ON qa.quiz_id = q.quiz_id
       WHERE qa.attempt_id = ? AND qa.user_id = ? AND qa.quiz_id = ? AND qa.completed_at IS NULL`,
      [attempt_id, user_id, quizId]
    );

    if (attempt.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        error: 'Valid attempt not found or already completed',
        code: 'ATTEMPT_NOT_FOUND'
      });
    }

    const attemptData = attempt[0];
    const startTime = new Date(attemptData.started_at);
    const submissionTime = new Date();
    
    if (attemptData.duration_minutes) {
      const timeElapsed = (submissionTime - startTime) / 60000;
      const GRACE_PERIOD = 0.5;
      
      if (timeElapsed > attemptData.duration_minutes + GRACE_PERIOD) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Time limit exceeded for this quiz attempt',
          code: 'TIME_LIMIT_EXCEEDED',
          time_elapsed: Math.round(timeElapsed * 100) / 100,
          time_limit: attemptData.duration_minutes
        });
      }
    }
    
    const hasValidAnswers = answers && Array.isArray(answers) &&
      answers.some(answer => answer.answer && answer.answer.toString().trim() !== '');

    if (!hasValidAnswers) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'At least one answer must be provided to complete the quiz',
        code: 'NO_ANSWERS_PROVIDED'
      });
    }
    
    const [questions] = await connection.execute(
      `SELECT question_id, type, correct_answer FROM questions 
       WHERE quiz_id = ?`,
      [quizId]
    );
    const totalQuizQuestions = questions.length;
    const questionMap = new Map(questions.map(q => [q.question_id, q]));

    const answeredQuestionIds = new Set(answers.map(a => a.question_id));
    let correctAnswers = 0;

    const answerPromises = answers.map(async answer => {
      const question = questionMap.get(answer.question_id);
      if (!question) return;

      let isCorrect = false;
      let answerValue = null;

      switch (question.type) {
        case 'multiple_choice':
          const [option] = await connection.execute(
            `SELECT is_correct, option_text FROM options 
             WHERE option_id = ? AND question_id = ?`,
            [answer.answer, answer.question_id]
          );
          if (option.length > 0) {
            isCorrect = option[0].is_correct;
            answerValue = answer.answer;
          }
          break;

        case 'true_false':
          isCorrect = answer.answer.toLowerCase() === question.correct_answer.toLowerCase();
          answerValue = answer.answer;
          break;

        case 'short_answer':
          isCorrect = answer.answer.trim().toLowerCase() === 
                     question.correct_answer.trim().toLowerCase();
          answerValue = answer.answer;
          break;
      }

      if (isCorrect) correctAnswers++;

      await connection.execute(
        `INSERT INTO answers (
          attempt_id, question_id, selected_option, 
          written_answer, is_correct, attempts, hints_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          attempt_id, 
          answer.question_id,
          question.type === 'multiple_choice' ? answerValue : null,
          question.type === 'short_answer' || question.type === 'true_false' ? answerValue : null,
          isCorrect,
          answer.attempts || 1,
          answer.hints_used || 0
        ]
      );
    });

    await Promise.all(answerPromises);

    const score = totalQuizQuestions > 0
      ? Math.round((correctAnswers / totalQuizQuestions) * 100)
      : 0;
    await connection.execute(
      `UPDATE quizattempts SET 
       total_hints_used = ?,
       completed_at = ?, 
       score = ?,
       last_activity_at = ?
       WHERE attempt_id = ?`,
      [total_hints_used || 0, submissionTime, score, submissionTime, attempt_id]
    );

    await connection.commit();

    const unansweredQuestions = totalQuizQuestions - answeredQuestionIds.size;

    res.json({ 
      score,
      correctAnswers,
      totalQuestions: totalQuizQuestions,
      unansweredQuestions,
      totalHintsUsed: total_hints_used || 0,
      submission_time: submissionTime.toISOString(),
      time_taken: Math.round((submissionTime - startTime) / 1000), // in seconds
      message: 'Quiz submitted successfully'
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Quiz submission error:', err);
    res.status(500).json({ 
      error: 'Failed to submit quiz',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/quizzes/:id/complete-empty', async (req, res) => {
  const { user_id, attempt_id } = req.body;
  const quizId = req.params.id;

  try {
    const [attempt] = await pool.execute(
      `SELECT qa.*, q.duration_minutes 
       FROM quizattempts qa
       JOIN quizzes q ON qa.quiz_id = q.quiz_id
       WHERE qa.attempt_id = ? AND qa.user_id = ? AND qa.quiz_id = ? AND qa.completed_at IS NULL`,
      [attempt_id, user_id, quizId]
    );

    if (attempt.length === 0) {
      return res.status(404).json({ error: 'Valid attempt not found' });
    }

    const attemptData = attempt[0];
    const startTime = new Date(attemptData.started_at);
    const submissionTime = new Date(); 
    if (attemptData.duration_minutes) {
      const timeElapsed = (submissionTime - startTime) / 60000;
      const GRACE_PERIOD = 0.5;
      
      if (timeElapsed > attemptData.duration_minutes + GRACE_PERIOD) {
        return res.status(400).json({ 
          error: 'Time limit exceeded',
          code: 'TIME_LIMIT_EXCEEDED'
        });
      }
    }

    await pool.execute(
      `UPDATE quizattempts SET 
       completed_at = ?, 
       score = 0,
       last_activity_at = ?
       WHERE attempt_id = ?`,
      [submissionTime, submissionTime, attempt_id]
    );

    res.json({ 
      message: 'Quiz marked as completed (no answers provided)',
      score: 0,
      submission_time: submissionTime.toISOString()
    });
  } catch (err) {
    console.error('Empty completion error:', err);
    res.status(500).json({ error: 'Failed to complete quiz' });
  }
});

app.get('/api/users/:userId/attempts', async (req, res) => {
  try {
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
    const offset = (page - 1) * limit;
    const userId = req.params.userId;

    const [attempts] = await pool.execute(
      `SELECT qa.*, q.title AS quiz_title, q.description AS quiz_description,
       (SELECT COUNT(*) FROM answers a WHERE a.attempt_id = qa.attempt_id AND a.is_correct = 1) AS correct_answers,
       (SELECT COUNT(*) FROM answers a WHERE a.attempt_id = qa.attempt_id) AS total_questions
       FROM quizattempts qa
       JOIN quizzes q ON qa.quiz_id = q.quiz_id
       WHERE qa.user_id = ? AND qa.completed_at IS NOT NULL
       ORDER BY qa.completed_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );

    const [[count]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM quizattempts WHERE user_id = ? AND completed_at IS NOT NULL`,
      [userId]
    );

    res.json({
      data: attempts,
      pagination: {
        total: count.total,
        page,
        limit,
        totalPages: Math.ceil(count.total / limit)
      }
    });
  } catch (err) {
    console.error('Attempts fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

app.get('/api/attempts/:attemptId', async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const [attempt] = await pool.execute(
      `SELECT qa.*, q.title AS quiz_title, q.description AS quiz_description,
       q.duration_minutes, q.instructions
       FROM quizattempts qa
       JOIN quizzes q ON qa.quiz_id = q.quiz_id
       WHERE qa.attempt_id = ? AND qa.user_id = ?`,
      [attemptId, userId]
    );

    if (attempt.length === 0) return res.status(404).json({ error: 'Attempt not found' });

    const [answers] = await pool.execute(
      `SELECT a.*, q.question_text, q.type, q.correct_answer,
       o.option_text AS selected_option_text
       FROM answers a
       JOIN questions q ON a.question_id = q.question_id
       LEFT JOIN options o ON a.selected_option = o.option_id
       WHERE a.attempt_id = ?
       ORDER BY q.display_order`,
      [attemptId]
    );

    res.json({
      ...attempt[0],
      answers: answers,
      duration: attempt[0].duration_minutes ? 
        `${attempt[0].duration_minutes} minutes` : 'No time limit'
    });
  } catch (err) {
    console.error('Attempt details error:', err);
    res.status(500).json({ error: 'Failed to fetch attempt details' });
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

const server = app.listen(PORT, () => {
  console.log(`Quiz backend running on http://localhost:${PORT}`);
});


process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end(() => {
      console.log('Database connection pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end(() => {
      console.log('Database connection pool closed');
      process.exit(0);
    });
  });
});