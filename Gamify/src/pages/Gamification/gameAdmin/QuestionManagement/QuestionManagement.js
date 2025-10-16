import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Button, Typography, Paper, Container,
  List, ListItem, Divider, IconButton,
  MenuItem, Select, FormControl, InputLabel,
  Chip, Grid, Snackbar, Alert, Accordion,
  AccordionSummary, AccordionDetails, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, TablePagination,
  Tooltip, CircularProgress, Checkbox, Tabs, Tab
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Add as AddIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const baseUrl = process.env.REACT_APP_ADMIN_QUIZ_URL;

const QuestionManagement = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [editDialog, setEditDialog] = useState({
    open: false,
    question: null,
    activeTab: 0
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    questionId: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState('display_order');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const toggleQuizStatus = async (quizId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await axios.put(`${baseUrl}/quizzes/${quizId}/status`, {
        is_active: newStatus
      });
      showSnackbar(`Quiz ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
      const response = await axios.get(`${baseUrl}/quizzes`);
      setQuizzes(response.data);
      if (!newStatus && selectedQuiz === quizId) {
        setSelectedQuiz('');
      }
    } catch (err) {
      showSnackbar('Failed to update quiz status', 'error');
      console.error(err);
    }
  };
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(`${baseUrl}/quizzes`);
        setQuizzes(response.data);
      } catch (err) {
        setError('Failed to fetch quizzes');
        showSnackbar('Failed to fetch quizzes', 'error');
      }
    };
    fetchQuizzes();
  }, []);
  useEffect(() => {
    if (selectedQuiz) {
      fetchQuestions(selectedQuiz);
    } else {
      setQuestions([]);
    }
  }, [selectedQuiz]);
  const fetchQuestions = async (quizId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/quizzes/${quizId}/questions`);
      setQuestions(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch questions');
      showSnackbar('Failed to fetch questions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizChange = (event) => {
    setSelectedQuiz(event.target.value);
  };
  const handleEditClick = (question) => {
    setEditDialog({
      open: true,
      question: { ...question },
      activeTab: 0
    });
  };
  const handleEditClose = () => {
    setEditDialog({
      open: false,
      question: null,
      activeTab: 0
    });
  };

  const handleTabChange = (event, newValue) => {
    setEditDialog(prev => ({
      ...prev,
      activeTab: newValue
    }));
  };
  const handleEditChange = (field, value) => {
    setEditDialog(prev => ({
      ...prev,
      question: {
        ...prev.question,
        [field]: value
      }
    }));
  };
  const handleOptionChange = (index, field, value) => {
    setEditDialog(prev => {
      const newOptions = [...prev.question.options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return {
        ...prev,
        question: {
          ...prev.question,
          options: newOptions
        }
      };
    });
  };
  
  const addOption = () => {
    setEditDialog(prev => ({
      ...prev,
      question: {
        ...prev.question,
        options: [
          ...prev.question.options,
          { option_text: '', is_correct: false }
        ]
      }
    }));
  };
  
  const removeOption = (index) => {
    if (editDialog.question.options.length <= 2) {
      showSnackbar('Multiple choice questions need at least 2 options', 'error');
      return;
    }
    setEditDialog(prev => ({
      ...prev,
      question: {
        ...prev.question,
        options: prev.question.options.filter((_, i) => i !== index)
      }
    }));
  };
  
  const handleUpdateQuestion = async () => {
    try {
     
      const updatedQuestion = {
        ...editDialog.question,
        updated_by: 1
      };
      
      await axios.put(`${baseUrl}/questions/${editDialog.question.question_id}`, updatedQuestion);
      showSnackbar('Question updated successfully', 'success');
      fetchQuestions(selectedQuiz);
      handleEditClose();
    } catch (err) {
      showSnackbar('Failed to update question', 'error');
      console.error(err);
    }
  };
  const handleDeleteClick = (questionId) => {
    setDeleteConfirm({
      open: true,
      questionId
    });
  };
  const handleDeleteClose = () => {
    setDeleteConfirm({
      open: false,
      questionId: null
    });
  };
  const confirmDelete = async () => {
    try {
      await axios.delete(`${baseUrl}/questions/${deleteConfirm.questionId}`);
      showSnackbar('Question deleted successfully', 'success');
      fetchQuestions(selectedQuiz);
      handleDeleteClose();
    } catch (err) {
      showSnackbar('Failed to delete question', 'error');
      console.error(err);
    }
  };
  const moveQuestionUp = async (questionId, currentOrder) => {
    try {
      
      const prevQuestion = questions.find(q => q.display_order === currentOrder - 1);
      if (!prevQuestion) return;
      await axios.put(`${baseUrl}/questions/${questionId}`, {
        ...questions.find(q => q.question_id === questionId),
        display_order: currentOrder - 1
      });
      await axios.put(`${baseUrl}/questions/${prevQuestion.question_id}`, {
        ...prevQuestion,
        display_order: currentOrder
      });

      fetchQuestions(selectedQuiz);
      showSnackbar('Question order updated', 'success');
    } catch (err) {
      showSnackbar('Failed to update question order', 'error');
      console.error(err);
    }
  };

  const moveQuestionDown = async (questionId, currentOrder) => {
    try {
      const nextQuestion = questions.find(q => q.display_order === currentOrder + 1);
      if (!nextQuestion) return;
      await axios.put(`${baseUrl}/questions/${questionId}`, {
        ...questions.find(q => q.question_id === questionId),
        display_order: currentOrder + 1
      });
      await axios.put(`${baseUrl}/questions/${nextQuestion.question_id}`, {
        ...nextQuestion,
        display_order: currentOrder
      });

      fetchQuestions(selectedQuiz);
      showSnackbar('Question order updated', 'success');
    } catch (err) {
      showSnackbar('Failed to update question order', 'error');
      console.error(err);
    }
  };
  const filteredQuestions = questions.filter(question =>
    question.question_text.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedQuestions = filteredQuestions.sort((a, b) => {
    if (orderBy === 'display_order') {
      return order === 'asc' ? a.display_order - b.display_order : b.display_order - a.display_order;
    } else {
      return order === 'asc' 
        ? a[orderBy].localeCompare(b[orderBy]) 
        : b[orderBy].localeCompare(a[orderBy]);
    }
  });
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`question-edit-tabpanel-${index}`}
        aria-labelledby={`question-edit-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ py: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Question Management
      </Typography>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Quiz</InputLabel>
              <Select
                value={selectedQuiz}
                onChange={handleQuizChange}
                label="Select Quiz"
              >
                {quizzes.map(quiz => (
                  <MenuItem key={quiz.quiz_id} value={quiz.quiz_id}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Box>
                        {quiz.title}
                        {quiz.is_active === 0 && (
                          <Chip label="Inactive" size="small" color="error" sx={{ ml: 1 }} />
                        )}
                      </Box>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleQuizStatus(quiz.quiz_id, quiz.is_active);
                        }}
                        color={quiz.is_active ? 'error' : 'success'}
                      >
                        {quiz.is_active ? <CloseIcon /> : <CheckIcon />}
                      </IconButton>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Questions"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                endAdornment: <SearchIcon />
              }}
            />
          </Grid>
        </Grid>
      </Paper>
      {loading && selectedQuiz ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : questions.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">
            {selectedQuiz ? 'No questions found for this quiz' : 'Please select a quiz'}
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'display_order'}
                      direction={orderBy === 'display_order' ? order : 'asc'}
                      onClick={() => handleSort('display_order')}
                    >
                      Order
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'question_text'}
                      direction={orderBy === 'question_text' ? order : 'asc'}
                      onClick={() => handleSort('question_text')}
                    >
                      Question
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'type'}
                      direction={orderBy === 'type' ? order : 'asc'}
                      onClick={() => handleSort('type')}
                    >
                      Type
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Max Attempts</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedQuestions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((question) => (
                    <TableRow key={question.question_id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Typography>{question.display_order}</Typography>
                          <Box display="flex" flexDirection="column" ml={1}>
                            <IconButton
                              size="small"
                              onClick={() => moveQuestionUp(question.question_id, question.display_order)}
                              disabled={question.display_order === 1}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => moveQuestionDown(question.question_id, question.display_order)}
                              disabled={question.display_order === questions.length}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 'medium' }}>
                          {question.question_text.length > 50
                            ? `${question.question_text.substring(0, 50)}...`
                            : question.question_text}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={question.type.replace('_', ' ')} 
                          color={
                            question.type === 'multiple_choice' ? 'primary' : 
                            question.type === 'true_false' ? 'secondary' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {question.points || 1}
                      </TableCell>
                      <TableCell>
                        {question.max_attempts || 'Unlimited'}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            onClick={() => handleEditClick(question)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => handleDeleteClick(question.question_id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <Box sx={{ mb: 2, p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Click the {<CheckIcon fontSize="small" />} icon to activate or {<CloseIcon fontSize="small" />} to deactivate a quiz
              </Typography>
            </Box>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sortedQuestions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
      <Dialog open={editDialog.open} onClose={handleEditClose} fullWidth maxWidth="md">
        <DialogTitle>Edit Question</DialogTitle>
        <DialogContent>
          {editDialog.question && (
            <Box sx={{ mt: 2 }}>
              <Tabs value={editDialog.activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Basic Info" />
                <Tab label="Advanced Settings" />
              </Tabs>
              
              <TabPanel value={editDialog.activeTab} index={0}>
                <TextField
                  fullWidth
                  label="Question Text"
                  value={editDialog.question.question_text}
                  onChange={(e) => handleEditChange('question_text', e.target.value)}
                  multiline
                  rows={3}
                  sx={{ mb: 3 }}
                />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Question Type</InputLabel>
                      <Select
                        value={editDialog.question.type}
                        onChange={(e) => handleEditChange('type', e.target.value)}
                        label="Question Type"
                      >
                        <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                        <MenuItem value="true_false">True/False</MenuItem>
                        <MenuItem value="short_answer">Short Answer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Display Order"
                      type="number"
                      value={editDialog.question.display_order}
                      onChange={(e) => handleEditChange('display_order', parseInt(e.target.value))}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                </Grid>
                {editDialog.question.type === 'multiple_choice' && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Options (mark correct answers)
                    </Typography>
                    {editDialog.question.options?.map((option, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TextField
                          fullWidth
                          label={`Option ${index + 1}`}
                          value={option.option_text}
                          onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                          sx={{ mr: 2 }}
                        />
                        <Checkbox
                          checked={option.is_correct}
                          onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                          color="primary"
                        />
                        <IconButton
                          onClick={() => removeOption(index)}
                          color="error"
                          disabled={editDialog.question.options.length <= 2}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      onClick={addOption}
                      startIcon={<AddIcon />}
                      variant="outlined"
                      disabled={editDialog.question.options?.length >= 6}
                    >
                      Add Option
                    </Button>
                  </Box>
                )}
                {editDialog.question.type !== 'multiple_choice' && (
                  <TextField
                    fullWidth
                    label="Correct Answer"
                    value={editDialog.question.correct_answer}
                    onChange={(e) => handleEditChange('correct_answer', e.target.value)}
                    multiline={editDialog.question.type === 'short_answer'}
                    rows={editDialog.question.type === 'short_answer' ? 3 : 1}
                    sx={{ mt: 3 }}
                  />
                )}
              </TabPanel>
              
              <TabPanel value={editDialog.activeTab} index={1}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Points"
                      type="number"
                      value={editDialog.question.points || 1}
                      onChange={(e) => handleEditChange('points', parseInt(e.target.value))}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max Attempts"
                      type="number"
                      value={editDialog.question.max_attempts || ''}
                      onChange={(e) => handleEditChange('max_attempts', e.target.value ? parseInt(e.target.value) : null)}
                      inputProps={{ min: 1 }}
                      helperText="Leave empty for unlimited attempts"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Hint"
                      value={editDialog.question.hint || ''}
                      onChange={(e) => handleEditChange('hint', e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Feedback for Correct Answer"
                      value={editDialog.question.feedback_correct || ''}
                      onChange={(e) => handleEditChange('feedback_correct', e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Feedback for Incorrect Answer"
                      value={editDialog.question.feedback_incorrect || ''}
                      onChange={(e) => handleEditChange('feedback_incorrect', e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </TabPanel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleUpdateQuestion} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteConfirm.open} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this question?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default QuestionManagement;