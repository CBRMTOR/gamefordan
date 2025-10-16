const express = require('express');
const app = express();
const quizRoutes = require('./matching'); 

app.use(express.json());
app.use('/', quizRoutes);

const PORT = 2030;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
