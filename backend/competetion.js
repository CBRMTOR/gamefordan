const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

// Helper function for error handling
const handleError = (res, message, error) => {
  console.error(message, error);
  res.status(500).json({ error: message });
};

// Fetch KPI column names dynamically
app.get('/api/metrics', async (req, res) => {
  try {
    const [results] = await pool.execute(`SHOW COLUMNS FROM kpi_parameters`);
    const metricNames = results
      .map(row => row.Field)
      .filter(field => !['record_date', 'created_at'].includes(field));
    res.json(metricNames);
  } catch (err) {
    handleError(res, 'Failed to fetch metrics', err);
  }
});

// Save metric ranges and points
app.post('/api/save-metrics', async (req, res) => {
  try {
    const { data } = req.body;

    // Get next round number
    const [roundResult] = await pool.execute('SELECT IFNULL(MAX(round), 0) + 1 AS nextRound FROM metric_points');
    const nextRound = roundResult[0].nextRound;

    const values = data.flatMap(metric => 
      metric.ranges.map(range => [
        '', 
        '', 
        metric.metric_name,
        parseFloat(range.range_from) || 0,
        parseFloat(range.range_to) || 0,
        parseInt(range.points) || 0,
        nextRound
      ])
    );

    const insertQuery = `
      INSERT INTO metric_points (extension_id, advisor_name, metric_name, range_from, range_to, points, round)
      VALUES ?
    `;

    await pool.query(insertQuery, [values]);

    res.json({ message: `Metrics saved successfully for Round ${nextRound}`, round: nextRound });
  } catch (err) {
    handleError(res, 'Error saving metrics', err);
  }
});

app.get('/api/latest-round', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT MAX(round) as round FROM metric_points');
    res.json({ round: results[0].round || 1 });
  } catch (err) {
    handleError(res, 'Error fetching latest round', err);
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
    handleError(res, 'Error fetching round details', err);
  }
});

const upload = multer({ dest: 'uploads/' });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.post('/api/kpi/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const viewTime = req.app.locals.bulkUploadViewTime || new Date();
    req.app.locals.bulkUploadViewTime = null;
    
    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    const [roundResults] = await pool.execute('SELECT MAX(round) as round FROM metric_points');
    const round = roundResults[0].round || 1;

    let successCount = 0;
    let failedCount = 0;
    const failedReasons = [];

    // Process each row
    for (const row of data) {
      try {
        const { extension_id, advisor_name, ...metrics } = row;
        
        if (!extension_id || !advisor_name) {
          failedCount++;
          failedReasons.push(`Missing extension_id or advisor_name in row: ${JSON.stringify(row)}`);
          continue;
        }

        let totalPoints = 0;
        const metricDetails = {};

        // Calculate points for each metric
        for (const [metric, value] of Object.entries(metrics)) {
          if (value === null || value === undefined || value === '') {
            metricDetails[metric] = { value, points: 0 };
            continue;
          }

          const numericValue = parseFloat(value);
          if (isNaN(numericValue)) {
            metricDetails[metric] = { value, points: 0 };
            continue;
          }
          
          const [pointResults] = await pool.execute(
            `SELECT points FROM metric_points 
             WHERE metric_name = ? AND round = ? AND range_from <= ? AND range_to >= ?`,
            [metric, round, numericValue, numericValue]
          );

          const points = pointResults.length > 0 ? pointResults[0].points : 0;
          metricDetails[metric] = { value: numericValue, points };
          totalPoints += points;
        }
        
        await pool.execute(
          `INSERT INTO employee_kpi_submissions 
           (extension_id, advisor_name, round, total_points, metric_details, submitted_at, view_time) 
           VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
          [extension_id, advisor_name, round, totalPoints, JSON.stringify(metricDetails), viewTime]
        );

        successCount++;
      } catch (error) {
        failedCount++;
        failedReasons.push(`Error processing row ${JSON.stringify(row)}: ${error.message}`);
        console.error('Error processing row:', error);
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Processed ${successCount} records successfully`,
      successCount,
      failedCount,
      failedReasons: failedReasons.slice(0, 10), 
      viewTime
    });

  } catch (error) {
    handleError(res, 'Failed to process file', error);
  }
});

app.post('/api/kpi/set-view-time', async (req, res) => {
  try {
    const { viewTime } = req.body;
    req.app.locals.bulkUploadViewTime = new Date(viewTime);
    
    res.json({ success: true, message: 'View time set successfully' });
  } catch (error) {
    handleError(res, 'Failed to set view time', error);
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    
    const [roundResults] = await pool.execute('SELECT MAX(round) as round FROM metric_points');
    const currentRound = roundResults[0].round || 1;

    const [results] = await pool.execute(`
      SELECT extension_id, advisor_name, total_points, submitted_at
      FROM employee_kpi_submissions 
      WHERE round = ?
      ORDER BY total_points DESC
    `, [currentRound]);

    res.json(results);
  } catch (err) {
    handleError(res, 'Failed to fetch leaderboard', err);
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
    handleError(res, 'Failed to fetch advisor details', err);
  }
});

app.get('/api/kpi/template', async (req, res) => {
  try {
    const workbook = XLSX.utils.book_new();
    const templateData = [
      ['extension_id', 'advisor_name', 'avg_answered_calls', 'avg_skillset_talk_time', 
       'total_answered_calls', 'avg_logged_in_time', 'deviation_logged_in_time',
       'avg_not_ready_time', 'not_ready_usage_proportional', 'over_usage_not_ready',
       'avg_skillset_talk_time_occupancy', 'percent_calls_transferred_csat', 'avg_csat',
       'daily_attendance_performance']
    ];
    
    templateData.push([
      '1234', 'Mr. X', '85.5', '180', '200', '480', '15', 
      '30', '6.25', '0', '37.5', '10', '4.8', '100'
    ]);
    
    templateData.push([
      '5678', 'Mr. Y', '90.2', '165', '180', '475', '20',
      '25', '5.26', '0', '34.6', '8', '4.9', '98'
    ]);
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI Data');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="kpi_template.xlsx"');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
    
  } catch (err) {
    handleError(res, 'Failed to generate template', err);
  }
});

app.get('/api/kpi/metrics-list', async (req, res) => {
  try {
    const [metrics] = await pool.execute(
      'SELECT DISTINCT metric_name FROM metric_points ORDER BY metric_name'
    );
    
    res.json({ metrics: metrics.map(m => m.metric_name) });
  } catch (err) {
    handleError(res, 'Failed to fetch metrics list', err);
  }
});

app.listen(5052, () => {
  console.log('Server running on http://localhost:5052');
});