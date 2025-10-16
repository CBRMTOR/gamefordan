import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Container, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Accordion,
  AccordionSummary, AccordionDetails, LinearProgress,
  TextField, Button, Collapse, CircularProgress, Chip,
  Pagination, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const AttemptDetails = ({ attemptId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) return;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${baseUrl}/quiz-responses/${attemptId}`);
        setDetails(response.data);
      } catch (err) {
        setError('Failed to load attempt details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [attemptId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 2, color: 'error.main' }}>{error}</Box>;
  if (!details) return null;

  return (
  <Box sx={{ p: 2, backgroundColor: 'grey.100' }}>
      <Typography variant="h6" gutterBottom>Attempt Details</Typography>
      <Box sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: 1 }}>
        <Typography variant="body2">
          <strong>Total Attempts Used:</strong> {details.total_attempts || 0}
        </Typography>
        <Typography variant="body2">
          <strong>Total Hints Used:</strong> {details.total_hints_used || 0}
        </Typography>
      </Box>
      {details.answers.map((answer, index) => (
        <Paper key={answer.question_id} sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1">
            <strong>{index + 1}. {answer.question_text}</strong>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {answer.is_correct ?
              <CheckCircleIcon color="success" sx={{ mr: 1 }} /> :
              <CancelIcon color="error" sx={{ mr: 1 }} />
            }
            <Typography variant="body2">
              Your Answer: <em>{answer.selected_option_text || answer.written_answer || 'Not answered'}</em>
            </Typography>
          </Box>
          {!answer.is_correct && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Correct Answer: <strong>{answer.correct_answer}</strong>
            </Typography>
          )}
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              <strong>Attempts Used:</strong> {answer.attempts || 0}
            </Typography>
            <Typography variant="body2">
              <strong>Hints Used:</strong> {answer.hints_used || 0}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {answer.feedback}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};

const baseUrl = process.env.REACT_APP_ADMIN_QUIZ_URL;

const QuizLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportQuizId, setExportQuizId] = useState(null);
  const [exportCount, setExportCount] = useState(10);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/leaderboard`);
      const processedData = response.data.reduce((acc, entry) => {
        if (!acc[entry.quiz_id]) {
          acc[entry.quiz_id] = [];
        }
        acc[entry.quiz_id].push(entry);
        return acc;
      }, {});
      Object.keys(processedData).forEach(quizId => {
        processedData[quizId].sort((a, b) => a.rank - b.rank);
        processedData[quizId] = processedData[quizId].map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));
      });
      const flattenedData = Object.values(processedData).flat();
      setLeaderboard(flattenedData);
      setError('');
    } catch (err) {
      setError('Failed to load leaderboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  fetchLeaderboard();
}, []);
  
  useEffect(() => {
    setPagination({});
  }, [searchTerm]);

  const handleRowClick = (attemptId) => {
    setExpandedAttemptId(expandedAttemptId === attemptId ? null : attemptId);
  };

  const handlePageChange = (quizId, newPage) => {
    setPagination(prev => ({
      ...prev,
      [quizId]: newPage,
    }));
  };
const sortLeaderboardEntries = (entries) => {
  return entries.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.duration_seconds !== b.duration_seconds) {
      return a.duration_seconds - b.duration_seconds;
    }
    if (a.total_hints_used !== b.total_hints_used) {
      return a.total_hints_used - b.total_hints_used;
    }
    if (a.completed_at !== b.completed_at) {
      return new Date(a.completed_at) - new Date(b.completed_at);
    }
    return (a.total_attempts || 0) - (b.total_attempts || 0);
  });
};
  const filteredQuizzes = leaderboard.reduce((acc, entry) => {
    if (
      entry.quiz_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      if (!acc[entry.quiz_id]) {
        acc[entry.quiz_id] = { title: entry.quiz_title, entries: [] };
      }
      acc[entry.quiz_id].entries.push(entry);
    }
    return acc;
  }, {});
  Object.keys(filteredQuizzes).forEach(quizId => {
    filteredQuizzes[quizId].entries = sortLeaderboardEntries(filteredQuizzes[quizId].entries);
  });

  const itemsPerPage = 10;

  const handleExportClick = (quizId) => {
    setExportQuizId(quizId);
    setExportDialogOpen(true);
  };

  const fetchAttemptDetails = async (attemptId) => {
    try {
      const response = await axios.get(`${baseUrl}/quiz-responses/${attemptId}`);
      return response.data;
    } catch (err) {
      console.error(`Failed to load attempt details for ${attemptId}:`, err);
      return null;
    }
  };

