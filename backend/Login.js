const { app, pool } = require('./middlewares/um/middleware.js');
const authRoutes = require('./middlewares/um/authRoutes');
const userRoutes = require('./middlewares/um/userRoutes');

// Use routes
app.use('/', authRoutes);
app.use('/', userRoutes);

// Error handling
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(` Auth server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  pool.end()
    .then(() => {
      console.log('MySQL pool closed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error closing MySQL pool:', err);
      process.exit(1);
    });
});

process.on('SIGTERM', () => {
  pool.end()
    .then(() => {
      console.log('MySQL pool closed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error closing MySQL pool:', err);
      process.exit(1);
    });
});