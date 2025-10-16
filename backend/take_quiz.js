require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const PORT = 5044;

app.use(express.json());

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'fixed'
};

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

const pool = mysql.createPool(dbConfig);

const validateMetadata = (metadata) => {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch (e) {
    return null;
  }
};

// Get active quizzes
app.get('/api/quizzes/active', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM quizzes WHERE is_active = 1 ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active quizzes' });
  }
});

app.get('/api/quizzes/:quizId/questions', async (req, res) => {
  try {
    const [questions] = await pool.execute(
      `SELECT * FROM questions WHERE quiz_id = ? ORDER BY display_order, question_id`,
      [req.params.quizId]
    );

    const enhancedQuestions = await Promise.all(
      questions.map(async (question) => {
        const metadata = validateMetadata(question.metadata);
        
        switch (question.type) {
          case 'multiple_choice':
            const [options] = await pool.execute(
              'SELECT * FROM options WHERE question_id = ? ORDER BY option_id',
              [question.question_id]
            );
            return { ...question, options, metadata };
          
          case 'matching':
            const [pairs] = await pool.execute(
              'SELECT * FROM question_pairs WHERE question_id = ?',
              [question.question_id]
            );
            return { ...question, pairs, metadata };
            
          default:
            return { ...question, metadata };
        }
      })
    );

    res.json(enhancedQuestions);
  } catch (err) {
    console.error('Failed to fetch questions:', err);
    res.status(500).json({ 
      error: 'Failed to fetch questions',
      details: err.message
    });
  }
});

app.post('/api/quiz-attempts', async (req, res) => {
  const { quiz_id, user_id } = req.body;
  
  try {
    
    const [quiz] = await pool.execute(
      'SELECT * FROM quizzes WHERE quiz_id = ? AND is_active = 1',
      [quiz_id]
    );
    
    if (quiz.length === 0) {
      return res.status(404).json({ error: 'Quiz not found or inactive' });
    }
    
    const [user] = await pool.execute(
      'SELECT UserID FROM users WHERE UserID = ?',
      [user_id]
    );
    
    if (user.length === 0) {
      return res.status(400).json({ error: 'Invalid user' });
    }
    
    await pool.execute(
      'DELETE FROM quizattempts WHERE quiz_id = ? AND user_id = ? AND completed_at IS NULL',
      [quiz_id, user_id]
    );
    
    const [result] = await pool.execute(
      'INSERT INTO quizattempts (quiz_id, user_id) VALUES (?, ?)',
      [quiz_id, user_id]
    );
    
    res.status(201).json({ 
      attempt_id: result.insertId,
      quiz: quiz[0]
    });
  } catch (err) {
    console.error('Quiz attempt creation error:', err);
    res.status(500).json({ error: 'Failed to start quiz attempt' });
  }
});

app.post('/api/quiz-attempts/:attemptId/progress', async (req, res) => {
  const { attemptId } = req.params;
  const { questionId, answer, hintsUsed, attempts } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [attempt] = await connection.execute(
      'SELECT * FROM quizattempts WHERE attempt_id = ? AND completed_at IS NULL',
      [attemptId]
    );
    
    if (attempt.length === 0) {
      return res.status(404).json({ error: 'Attempt not found or already completed' });
    }
    
    const [question] = await connection.execute(
      'SELECT * FROM questions WHERE question_id = ? AND quiz_id = ?',
      [questionId, attempt[0].quiz_id]
    );
    
    if (question.length === 0) {
      return res.status(400).json({ error: 'Invalid question for this quiz' });
    }
        const [existingAnswer] = await connection.execute(
      'SELECT * FROM answers WHERE attempt_id = ? AND question_id = ?',
      [attemptId, questionId]
    );
    
    if (existingAnswer.length > 0) {
      await connection.execute(
        `UPDATE answers SET 
          selected_option = ?,
          written_answer = ?,
          attempts = ?,
          hints_used = ?,
          updated_at = NOW()
        WHERE answer_id = ?`,
        [
          answer.selected_option || null,
          answer.written_answer || null,
          attempts || 1,
          hintsUsed || 0,
          existingAnswer[0].answer_id
        ]
      );
    } else {
      // Insert new answer
      await connection.execute(
        `INSERT INTO answers (
          attempt_id, 
          question_id, 
          selected_option, 
          written_answer,
          attempts,
          hints_used
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          attemptId,
          questionId,
          answer.selected_option || null,
          answer.written_answer || null,
          attempts || 1,
          hintsUsed || 0
        ]
      );
    }
    
    await connection.execute(
      'UPDATE quizattempts SET last_activity_at = NOW() WHERE attempt_id = ?',
      [attemptId]
    );
    
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Progress save error:', err);
    res.status(500).json({ error: 'Failed to save progress' });
  } finally {
    if (connection) connection.release();
  }
});
app.get('/api/quiz-attempts/:attemptId/recover', async (req, res) => {
  const { attemptId } = req.params;
  
  try {
    const [attempt] = await pool.execute(
      'SELECT * FROM quizattempts WHERE attempt_id = ? AND completed_at IS NULL',
      [attemptId]
    );
    
    if (attempt.length === 0) {
      return res.status(404).json({ error: 'Attempt not found or already completed' });
    }
        const [quiz] = await pool.execute(
      'SELECT * FROM quizzes WHERE quiz_id = ?',
      [attempt[0].quiz_id]
    );
    
    if (quiz.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const [questions] = await pool.execute(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY display_order',
      [attempt[0].quiz_id]
    );
    
    const [answers] = await pool.execute(
      'SELECT * FROM answers WHERE attempt_id = ?',
      [attemptId]
    );
    const response = {
      attempt: attempt[0],
      quiz: quiz[0],
      questions: await Promise.all(questions.map(async q => {
        const answer = answers.find(a => a.question_id === q.question_id);
        const metadata = validateMetadata(q.metadata);
        
        let enhancedQuestion = { ...q, metadata };
        
        if (q.type === 'multiple_choice') {
          const [options] = await pool.execute(
            'SELECT * FROM options WHERE question_id = ? ORDER BY option_id',
            [q.question_id]
          );
          enhancedQuestion.options = options;
        } else if (q.type === 'matching') {
          const [pairs] = await pool.execute(
            'SELECT * FROM question_pairs WHERE question_id = ?',
            [q.question_id]
          );
          enhancedQuestion.pairs = pairs;
        }
        
        return {
          ...enhancedQuestion,
          savedAnswer: answer ? {
            selected_option: answer.selected_option,
            written_answer: answer.written_answer,
            attempts: answer.attempts,
            hints_used: answer.hints_used
          } : null
        };
      }))
    };
    
    res.json(response);
  } catch (err) {
    console.error('Session recovery error:', err);
    res.status(500).json({ error: 'Failed to recover quiz session' });
  }
});


app.post('/api/questions/:questionId/feedback', async (req, res) => {
  const { questionId } = req.params;
  const { answer } = req.body;
  
  try {
    
    const [question] = await pool.execute(
      'SELECT * FROM questions WHERE question_id = ?',
      [questionId]
    );
    
    if (question.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    let isCorrect = false;
    let feedback = '';
    let correctAnswer = '';
    
    switch (question[0].type) {
      case 'multiple_choice':
        if (answer.selected_option) {
          const [option] = await pool.execute(
            'SELECT * FROM options WHERE option_id = ?',
            [answer.selected_option]
          );
          isCorrect = option[0]?.is_correct === 1;
          if (!isCorrect) {
            const [correctOption] = await pool.execute(
              'SELECT * FROM options WHERE question_id = ? AND is_correct = 1',
              [questionId]
            );
            correctAnswer = correctOption[0]?.option_text || '';
          }
        }
        break;
        
      case 'true_false':
        isCorrect = answer.written_answer === question[0].correct_answer;
        correctAnswer = question[0].correct_answer;
        break;
        
      case 'short_answer':
        
        isCorrect = false;
        correctAnswer = question[0].correct_answer;
        break;
        
      default:
        isCorrect = false;
    }
    
    feedback = isCorrect 
      ? question[0].feedback_correct || 'Correct!'
      : question[0].feedback_incorrect || 'Incorrect. Please try again.';
    
    res.json({
      isCorrect,
      feedback,
      correctAnswer,
      maxAttempts: question[0].max_attempts
    });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});


app.post('/api/quiz-attempts/:attemptId/submit', async (req, res) => {
  const { attemptId } = req.params;
  const { answers } = req.body;
  let connection;
  
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers should be an array' });
  }

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const [attempt] = await connection.execute(
      'SELECT * FROM quizattempts WHERE attempt_id = ?',
      [attemptId]
    );
    
    if (attempt.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    if (attempt[0].completed_at) {
      return res.status(400).json({ error: 'Attempt already completed' });
    }
    
    const [questions] = await connection.execute(
      'SELECT * FROM questions WHERE quiz_id = ?',
      [attempt[0].quiz_id]
    );
    
    let totalPoints = 0;
    let correctAnswers = 0;
    
    for (const answer of answers) {
      const question = questions.find(q => q.question_id === answer.question_id);
      if (!question) continue;
      
      let isCorrect = false;
      
      switch (question.type) {
        case 'multiple_choice':
          
          if (answer.selected_option) {
            const [option] = await connection.execute(
              'SELECT is_correct FROM options WHERE option_id = ?',
              [answer.selected_option]
            );
            isCorrect = option[0]?.is_correct === 1;
          }
          break;
          
        case 'true_false':
          isCorrect = answer.written_answer === question.correct_answer;
          break;
          
        default:
          
          isCorrect = true;
      }
      await connection.execute(
        `INSERT INTO answers (
          attempt_id, 
          question_id, 
          selected_option, 
          written_answer, 
          is_correct,
          attempts,
          hints_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          attemptId,
          answer.question_id,
          answer.selected_option || null,
          answer.written_answer || null,
          isCorrect ? 1 : 0,
          answer.attempts || 1,
          answer.hints_used || 0
        ]
      );
      
      if (isCorrect) {
        correctAnswers++;
        totalPoints += question.points || 1;
      }
    }
    
    const scorePercentage = questions.length > 0 
      ? (correctAnswers / questions.length) * 100 
      : 0;
    await connection.execute(
      `UPDATE quizattempts SET 
        completed_at = NOW(),
        score = ?
      WHERE attempt_id = ?`,
      [scorePercentage.toFixed(2), attemptId]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true,
      score: scorePercentage.toFixed(2),
      correctAnswers,
      totalQuestions: questions.length,
      totalPoints
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Quiz submission error:', err);
    res.status(500).json({ error: 'Failed to submit quiz answers' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/users/:userId/quiz-attempts', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const [attempts] = await pool.execute(
      `SELECT 
        qa.attempt_id,
        qa.quiz_id,
        q.title AS quiz_title,
        qa.score,
        qa.started_at,
        qa.completed_at
      FROM quizattempts qa
      JOIN quizzes q ON qa.quiz_id = q.quiz_id
      WHERE qa.user_id = ?
      ORDER BY qa.completed_at DESC`,
      [userId]
    );
    
    res.json(attempts);
  } catch (err) {
    console.error('Failed to fetch user attempts:', err);
    res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

app.get('/', (req, res) => {
  res.send('Backend is working');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));