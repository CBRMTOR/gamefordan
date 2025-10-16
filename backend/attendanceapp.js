// server.js
const express = require('express');
const app = express();
const attendanceRoutes = require('./attendanceRoutes'); // Make sure the path is correct
const cors = require('cors');
require('dotenv').config();

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', attendance);

app.get('/', (req, res) => {
  res.send('Attendance API is running!');
});

const PORT = process.env.PORT_ATTENDANCE || 5040;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
