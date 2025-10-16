import { useState } from 'react';
import axios from 'axios';
import {
  Box, Button, TextField, Typography, Paper,
  Grid, Snackbar, Alert, Accordion,
  AccordionSummary, AccordionDetails, FormControl,
  InputLabel, Select, MenuItem, Checkbox, IconButton,
  FormGroup, FormControlLabel, Radio, RadioGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useAuth } from '../../../../context/AuthContext';
const inputStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    '& .MuiOutlinedInput-input': {
      py: 1.2,
      fontSize: '0.875rem'
    }
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
    transform: 'translate(14px, 12px) scale(1)',
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -6px) scale(0.75)'
    }
  }
};

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' }
];

function QuizCreation() {
   const { user } = useAuth();
  const userId = user?.user_id;
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    instructions: '',
    duration_minutes: 30,
    active_from: '',
    active_to: '',
  });

  const [questions, setQuestions] = useState([{
    question_text: '',
    type: 'multiple_choice',
    correct_answer: '',
    display_order: 1,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ],
    media_url: '',
    hint: '',
    feedback_correct: '',
    feedback_incorrect: '',
    max_attempts: null,
    points: 1
  }]);

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleQuizChange = (e) => {
    const { name, value } = e.target;
    setQuizForm(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestions(prev => {
      const newQuestions = [...prev];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      
      if (field === 'type') {
        switch (value) {
          case 'multiple_choice':
            newQuestions[index].options = [
              { option_text: '', is_correct: false },
              { option_text: '', is_correct: false }
            ];
            break;
          case 'true_false':
            newQuestions[index].options = [];
            newQuestions[index].correct_answer = 'True';
            break;
          default:
            break;
        }
      }
      
      return newQuestions;
    });
  };

  const handleOptionChange = (qIndex, oIndex, field, value) => {
    setQuestions(prev => {
      const newQuestions = [...prev];
      const newOptions = [...newQuestions[qIndex].options];
      newOptions[oIndex] = { ...newOptions[oIndex], [field]: value };
      newQuestions[qIndex].options = newOptions;
      return newQuestions;
    });
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question_text: '',
        type: 'multiple_choice',
        correct_answer: '',
        display_order: prev.length + 1,
        options: [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false }
        ],
        media_url: '',
        hint: '',
        feedback_correct: '',
        feedback_incorrect: '',
        max_attempts: null,
        points: 1
      }
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) {
      showSnackbar('A quiz must have at least one question', 'error');
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const addOption = (qIndex) => {
    setQuestions(prev => {
      const newQuestions = [...prev];
      newQuestions[qIndex].options = [
        ...newQuestions[qIndex].options,
        { option_text: '', is_correct: false }
      ];
      return newQuestions;
    });
  };

  const removeOption = (qIndex, oIndex) => {
    setQuestions(prev => {
      const newQuestions = [...prev];
      if (newQuestions[qIndex].options.length <= 2) {
        showSnackbar('Questions need at least 2 options', 'error');
        return prev;
      }
      newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
      return newQuestions;
    });
  };
const baseUrl = process.env.REACT_APP_ADMIN_QUIZ_URL;
  const handleSubmit = async (e) => {
     e.preventDefault();
    try {
      setLoading(true);
      if (quizForm.active_from && quizForm.active_to) {
        const fromDate = new Date(quizForm.active_from);
        const toDate = new Date(quizForm.active_to);
        
        if (fromDate >= toDate) {
          showSnackbar('Active "To" date must be after "From" date', 'error');
          return;
        }
      }
      
      if (!quizForm.title.trim()) {
        showSnackbar('Quiz title is required', 'error');
        return;
      }
      if (!userId) {
        showSnackbar('You must be logged in to create a quiz', 'error');
        return;
      }

      
      if (!quizForm.title.trim()) {
        showSnackbar('Quiz title is required', 'error');
        return;
      }

      for (const [index, question] of questions.entries()) {
        if (!question.question_text.trim()) {
          showSnackbar(`Question ${index + 1} text is required`, 'error');
          return;
        }

        switch (question.type) {
          case 'multiple_choice':
            if (question.options.length < 2) {
              showSnackbar(`Question ${index + 1} needs at least 2 options`, 'error');
              return;
            }

            const hasCorrectOption = question.options.some(opt => opt.is_correct);
            if (!hasCorrectOption) {
              showSnackbar(`Question ${index + 1} needs at least one correct option`, 'error');
              return;
            }

            for (const [oIndex, option] of question.options.entries()) {
              if (!option.option_text.trim()) {
                showSnackbar(`Option ${oIndex + 1} in Question ${index + 1} needs text`, 'error');
                return;
              }
            }
            break;
          
          case 'true_false':
            if (!['True', 'False'].includes(question.correct_answer)) {
              showSnackbar(`Question ${index + 1} needs a valid true/false answer`, 'error');
              return;
            }
            break;
          
          default:
            break;
        }
      }

      const quizRes = await axios.post(`${baseUrl}/quizzes`, {
        ...quizForm,
        created_by: userId
      });

      const questionsData = questions.map(q => {
        const baseQuestion = {
          question_text: q.question_text,
          type: q.type,
          correct_answer: q.correct_answer,
          display_order: q.display_order,
          media_url: q.media_url,
          hint: q.hint,
          feedback_correct: q.feedback_correct,
          feedback_incorrect: q.feedback_incorrect,
          max_attempts: q.max_attempts,
          points: q.points
        };
        
        if (q.type === 'multiple_choice') {
          baseQuestion.options = q.options.map(opt => ({
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            media_url: null,
            order_position: null
          }));
        }
        
        return baseQuestion;
      });

      await axios.post(
  `${baseUrl}/quizzes/${quizRes.data.quiz_id}/questions/batch`,
  questionsData
);
      showSnackbar('Quiz created successfully!', 'success');
      setQuizForm({ title: '', description: '', instructions: '', duration_minutes: 30 });
      setQuestions([{
        question_text: '',
        type: 'multiple_choice',
        correct_answer: '',
        display_order: 1,
        options: [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false }
        ],
        media_url: '',
        hint: '',
        feedback_correct: '',
        feedback_incorrect: '',
        max_attempts: null,
        points: 1
      }]);
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Failed to create quiz', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const renderQuestionControls = (question, qIndex) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ 
                mt: 0.5, 
                fontSize: '0.8rem',
                color: 'text.secondary'
              }}>
                Options (mark correct answers)
              </Typography>
              
              {question.options.map((option, oIndex) => (
                <Box 
                  key={oIndex} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    gap: 1
                  }}
                >
                  <TextField
                    fullWidth
                    label={`Option ${oIndex + 1}`}
                    value={option.option_text}
                    onChange={(e) => handleOptionChange(qIndex, oIndex, 'option_text', e.target.value)}
                    required
                    variant="outlined"
                    size="small"
                    sx={inputStyles}
                  />
                  <Checkbox
                    checked={option.is_correct}
                    onChange={(e) => handleOptionChange(qIndex, oIndex, 'is_correct', e.target.checked)}
                    color="primary"
                    size="small"
                    sx={{ p: 0.75 }}
                  />
                  <IconButton
                    onClick={() => removeOption(qIndex, oIndex)}
                    color="error"
                    size="small"
                    disabled={question.options.length <= 2}
                    sx={{ p: 0.75 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              
              <Button
                onClick={() => addOption(qIndex)}
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                sx={{ 
                  mt: 0.5,
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  py: 0.5,
                  px: 1.5
                }}
                disabled={question.options.length >= 6}
              >
                Add Option
              </Button>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hint (optional)"
                value={question.hint}
                onChange={(e) => handleQuestionChange(qIndex, 'hint', e.target.value)}
                multiline
                minRows={2}
                sx={inputStyles}
                helperText="This will be shown to users when they request help"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Correct Feedback (optional)"
                value={question.feedback_correct}
                onChange={(e) => handleQuestionChange(qIndex, 'feedback_correct', e.target.value)}
                multiline
                minRows={2}
                sx={inputStyles}
                helperText="Shown when user answers correctly"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Incorrect Feedback (optional)"
                value={question.feedback_incorrect}
                onChange={(e) => handleQuestionChange(qIndex, 'feedback_incorrect', e.target.value)}
                multiline
                minRows={2}
                sx={inputStyles}
                helperText="Shown when user answers incorrectly"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Attempts"
                type="number"
                value={question.max_attempts || ''}
                onChange={(e) => handleQuestionChange(qIndex, 'max_attempts', e.target.value || null)}
                sx={inputStyles}
                helperText="Leave blank for unlimited attempts"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Points"
                type="number"
                value={question.points}
                onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 1)}
                sx={inputStyles}
              />
            </Grid>
          </>
        );
      
      case 'true_false':
        return (
          <>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={question.correct_answer}
                  onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                  row
                >
                  <FormControlLabel value="True" control={<Radio />} label="True" />
                  <FormControlLabel value="False" control={<Radio />} label="False" />
                </RadioGroup>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hint (optional)"
                value={question.hint}
                onChange={(e) => handleQuestionChange(qIndex, 'hint', e.target.value)}
                multiline
                minRows={2}
                sx={inputStyles}
                helperText="This will be shown to users when they request help"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Correct Feedback (optional)"
                value={question.feedback_correct}
                onChange={(e) => handleQuestionChange(qIndex, 'feedback_correct', e.target.value)}
                multiline
                minRows={2}
                sx={inputStyles}
                helperText="Shown when user answers correctly"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Incorrect Feedback (optional)"
                value={question.feedback_incorrect}
                onChange={(e) => handleQuestionChange(qIndex, 'feedback_incorrect', e.target.value)}
                multiline
                minRows={2}
                sx={inputStyles}
                helperText="Shown when user answers incorrectly"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Attempts"
                type="number"
                value={question.max_attempts || ''}
                onChange={(e) => handleQuestionChange(qIndex, 'max_attempts', e.target.value || null)}
                sx={inputStyles}
                helperText="Leave blank for unlimited attempts"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Points"
                type="number"
                value={question.points}
                onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 1)}
                sx={inputStyles}
              />
            </Grid>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: '16px' }}>
        <Typography variant="h4" gutterBottom component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
          Create New Quiz
        </Typography>

        <form onSubmit={handleSubmit}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Quiz Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quiz Title"
                    name="title"
                    value={quizForm.title}
                    onChange={handleQuizChange}
                    required
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={quizForm.description}
                    onChange={handleQuizChange}
                    multiline
                    minRows={2}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Instructions"
                    name="instructions"
                    value={quizForm.instructions}
                    onChange={handleQuizChange}
                    multiline
                    minRows={2}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Duration (minutes)"
                    name="duration_minutes"
                    type="number"
                    value={quizForm.duration_minutes}
                    onChange={handleQuizChange}
                    sx={inputStyles}
                  />
                </Grid>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Active From"
                  type="datetime-local"
                  name="active_from"
                  value={quizForm.active_from}
                  onChange={handleQuizChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={inputStyles}
                  helperText="When the quiz becomes available"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Active To"
                  type="datetime-local"
                  name="active_to"
                  value={quizForm.active_to}
                  onChange={handleQuizChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={inputStyles}
                  helperText="When the quiz becomes unavailable"
                />
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>
            Questions
          </Typography>
          
          {questions.map((question, qIndex) => (
            <Accordion key={qIndex} defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {`Question ${qIndex + 1}: ${question.question_text.substring(0, 30) || 'New Question'}${question.question_text.length > 30 ? '...' : ''}`}
                </Typography>
                <IconButton 
                  onClick={(e) => { e.stopPropagation(); removeQuestion(qIndex); }}
                  color="error"
                  disabled={questions.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Question Text"
                      value={question.question_text}
                      onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                      required
                      multiline
                      minRows={3}
                      sx={inputStyles}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth sx={inputStyles}>
                      <InputLabel>Question Type</InputLabel>
                      <Select
                        value={question.type}
                        label="Question Type"
                        onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                      >
                        {QUESTION_TYPES.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {renderQuestionControls(question, qIndex)}
                  
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={addQuestion}
              startIcon={<AddIcon />}
              variant="outlined"
            >
              Add Question
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ borderRadius: '8px' }}
            >
              {loading ? 'Saving...' : 'Save Quiz'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default QuizCreation;