const handleExportConfirm = async () => {
  if (!exportQuizId) return;
  
  setExporting(true);
  const quizData = filteredQuizzes[exportQuizId];
  if (!quizData) {
    setExporting(false);
    return;
  }
  const topN = quizData.entries.slice(0, exportCount);
  const basicData = topN.map(entry => ({
    Rank: entry.rank,
    Username: entry.username,
    Score: `${entry.score}%`,
    'Attempts Used': entry.total_attempts || 0,
    'Hints Used': entry.total_hints_used || 0,
    'Submission Time': new Date(entry.completed_at).toLocaleString(),
    Duration: formatDuration(entry.duration_seconds)
  }));
  
  const detailedData = [];
  
  for (const entry of topN) {
    const details = await fetchAttemptDetails(entry.attempt_id);
    
    if (details) {
      detailedData.push({
        'Username': `--- ${entry.username} ---`,
        'Question': '',
        'Your Answer': '',
        'Correct': '',
        'Correct Answer': '',
        'Feedback': '',
        'Attempts Used': '',
        'Hints Used': ''
      });
      details.answers.forEach((answer, index) => {
        detailedData.push({
          'Username': entry.username,
          'Question': `${index + 1}. ${answer.question_text}`,
          'Your Answer': answer.selected_option_text || answer.written_answer || 'Not answered',
          'Correct': answer.is_correct ? 'Yes' : 'No',
          'Correct Answer': answer.correct_answer,
          'Feedback': answer.feedback || '',
          'Attempts Used': answer.attempts || 0,
          'Hints Used': answer.hints_used || 0
        });
      });
      
      detailedData.push({
        'Username': '',
        'Question': '',
        'Your Answer': '',
        'Correct': '',
        'Correct Answer': '',
        'Feedback': '',
        'Attempts Used': '',
        'Hints Used': ''
      });
    }
  }
  const basicWs = XLSX.utils.json_to_sheet(basicData);
  const detailedWs = XLSX.utils.json_to_sheet(detailedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, basicWs, "Leaderboard");
  XLSX.utils.book_append_sheet(wb, detailedWs, "Detailed Answers");
  const fileName = `${quizData.title.replace(/[^a-z0-9]/gi, '_')}_Leaderboard_Details.xlsx`;

  XLSX.writeFile(wb, fileName);
  
  setExporting(false);
  setExportDialogOpen(false);
};

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Quiz Leaderboards</Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          variant="outlined"
          placeholder="Search by quiz title or user"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
          sx={{ width: '50%' }}
        />
        <Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => window.location.reload()} sx={{ mr: 1 }}>
            Refresh
          </Button>
        </Box>
      </Box>

      {error && <Box sx={{ color: 'error.main', mb: 2 }}>{error}</Box>}

      {loading ? <LinearProgress /> : Object.keys(filteredQuizzes).length === 0 ? (
        <Typography variant="body1" align="center" sx={{ mt: 4 }}>
          No matching records found.
        </Typography>
      ) : (
        Object.entries(filteredQuizzes).map(([quizId, quizData]) => {
          const currentPage = pagination[quizId] || 1;
          const pageCount = Math.ceil(quizData.entries.length / itemsPerPage);
          const paginatedEntries = quizData.entries.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );

          return (
            <Accordion
              key={quizId}
              expanded={expandedQuiz === quizId}
              onChange={() => setExpandedQuiz(expandedQuiz === quizId ? null : quizId)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography variant="h6">{quizData.title}</Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<FileDownloadIcon />} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportClick(quizId);
                    }}
                    sx={{ ml: 2 }}
                  >
                    Export
                  </Button>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ flexDirection: 'column' }}>
                <TableContainer component={Paper}>
                  <Table size="small">
                   <TableHead>
  <TableRow>
    <TableCell>Rank</TableCell>
    <TableCell>Username</TableCell>
    <TableCell>Score</TableCell>
    <TableCell>Duration</TableCell>
    <TableCell>Attempts Used</TableCell>
    <TableCell>Hints Used</TableCell>
    <TableCell>Submission Time</TableCell>
  </TableRow>
</TableHead>
                    <TableBody>
  {paginatedEntries.map(entry => (
    <React.Fragment key={entry.attempt_id}>
      <TableRow
        hover
        onClick={() => handleRowClick(entry.attempt_id)}
        sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
      >
        <TableCell>
          {entry.rank} {entry.rank <= 3 && ['🥇', '🥈', '🥉'][entry.rank - 1]}
        </TableCell>
        <TableCell>{entry.username}</TableCell>
        <TableCell>{entry.score}%</TableCell>
        <TableCell>{formatDuration(entry.duration_seconds)}</TableCell>
        <TableCell>{entry.total_attempts || 0}</TableCell>
        <TableCell>{entry.total_hints_used || 0}</TableCell>
        <TableCell>{new Date(entry.completed_at).toLocaleString()}</TableCell>
      </TableRow>
                          <TableRow>
                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                              <Collapse in={expandedAttemptId === entry.attempt_id} timeout="auto" unmountOnExit>
                                <AttemptDetails attemptId={entry.attempt_id} />
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {pageCount > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                    <Pagination
                      count={pageCount}
                      page={currentPage}
                      onChange={(event, value) => handlePageChange(quizId, value)}
                      color="primary"
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })
      )}
      <Dialog open={exportDialogOpen} onClose={() => !exporting && setExportDialogOpen(false)}>
        <DialogTitle>Export Leaderboard</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            How many top-ranked users would you like to export?
          </Typography>
          <TextField
            type="number"
            value={exportCount}
            onChange={(e) => setExportCount(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1 }}
            fullWidth
            sx={{ mt: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            The export will include two sheets: one with the leaderboard summary and another with detailed question answers.
          </Typography>
          {exporting && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={20} sx={{ mr: 2 }} />
              <Typography variant="body2">Preparing export...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)} disabled={exporting}>Cancel</Button>
          <Button onClick={handleExportConfirm} color="primary" variant="contained" disabled={exporting}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizLeaderboard;