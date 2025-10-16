const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'UPDATE'],
  credentials: true
};
app.use(cors(corsOptions));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'Haroun',
  password: 'Haroun@2343',
  database: 'kpi_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/latest-round', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT MAX(round) as round FROM metric_points');
    res.json({ round: results[0].round || 1 });
  } catch (err) {
    console.error('Error fetching latest round:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/round-details/:round', async (req, res) => {
  try {
    const round = req.params.round;
    const [results] = await pool.execute(
      'SELECT * FROM metric_points WHERE round = ? ORDER BY metric_name, range_from',
      [round]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching round details:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/upcoming-targets', async (req, res) => {
  try {
    const [roundResults] = await pool.execute('SELECT MAX(round) as round FROM metric_points');
    const currentRound = roundResults[0].round || 1;
    const nextRound = currentRound + 1;
    
    const [results] = await pool.execute(
      'SELECT * FROM metric_points WHERE round = ? ORDER BY metric_name, range_from',
      [nextRound]
    );
    
    if (results.length > 0) {
      const groupedMetrics = {};
      results.forEach(metric => {
        if (!groupedMetrics[metric.metric_name]) {
          groupedMetrics[metric.metric_name] = {
            metric_name: metric.metric_name,
            ranges: []
          };
        }
        groupedMetrics[metric.metric_name].ranges.push({
          range_from: metric.range_from,
          range_to: metric.range_to,
          points: metric.points
        });
      });
      
      res.json({
        round: nextRound,
        metrics: Object.values(groupedMetrics)
      });
    } else {
      const [currentResults] = await pool.execute(
        'SELECT * FROM metric_points WHERE round = ? ORDER BY metric_name, range_from',
        [currentRound]
      );
      
      const groupedMetrics = {};
      currentResults.forEach(metric => {
        if (!groupedMetrics[metric.metric_name]) {
          groupedMetrics[metric.metric_name] = {
            metric_name: metric.metric_name,
            ranges: []
          };
        }
        groupedMetrics[metric.metric_name].ranges.push({
          range_from: metric.range_from,
          range_to: metric.range_to,
          points: metric.points
        });
      });
      
      res.json({
        round: currentRound,
        metrics: Object.values(groupedMetrics),
        message: "Using current round as upcoming targets"
      });
    }
  } catch (err) {
    console.error('Error fetching upcoming targets:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const [metricRoundResults] = await pool.execute('SELECT MAX(round) as round FROM metric_points');
    const maxMetricRound = metricRoundResults[0].round || 1;
    
    const [submissionRounds] = await pool.execute(`
      SELECT DISTINCT round 
      FROM employee_kpi_submissions 
      WHERE total_points > 0
      ORDER BY round DESC
    `);
        if (submissionRounds.length === 0) {
      return res.json({
        round: maxMetricRound,
        submissions: [],
        message: "No submissions yet for any round"
      });
    }
    
    const highestSubmissionRound = submissionRounds[0].round;
    
    let displayRound;
    let message = null;
    
    if (highestSubmissionRound >= maxMetricRound) {
      displayRound = maxMetricRound;
    } else {
      displayRound = highestSubmissionRound;
      message = `Showing leaderboard for Round ${displayRound} (latest metrics are for Round ${maxMetricRound})`;
    }
    
    const [results] = await pool.execute(`
      SELECT extension_id, advisor_name, total_points, submitted_at
      FROM employee_kpi_submissions 
      WHERE round = ? AND total_points > 0
      ORDER BY total_points DESC
    `, [displayRound]);
    
    res.json({
      round: displayRound,
      submissions: results,
      hasUpcomingTargets: maxMetricRound > displayRound,
      message: message
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
app.get('/api/advisor-details/:extensionId/:round', async (req, res) => {
  try {
    const { extensionId, round } = req.params;

    const [results] = await pool.execute(
      `SELECT *, 
              JSON_UNQUOTE(metric_details) as metric_details_parsed 
       FROM employee_kpi_submissions 
       WHERE extension_id = ? AND round = ?`,
      [extensionId, round]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Advisor not found' });
    }

    const result = results[0];
    try {
      result.metric_details = JSON.parse(result.metric_details_parsed);
      delete result.metric_details_parsed;
    } catch (e) {
      result.metric_details = {};
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching advisor details:', err);
    res.status(500).json({ error: 'Failed to fetch advisor details' });
  }
});

app.listen(5051, () => {
  console.log('Server running on http://localhost:5051');
});