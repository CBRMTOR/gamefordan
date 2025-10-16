const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const PORT = 5021;

app.use(express.json());

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Vivaa'
};

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'UPDATE'],
  credentials: true
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

app.post('/api/quizzes', async (req, res) => {
  const { title, description, instructions, created_by, duration_minutes } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO quizzes (title, description, instructions, created_by, duration_minutes) VALUES (?, ?, ?, ?, ?)',
      [title, description, instructions, created_by, duration_minutes || null]
    );
    res.status(201).json({ quiz_id: result.insertId });
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

app.put('/api/quizzes/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  
  try {
    await pool.execute(
      'UPDATE quizzes SET is_active = ? WHERE quiz_id = ?',
      [is_active, id]
    );
    res.json({ message: 'Quiz status updated successfully' });
  } catch (err) {
    console.error('Quiz status update error:', err);
    res.status(500).json({ 
      error: 'Failed to update quiz status',
      details: err.message
    });
  }
});

app.get('/api/quizzes', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM quizzes ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

app.post('/api/quizzes/:quizId/questions/batch', async (req, res) => {
  const { quizId } = req.params;
  const questions = req.body;
  let connection;

  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'Expected an array of questions' });
  }

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const results = [];
    
    for (const question of questions) {
      const { question_text, type, correct_answer, display_order, options, media_url, metadata } = question;
      
      let finalCorrectAnswer = correct_answer;
      let finalMetadata = validateMetadata(metadata);
      
      switch (type) {
        case 'multiple_choice':
        case 'ordering':
        case 'image_choice':
        case 'media_choice':
          if (options && options.length > 0) {
            const correctOptions = options.filter(opt => opt.is_correct);
            if (correctOptions.length > 0) {
              finalCorrectAnswer = correctOptions.map(opt => opt.option_text).join(', ');
            }
          }
          break;
        
        case 'matching':
          if (finalMetadata?.pairs) {
            finalCorrectAnswer = finalMetadata.pairs.map(pair => `${pair.left_text} -> ${pair.right_text}`).join('; ');
          }
          break;
        
        case 'categorization':
          if (finalMetadata?.categories) {
            finalCorrectAnswer = finalMetadata.categories.map(cat => 
              `${cat.name}: ${cat.options.join(', ')}`
            ).join('; ');
          }
          break;
        
        case 'true_false':
        case 'short_answer':
        default:
          break;
      }

      const [questionResult] = await connection.execute(
        'INSERT INTO questions (quiz_id, question_text, type, correct_answer, display_order, media_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [quizId, question_text, type, finalCorrectAnswer, display_order || 0, media_url || null, finalMetadata ? JSON.stringify(finalMetadata) : null]
      );
      const questionId = questionResult.insertId;
      results.push({ question_id: questionId });

      // Insert options for supported question types
      if ((type === 'multiple_choice' || type === 'ordering' || type === 'image_choice' || type === 'media_choice') && options && options.length > 0) {
        const optionValues = options.map(option => [
          questionId,
          option.option_text,
          option.is_correct ? 1 : 0,
          option.media_url || null,
          option.order_position || null,
          null 
        ]);
        
        await connection.query(
          'INSERT INTO options (question_id, option_text, is_correct, media_url, order_position, category_id) VALUES ?',
          [optionValues]
        );
      }

      if (type === 'matching' && finalMetadata?.pairs && finalMetadata.pairs.length > 0) {
        const pairValues = finalMetadata.pairs.map(pair => [
          questionId,
          pair.left_text,
          pair.right_text,
          pair.left_media_url || null,
          pair.right_media_url || null
        ]);
        
        await connection.query(
          'INSERT INTO question_pairs (question_id, left_text, right_text, left_media_url, right_media_url) VALUES ?',
          [pairValues]
        );
      }

      if (type === 'categorization' && finalMetadata?.categories && finalMetadata.categories.length > 0) {
        const categoryValues = finalMetadata.categories.map(category => [
          questionId,
          category.name
        ]);
        
        const [categoryResult] = await connection.query(
          'INSERT INTO question_categories (question_id, name) VALUES ?',
          [categoryValues]
        );
      }
    }

    await connection.commit();
    res.status(201).json({
      message: `${questions.length} questions created successfully`,
      results
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Batch question creation error:', err);
    res.status(500).json({ 
      error: 'Failed to create questions',
      details: err.message
    });
  } finally {
    if (connection) connection.release();
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
          case 'ordering':
          case 'image_choice':
          case 'media_choice':
            const [options] = await pool.execute(
              'SELECT * FROM options WHERE question_id = ? ORDER BY order_position, option_id',
              [question.question_id]
            );
            return { ...question, options, metadata };
          
          case 'matching':
            const [pairs] = await pool.execute(
              'SELECT * FROM question_pairs WHERE question_id = ?',
              [question.question_id]
            );
            return { ...question, pairs, metadata };
          
          case 'categorization':
            const [categories] = await pool.execute(
              'SELECT * FROM question_categories WHERE question_id = ?',
              [question.question_id]
            );
            
            const categoriesWithOptions = await Promise.all(
              categories.map(async (category) => {
                const [options] = await pool.execute(
                  'SELECT * FROM options WHERE category_id = ?',
                  [category.category_id]
                );
                return { ...category, options };
              })
            );
            
            return { ...question, categories: categoriesWithOptions, metadata };
          
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

app.put('/api/questions/:id', async (req, res) => {
  const { id } = req.params;
  const { question_text, type, correct_answer, display_order, options, media_url, metadata } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let finalCorrectAnswer = correct_answer;
    let finalMetadata = validateMetadata(metadata);
    
    switch (type) {
      case 'multiple_choice':
      case 'ordering':
      case 'image_choice':
      case 'media_choice':
        if (options && options.length > 0) {
          const correctOptions = options.filter(opt => opt.is_correct);
          if (correctOptions.length > 0) {
            finalCorrectAnswer = correctOptions.map(opt => opt.option_text).join(', ');
          }
        }
        break;
      
      case 'matching':
        if (finalMetadata?.pairs) {
          finalCorrectAnswer = finalMetadata.pairs.map(pair => `${pair.left_text} -> ${pair.right_text}`).join('; ');
        }
        break;
      
      case 'categorization':
        if (finalMetadata?.categories) {
          finalCorrectAnswer = finalMetadata.categories.map(cat => 
            `${cat.name}: ${cat.options.join(', ')}`
          ).join('; ');
        }
        break;
      
      case 'true_false':
      case 'short_answer':
      default:
        break;
    }

    await connection.execute(
      'UPDATE questions SET question_text = ?, type = ?, correct_answer = ?, display_order = ?, media_url = ?, metadata = ? WHERE question_id = ?',
      [question_text, type, finalCorrectAnswer, display_order || 0, media_url || null, finalMetadata ? JSON.stringify(finalMetadata) : null, id]
    );

    await connection.execute('DELETE FROM options WHERE question_id = ?', [id]);
    await connection.execute('DELETE FROM question_pairs WHERE question_id = ?', [id]);
    await connection.execute('DELETE FROM question_categories WHERE question_id = ?', [id]);

    switch (type) {
      case 'multiple_choice':
      case 'ordering':
      case 'image_choice':
      case 'media_choice':
        if (options && options.length > 0) {
          const optionValues = options.map(option => [
            id,
            option.option_text,
            option.is_correct ? 1 : 0,
            option.media_url || null,
            option.order_position || null,
            null
          ]);
          
          await connection.query(
            'INSERT INTO options (question_id, option_text, is_correct, media_url, order_position, category_id) VALUES ?',
            [optionValues]
          );
        }
        break;
      
      case 'matching':
        if (finalMetadata?.pairs && finalMetadata.pairs.length > 0) {
          const pairValues = finalMetadata.pairs.map(pair => [
            id,
            pair.left_text,
            pair.right_text,
            pair.left_media_url || null,
            pair.right_media_url || null
          ]);
          
          await connection.query(
            'INSERT INTO question_pairs (question_id, left_text, right_text, left_media_url, right_media_url) VALUES ?',
            [pairValues]
          );
        }
        break;
      
      case 'categorization':
        if (finalMetadata?.categories && finalMetadata.categories.length > 0) {
          const categoryValues = finalMetadata.categories.map(category => [
            id,
            category.name
          ]);
          
          const [categoryResult] = await connection.query(
            'INSERT INTO question_categories (question_id, name) VALUES ?',
            [categoryValues]
          );

        }
        break;
      
      default:
        break;
    }

    await connection.commit();
    res.json({ message: 'Question updated successfully' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Question update error:', err);
    res.status(500).json({ 
      error: 'Failed to update question',
      details: err.message
    });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute(`
      DELETE a FROM answers a
      JOIN options o ON a.selected_option = o.option_id
      WHERE o.question_id = ?
    `, [req.params.id]);

    await connection.execute(
      'DELETE FROM answers WHERE question_id = ?',
      [req.params.id]
    );

    await connection.execute(
      'DELETE FROM options WHERE question_id = ?',
      [req.params.id]
    );

    await connection.execute(
      'DELETE FROM question_pairs WHERE question_id = ?',
      [req.params.id]
    );

    await connection.execute(
      'DELETE FROM question_categories WHERE question_id = ?',
      [req.params.id]
    );

    await connection.execute(
      'DELETE FROM questions WHERE question_id = ?',
      [req.params.id]
    );

    await connection.commit();
    res.status(204).end();
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Question deletion error:', err);
    res.status(500).json({ 
      error: 'Failed to delete question',
      details: err.message
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/quiz-responses', async (req, res) => {
  try {
    const [attempts] = await pool.execute(`
      SELECT 
        qa.attempt_id,
        qa.quiz_id,
        q.title AS quiz_title,
        qa.user_id,
        qa.score,
        qa.started_at,
        qa.completed_at,
        COUNT(a.answer_id) AS question_count,
        SUM(a.is_correct) AS correct_answers
      FROM quizattempts qa
      JOIN quizzes q ON qa.quiz_id = q.quiz_id
      LEFT JOIN answers a ON qa.attempt_id = a.attempt_id
      WHERE qa.completed_at IS NOT NULL
      GROUP BY qa.attempt_id
      ORDER BY qa.completed_at DESC
    `);

    const attemptsWithDetails = await Promise.all(
      attempts.map(async attempt => {
        const [answers] = await pool.execute(`
          SELECT 
            a.answer_id,
            a.question_id,
            q.question_text,
            q.type,
            o.option_text AS selected_option_text,
            a.written_answer,
            a.is_correct,
            q.correct_answer
          FROM answers a
          JOIN questions q ON a.question_id = q.question_id
          LEFT JOIN options o ON a.selected_option = o.option_id
          WHERE a.attempt_id = ?
          ORDER BY q.display_order
        `, [attempt.attempt_id]);

        return { ...attempt, answers };
      })
    );

    res.json(attemptsWithDetails);
  } catch (err) {
    console.error('Failed to fetch quiz responses:', err);
    res.status(500).json({ error: 'Failed to fetch quiz responses' });
  }
});

app.get('/', (req, res) => {
  res.send('Backend is working');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));