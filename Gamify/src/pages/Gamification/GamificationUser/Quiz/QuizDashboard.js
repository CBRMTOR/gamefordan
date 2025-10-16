import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import * as localForage from 'localforage';
import confetti from 'canvas-confetti';
import QuizDashboardUI from './QuizDashboardUI';
import { useSnackbar } from 'notistack';
import {
  FormControl, RadioGroup, FormControlLabel, Radio,
  TextField, Alert, Box, Typography, CardContent,
  Button, Paper, Collapse, CircularProgress, Card
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Help as HelpIcon,
  SentimentVerySatisfied,
  SentimentDissatisfied
} from '@mui/icons-material';
const colors = {
  primaryBlue: '#0072BB',
  secondaryGreen: '#15A245',
  accentGreen: '#80C41C',
  darkBlue: '#004E80',
  lightBlue: '#E8F4FD',
  white: '#ffffff',
  black: '#212529',
  lightGray: '#f8f9fa',
  darkGray: '#495057',
  yellow: '#FFD700'
};
localForage.config({
  name: 'QuizApp',
  storeName: 'quiz_progress'
});
const OptionItem = styled(Paper)(({ theme, selected, correct, disabled }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: selected 
    ? 'rgba(0, 114, 187, 0.2)'
    : colors.white,
  border: selected 
    ? `2px solid ${colors.primaryBlue}`
    : `1px solid ${colors.lightGray}`,
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: !disabled && colors.lightBlue,
    transform: !disabled && 'translateY(-1px)'
  },
  ...(correct && {
    border: `2px solid ${colors.secondaryGreen}`,
    background: 'rgba(21, 162, 69, 0.1)',
    boxShadow: '0 0 10px rgba(21, 162, 69, 0.2)'
  }),
  opacity: disabled ? 0.6 : 1
}));

const AttemptResults = ({ attempt, onClose }) => {
  if (!attempt) return null;

  return (
    <Box sx={{ p: 2, background: colors.lightBlue, borderRadius: '8px', mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: colors.darkBlue }}>
          Quiz Results: {attempt.quiz_title}
        </Typography>
        <Button onClick={onClose} size="small" sx={{ color: colors.darkBlue }}>
          Close
        </Button>
      </Box>
      
      <Box sx={{ mb: 2, p: 1.5, background: colors.white, borderRadius: '8px' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', color: colors.black }}>
          Score: {attempt.score}%
        </Typography>
        <Typography variant="body2" sx={{ color: colors.darkGray }}>
          Completed on: {new Date(attempt.completed_at).toLocaleString()}
        </Typography>
        {attempt.offline && (
          <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
            This attempt was submitted offline and will sync when you're back online.
          </Alert>
        )}
      </Box>
      
      <Typography variant="h6" sx={{ mb: 1, color: colors.darkBlue, fontSize: '1rem' }}>
        Question Review:
      </Typography>
      
      {attempt.answers && attempt.answers.map((answer, index) => (
        <Card key={index} sx={{ mb: 1.5, p: 1.5, background: colors.white }}>
          <Typography variant="subtitle2" sx={{ color: colors.black, fontWeight: 'bold' }}>
            Q{index + 1}: {answer.question_text}
          </Typography>
          
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="body2" sx={{ color: colors.darkGray }}>
              <strong>Your answer:</strong> {
                answer.selected_option_text || answer.written_answer || 'No answer provided'
              }
            </Typography>
            
            <Typography variant="body2" sx={{ 
              color: answer.is_correct ? colors.secondaryGreen : '#ff3860',
              fontWeight: 'bold'
            }}>
              <strong>Correct answer:</strong> {answer.correct_answer || answer.correct_answer_value}
            </Typography>
            
            <Box sx={{ 
              display: 'inline-block', 
              px: 1, 
              py: 0.5, 
              mt: 0.5,
              background: answer.is_correct ? 
                'rgba(21, 162, 69, 0.1)' : 'rgba(255, 56, 96, 0.1)',
              color: answer.is_correct ? colors.secondaryGreen : '#ff3860',
              borderRadius: '4px',
              fontSize: '0.7rem'
            }}>
              {answer.is_correct ? 'Correct' : 'Incorrect'}
            </Box>
          </Box>
          
          {answer.hints_used > 0 && (
            <Typography variant="body2" sx={{ color: colors.darkGray, fontSize: '0.8rem' }}>
              Hints used: {answer.hints_used}
            </Typography>
          )}
        </Card>
      ))}
    </Box>
  );
};

const QuestionCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  background: colors.white,
  border: `1px solid ${colors.lightGray}`,
  boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
  position: 'relative',
  overflow: 'hidden',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${colors.secondaryGreen}, ${colors.primaryBlue})`,
  }
}));
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const QuizDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attempts, setAttempts] = useState({});
  const [hintsShown, setHintsShown] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [quizEnded, setQuizEnded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const timerRef = useRef(null);
  const [loading, setLoading] = useState({
    quizzes: false,
    quizDetails: false,
    submission: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [error, setError] = useState('');
  const [attemptedQuizzes, setAttemptedQuizzes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('up-to-date');
  const [resultsShownOnce, setResultsShownOnce] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState({});
  const [endTimestamp, setEndTimestamp] = useState(null); 
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [totalHintsUsed, setTotalHintsUsed] = useState(0);
  const [emptySubmission, setEmptySubmission] = useState(false);
  
  const formatTimeRemaining = (milliseconds) => {
  if (!milliseconds || milliseconds <= 0) return null;
  const seconds = Math.floor((milliseconds / 1000) % 60);
  const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
  const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

const getQuizStatus = (quiz) => {
  if (quiz.is_active_now) return 'active';
  if (quiz.time_until_active > 0) return 'upcoming';
  return 'expired';
};
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const formattedTime = useMemo(() => {
    if (timeLeft === null) return null;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [timeLeft]);

  const currentQuestion = useMemo(() => {
    return selectedQuiz?.questions?.[currentQuestionIndex];
  }, [selectedQuiz, currentQuestionIndex]);
  const quizProgress = useMemo(() => {
    if (!selectedQuiz) return 0;
    return ((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100;
  }, [currentQuestionIndex, selectedQuiz]);
  const maxAttemptsReached = useMemo(() => {
    if (!currentQuestion) return false;
    const questionId = currentQuestion.question_id;
    return currentQuestion.max_attempts && (attempts[questionId] || 0) >= currentQuestion.max_attempts;
  }, [currentQuestion, attempts]);
const fetchQuizzes = useCallback(async () => {
  try {
    setLoading(prev => ({ ...prev, quizzes: true }));
    setError('');
    try {
      const response = await axios.get(`${process.env.REACT_APP_TAKE_QUIZ_URL}/quizzes`, {
        params: { 
          userId: user.user_id,
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery
        }
      });
      const quizzesWithStatus = response.data.data.map(quiz => ({
        ...quiz,
        status: getQuizStatus(quiz)
      }));
      
      setQuizzes(quizzesWithStatus);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
      await localForage.setItem('quizzes', quizzesWithStatus);
      setSyncStatus('up-to-date');
    } catch (err) {
      if (!isOnline) {
        const cachedQuizzes = await localForage.getItem('quizzes');
        if (cachedQuizzes) {
          setQuizzes(cachedQuizzes);
          setSyncStatus('offline-cached');
          enqueueSnackbar('Showing cached quizzes - you are offline', { variant: 'warning' });
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
  } catch (err) {
    setError('Failed to load quizzes. Please try again later.');
    console.error('Quiz fetch error:', err);
  } finally {
    setLoading(prev => ({ ...prev, quizzes: false }));
  }
}, [user, pagination.page, pagination.limit, searchQuery, isOnline, enqueueSnackbar]);

  const debouncedFetchQuizzes = useMemo(() => debounce(fetchQuizzes, 500), [fetchQuizzes]);

  useEffect(() => {
    if (user?.user_id) {
      debouncedFetchQuizzes();
    }
  }, [user, debouncedFetchQuizzes]);
  const saveProgress = useCallback(async () => {
    if (!selectedQuiz || submitted || quizEnded) return;
    
    const progress = {
      quizId: selectedQuiz.quiz_id,
      attemptId: selectedQuiz.attemptId,
      currentQuestionIndex,
      answers,
      attempts,
      totalAttempts, 
      hintsShown,
      totalHintsUsed,
      timeLeft,
      lastSaved: new Date().toISOString(),
      version: 1
    };
    
    try {
      await localForage.setItem(`quiz_progress_${user.user_id}_${selectedQuiz.quiz_id}`, progress);
    } catch (err) {
      console.error('Failed to save progress locally', err);
    }
  }, [selectedQuiz, currentQuestionIndex, answers, attempts, totalAttempts, hintsShown, totalHintsUsed, timeLeft, user, submitted, quizEnded]);

  const cleanupOldProgress = useCallback(async () => {
    try {
      const keys = await localForage.keys();
      const userProgressKeys = keys.filter(key => key.startsWith(`quiz_progress_${user.user_id}_`));
      
      for (const key of userProgressKeys) {
        const progress = await localForage.getItem(key);
        if (progress && progress.lastSaved) {
          const lastSaved = new Date(progress.lastSaved);
          const now = new Date();
          const hoursDiff = (now - lastSaved) / (1000 * 60 * 60);
          
          if (hoursDiff > 24) {
            await localForage.removeItem(key);
          }
        }
      }
    } catch (err) {
      console.error('Error cleaning up old progress', err);
    }
  }, [user]);
  const startAttempt = useCallback(async (quizId) => {
    try {
      if (!isOnline) {
        throw new Error('You need to be online to start a new quiz attempt');
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_TAKE_QUIZ_URL}/quizzes/${quizId}/start`,
        { user_id: user.user_id }
      );
      
      if (response.data.error && response.data.attempted) {
        throw new Error(response.data.error);
      }
      
      return response.data.attempt_id;
    } catch (err) {
      console.error('Failed to start attempt', err);
      throw err;
    }
  }, [user, isOnline]);

const fetchQuizDetails = useCallback(async (quizId) => {
  try {
    setLoading(prev => ({ ...prev, quizDetails: true }));
    setError('');
    const response = await axios.get(
      `${process.env.REACT_APP_TAKE_QUIZ_URL}/quizzes/${quizId}`,
      { params: { userId: user.user_id } }
    );
    if (response.data.error) {
      if (response.data.available_at) {
        setError(`This quiz will be available in ${formatTimeRemaining(response.data.time_until_active)}`);
        return;
      } else if (response.data.expired) {
        setError('This quiz has expired and is no longer available');
        return;
      } else if (response.data.attempted) {
        setError(response.data.error);
        return;
      }
    }
const progress = await localForage.getItem(`quiz_progress_${user.user_id}_${quizId}`);
    let attemptId;
    
    if (progress) {
      if (!progress.quizId || !progress.attemptId || !progress.answers) {
        console.warn('Invalid progress data found, starting fresh');
        await localForage.removeItem(`quiz_progress_${user.user_id}_${quizId}`);
      } else {
        attemptId = progress.attemptId;
      }
    }
    
    if (!attemptId) {
      attemptId = await startAttempt(quizId);
    }
    setSelectedQuiz({
      ...response.data,
      attemptId
    });

    if (progress) {
      setCurrentQuestionIndex(progress.currentQuestionIndex);
      setAnswers(progress.answers);
      setAttempts(progress.attempts || {});
      setHintsShown(progress.hintsShown || {});
      setTimeLeft(progress.timeLeft);
      setShowInstructions(false);
      enqueueSnackbar('Resuming your previous quiz progress', { variant: 'info' });
    } else {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setAttempts({});
      setHintsShown({});
      setSubmitted(false);
      setScore(null);
      setQuizEnded(false);
      setFeedback(null);
      setIsFeedbackVisible(false);
      setShowInstructions(true);
      setEmptySubmission(false);
      if (response.data.duration_minutes) {
        setTimeLeft(response.data.duration_minutes * 60);
      } else {
        setTimeLeft(null);
      }
    }
  } catch (err) {
    if (err.response?.data?.error === 'This quiz is not yet available') {
      setError(`This quiz will be available in ${formatTimeRemaining(err.response.data.time_until_active)}`);
    } else if (err.response?.data?.expired) {
      setError('This quiz has expired and is no longer available');
    } else {
      setError(err.response?.data?.error || 'Failed to load quiz details');
    }
    console.error('Quiz details error:', err);
  } finally {
    setLoading(prev => ({ ...prev, quizDetails: false }));
  }
}, [user, startAttempt, enqueueSnackbar]);
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (selectedQuiz && !submitted && !quizEnded) {
        saveProgress();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedQuiz, submitted, quizEnded, saveProgress]);
  useEffect(() => {
    if (!selectedQuiz) return;
    
    const saveInterval = setInterval(() => {
      saveProgress();
    }, 30000);
    
    return () => clearInterval(saveInterval);
  }, [selectedQuiz, saveProgress]);
  
  useEffect(() => {
    if (user?.user_id) {
      cleanupOldProgress();
    }
  }, [user, cleanupOldProgress]);
  const calculateOfflineScore = useCallback((answerData, questions) => {
    if (!questions) return 0;
    
    const questionMap = new Map(questions.map(q => [q.question_id, q]));
    let correct = 0;
    
    answerData.forEach(answer => {
      const question = questionMap.get(answer.question_id);
      if (!question) return;
      
      let isCorrect = false;
      
      switch (question.type) {
        case 'multiple_choice':
          const option = question.options?.find(opt => opt.option_id.toString() === answer.answer);
          isCorrect = option?.is_correct || false;
          break;
          
        case 'true_false':
          isCorrect = answer.answer.toLowerCase() === question.correct_answer.toLowerCase();
          break;
          
        case 'short_answer':
          isCorrect = answer.answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
          break;
          
        default:
          isCorrect = false;
          break;
      }
      
      if (isCorrect) correct++;
    });
    
    return Math.round((correct / questions.length) * 100);
  }, []);

useEffect(() => {
  const initializeTimer = async () => {
    if (selectedQuiz && selectedQuiz.duration_minutes) {
      const storedEndTimestamp = await localForage.getItem(`quiz_end_${user.user_id}_${selectedQuiz.quiz_id}`);
      
      if (storedEndTimestamp) {
        const now = Date.now();
        const remainingSeconds = Math.max(0, Math.floor((storedEndTimestamp - now) / 1000));
        
        if (remainingSeconds > 0) {
          setTimeLeft(remainingSeconds);
          setEndTimestamp(storedEndTimestamp);
          return;
        }
      }
      
      const newEndTimestamp = Date.now() + (selectedQuiz.duration_minutes * 60 * 1000);
      setEndTimestamp(newEndTimestamp);
      await localForage.setItem(`quiz_end_${user.user_id}_${selectedQuiz.quiz_id}`, newEndTimestamp);
      setTimeLeft(selectedQuiz.duration_minutes * 60);
    } else {
      setTimeLeft(null);
    }
  };

  if (selectedQuiz && !submitted && !quizEnded) {
    initializeTimer();
  }
}, [selectedQuiz, submitted, quizEnded, user]);

const handleAutoSubmit = useCallback(async () => {
  try {
    setLoading(prev => ({ ...prev, submission: true }));
    setError('');
    const hasAnswers = Object.values(answers).some(answer => 
      answer && answer.toString().trim() !== ''
    );
    
    if (!hasAnswers) {
      setError('Quiz cannot be submitted without at least one answer');
      setQuizEnded(true);
      setSubmitted(true);
      setEmptySubmission(true);
      setScore(0);
      if (isOnline) {
        try {
          await axios.post(
            `${process.env.REACT_APP_TAKE_QUIZ_URL}/quizzes/${selectedQuiz.quiz_id}/complete-empty`,
            { 
              user_id: user.user_id,
              attempt_id: selectedQuiz.attemptId
            }
          );
        } catch (err) {
          console.error('Failed to mark empty completion:', err);
        }
      }
      
      await localForage.removeItem(`quiz_progress_${user.user_id}_${selectedQuiz.quiz_id}`);
      await localForage.removeItem(`quiz_end_${user.user_id}_${selectedQuiz.quiz_id}`);
      await fetchQuizzes();
      return;
    }

    const answerData = Object.entries(answers).map(([questionId, answer]) => ({
      question_id: parseInt(questionId),
      answer: typeof answer === 'object' ? JSON.stringify(answer) : (answer || '').toString(),
      attempts: totalAttempts[questionId] || 1,
      hints_used: hintsShown[questionId] ? 1 : 0
    }));

    if (isOnline) {
      const response = await axios.post(
        `${process.env.REACT_APP_TAKE_QUIZ_URL}/quizzes/${selectedQuiz.quiz_id}/attempt`,
        { 
          user_id: user.user_id, 
          answers: answerData,
          attempt_id: selectedQuiz.attemptId,
          total_hints_used: totalHintsUsed
        }
      );

      setScore(response.data.score);
      setSubmitted(true);
      try {
        const attemptResponse = await axios.get(
          `${process.env.REACT_APP_TAKE_QUIZ_URL}/attempts/${selectedQuiz.attemptId}`,
          {
            params: {
              userId: user.user_id,
              timestamp: Date.now()
            }
          }
        );
        setActiveAttempt(attemptResponse.data);
        setShowResults(true);
      } catch (err) {
        console.error('Failed to fetch attempt details after submission', err);
      }
      
      await fetchQuizzes();
      await localForage.removeItem(`quiz_progress_${user.user_id}_${selectedQuiz.quiz_id}`);
    } else {
      const offlineAttempt = {
        quiz_id: selectedQuiz.quiz_id,
        user_id: user.user_id,
        answers: answerData,
        total_hints_used: totalHintsUsed, 
        score: calculateOfflineScore(answerData, selectedQuiz.questions),
        completed_at: new Date().toISOString(),
        quiz_title: selectedQuiz.title,
        offline_id: `offline_${Date.now()}`
      };
      
      await localForage.setItem(`offline_attempt_${user.user_id}_${Date.now()}`, offlineAttempt);
      setScore(offlineAttempt.score);
      setActiveAttempt(offlineAttempt);
      setShowResults(true);
      enqueueSnackbar('Quiz submitted offline. Will sync when back online', { variant: 'info' });
    }

    if (!resultsShownOnce) {
      setResultsShownOnce(true);
      if (score >= 70) {
        confetti({
          particleCount: 100,
          spread: 70,
          colors: ['#073527', '#00ccff', '#ffcc00', '#aa00ff'],
          origin: { y: 0.6 }
        });
      }
    }

  } catch (err) {
    setError(err.response?.data?.error || 'Failed to submit quiz');
    console.error('Quiz submission error:', err);
  } finally {
    setLoading(prev => ({ ...prev, submission: false }));
  }
}, [answers, selectedQuiz, user, fetchQuizzes, attempts, hintsShown, isOnline, enqueueSnackbar, resultsShownOnce, score, calculateOfflineScore, totalHintsUsed]);

useEffect(() => {
  if (timeLeft === null || submitted || quizEnded || !endTimestamp) return;

  timerRef.current = setInterval(() => {
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((endTimestamp - now) / 1000));
    
    setTimeLeft(remainingSeconds);
    
    if (remainingSeconds <= 0) {
      clearInterval(timerRef.current);
      setQuizEnded(true);
      handleAutoSubmit();
    }
  }, 1000);

  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, [submitted, quizEnded, endTimestamp, handleAutoSubmit]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    saveProgress();
  }, [saveProgress]);

  const playFeedbackSound = useCallback((isCorrect) => {
    const audio = new Audio(isCorrect 
      ? 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'
      : 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'
    );
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }, []);

  const checkAnswerCorrectness = useCallback((question, answer) => {
    if (!answer) return false;
    
    switch (question.type) {
      case 'multiple_choice':
        const selectedOption = question.options.find(opt => opt.option_id.toString() === answer);
        return selectedOption ? selectedOption.is_correct : false;
        
      case 'true_false':
        return answer.toLowerCase() === question.correct_answer.toLowerCase();
        
      case 'short_answer':
        return answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
        
      default:
        return false;
    }
  }, []);
  const getCorrectAnswerText = useCallback((question) => {
    switch (question.type) {
      case 'multiple_choice':
        const correctOption = question.options.find(opt => opt.is_correct);
        return correctOption ? correctOption.option_text : '';
        
      case 'true_false':
      case 'short_answer':
        return question.correct_answer;
        
      default:
        return '';
    }
  }, []);

  const getRandomFeedback = useCallback((isCorrect, correctAnswer) => {
    const messages = isCorrect ? [
      "Awesome! You nailed it!",
      "Brilliant! You're on fire!",
      "Perfect! You're a quiz master!",
      "Correct! You're unstoppable!",
      "Spot on! Keep it up!"
    ] : [
      `Oops! The answer was ${correctAnswer}`,
      `Not quite! It was ${correctAnswer}`,
      `Almost! The correct answer was ${correctAnswer}`,
      `Better luck next time! It was ${correctAnswer}`,
      `Don't worry! The right answer was ${correctAnswer}`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);
  const handleShowHint = useCallback(() => {
    if (!currentQuestion) return;
    setHintsShown(prev => ({
      ...prev,
      [currentQuestion.question_id]: true
    }));
    setTotalHintsUsed(prev => prev + 1);
    
    saveProgress();
  }, [currentQuestion, saveProgress]);
const handleShowFeedback = useCallback(() => {
  if (!currentQuestion) return;
  
  const questionId = currentQuestion.question_id;
  if (!answers[questionId]) {
    setError('Please provide at least one answer to proceed');
    return;
  }
  const currentTotalAttempts = (totalAttempts[questionId] || 0) + 1;
  setAttempts(prev => ({
    ...prev,
    [questionId]: (prev[questionId] || 0) + 1,
  }));
  
  setTotalAttempts(prev => ({
    ...prev,
    [questionId]: currentTotalAttempts,
  }));

  const isCorrect = checkAnswerCorrectness(currentQuestion, answers[questionId]);
  const correctAnswer = getCorrectAnswerText(currentQuestion);

  setFeedback({
    isCorrect,
    message: isCorrect
      ? currentQuestion.feedback_correct || getRandomFeedback(true, correctAnswer)
      : currentQuestion.feedback_incorrect || getRandomFeedback(false, correctAnswer),
  });

  playFeedbackSound(isCorrect);
  setIsFeedbackVisible(true);
  saveProgress();
}, [answers, currentQuestion, saveProgress, checkAnswerCorrectness, getCorrectAnswerText, getRandomFeedback, playFeedbackSound, totalAttempts]);
  const handleContinue = useCallback(() => {
    setIsFeedbackVisible(false);
    setFeedback(null);
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
    }
    saveProgress();
  }, [currentQuestionIndex, selectedQuiz, saveProgress]);

  const handleTryAgain = useCallback(() => {
      setIsFeedbackVisible(false);
      setFeedback(null);
      setAnswers(prev => ({...prev, [currentQuestion.question_id]: undefined}));
      saveProgress();
  }, [currentQuestion, saveProgress]);

const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
  if (!isAutoSubmit && currentQuestionIndex === selectedQuiz.questions.length - 1 && !isFeedbackVisible) {
    if (answers[currentQuestion.question_id]) {
      handleShowFeedback();
    } else {
      setError('Please provide at least one answer to proceed');
    }
    return;
  }
  
  try {
    setLoading(prev => ({ ...prev, submission: true }));
    setError('');
    const hasAnswers = Object.values(answers).some(answer => 
      answer && answer.toString().trim() !== ''
    );
    
    if (!hasAnswers) {
      setError('Please provide at least one answer to proceed');
      setLoading(prev => ({ ...prev, submission: false }));
      return;
    }

    const answerData = Object.entries(answers).map(([questionId, answer]) => ({
      question_id: parseInt(questionId),
      answer: typeof answer === 'object' ? JSON.stringify(answer) : (answer || '').toString(),
      attempts: totalAttempts[questionId] || 1,
      hints_used: hintsShown[questionId] ? 1 : 0
    }));

    if (isOnline) {
      const response = await axios.post(
        `${process.env.REACT_APP_TAKE_QUIZ_URL}/quizzes/${selectedQuiz.quiz_id}/attempt`,
        { 
          user_id: user.user_id, 
          answers: answerData,
          attempt_id: selectedQuiz.attemptId,
          total_hints_used: totalHintsUsed
        }
      );

      setScore(response.data.score);
      setSubmitted(true);
      try {
        const attemptResponse = await axios.get(
          `${process.env.REACT_APP_TAKE_QUIZ_URL}/attempts/${selectedQuiz.attemptId}`,
          {
            params: {
              userId: user.user_id,
              timestamp: Date.now()
            }
          }
        );
        setActiveAttempt(attemptResponse.data);
        setShowResults(true);
      } catch (err) {
        console.error('Failed to fetch attempt details after submission', err);
      }
      
      await fetchQuizzes();
      await localForage.removeItem(`quiz_progress_${user.user_id}_${selectedQuiz.quiz_id}`);
      await localForage.removeItem(`quiz_end_${user.user_id}_${selectedQuiz.quiz_id}`);
    } else {
      const offlineAttempt = {
        quiz_id: selectedQuiz.quiz_id,
        user_id: user.user_id,
        answers: answerData,
        total_hints_used: totalHintsUsed, 
        score: calculateOfflineScore(answerData, selectedQuiz.questions),
        completed_at: new Date().toISOString(),
        quiz_title: selectedQuiz.title
      };
      
      await localForage.setItem(`offline_attempt_${user.user_id}_${Date.now()}`, offlineAttempt);
      setScore(offlineAttempt.score);
      setSubmitted(true);
      setActiveAttempt(offlineAttempt);
      setShowResults(true);
      enqueueSnackbar('Quiz submitted offline. Will sync when back online', { variant: 'info' });
    }
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to submit quiz');
    console.error('Quiz submission error:', err);
  } finally {
    setLoading(prev => ({ ...prev, submission: false }));
  }
}, [answers, selectedQuiz, user, fetchQuizzes, attempts, hintsShown, isOnline, enqueueSnackbar, currentQuestionIndex, isFeedbackVisible, handleShowFeedback, calculateOfflineScore, totalHintsUsed]);

const viewAttemptResults = useCallback(async (attemptIdOrObject) => {
  try {
    setLoading(prev => ({ ...prev, quizDetails: true }));
    setError('');
    let attemptData;
    if (typeof attemptIdOrObject === 'object') {
      attemptData = attemptIdOrObject;
    } else {
     
      const response = await axios.get(
        `${process.env.REACT_APP_TAKE_QUIZ_URL}/attempts/${attemptIdOrObject}`,
        {
          params: {
            userId: user.user_id,
            timestamp: Date.now()
          }
        }
      );
      attemptData = response.data;
    }
    if (!attemptData) throw new Error('Attempt not found');
    
    setActiveAttempt(attemptData);
    setShowResults(true);
  } catch (err) {
    setError('Failed to load attempt details');
    console.error('Attempt details error:', err);
  } finally {
    setLoading(prev => ({ ...prev, quizDetails: false }));
  }
}, [user, selectedQuiz]);
  const handleStartQuiz = useCallback(() => {
    setShowInstructions(false);
    saveProgress();
  }, [saveProgress]);
  useEffect(() => {
    if (!isOnline) return;
    
    const syncOfflineAttempts = async () => {
      try {
        const keys = await localForage.keys();
        const offlineAttemptKeys = keys.filter(key => key.startsWith(`offline_attempt_${user.user_id}_`));
        
        for (const key of offlineAttemptKeys) {
          const attempt = await localForage.getItem(key);
          
          try {
            await axios.post(
              `${process.env.REACT_APP_TAKE_QUIZ_URL}/quizzes/${attempt.quiz_id}/attempt`,
              {
                user_id: user.user_id,
                answers: attempt.answers,
                attempt_id: null,
                total_hints_used: attempt.total_hints_used || 0
              }
            );
            
            await localForage.removeItem(key);
            enqueueSnackbar('Offline quiz attempt synced successfully', { variant: 'success' });
          } catch (err) {
            console.error('Failed to sync offline attempt', err);
          }
        }
        
        await fetchQuizzes();
      } catch (err) {
        console.error('Error syncing offline attempts', err);
      }
    };
    
    syncOfflineAttempts();
  }, [isOnline, user, fetchQuizzes, enqueueSnackbar]);

  const renderQuestionInput = useCallback((question, currentAnswer) => {
    const disabled = maxAttemptsReached;

    switch (question.type) {
      case 'multiple_choice':
        return (
          <FormControl component="fieldset" fullWidth disabled={disabled}>
            <RadioGroup
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
            >
              {question.options?.map((option) => (
                <OptionItem 
                  key={option.option_id}
                  selected={currentAnswer === option.option_id.toString()}
                  onClick={() => !disabled && handleAnswerChange(question.question_id, option.option_id.toString())}
                  disabled={disabled}
                >
                  <FormControlLabel
                    value={option.option_id.toString()}
                    control={<Radio size="small" sx={{ color: disabled ? colors.darkGray : colors.primaryBlue }} />}
                    label={<Typography variant="body2" sx={{ color: disabled ? colors.darkGray : colors.black }}>{option.option_text}</Typography>}
                    disabled={disabled}
                  />
                </OptionItem>
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'true_false':
        return (
          <FormControl component="fieldset" fullWidth disabled={disabled}>
            <RadioGroup
              value={currentAnswer || ''}
              onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
            >
              <OptionItem 
                selected={currentAnswer === 'true'}
                onClick={() => !disabled && handleAnswerChange(question.question_id, 'true')}
                disabled={disabled}
              >
                <FormControlLabel 
                  value="true" 
                  control={<Radio size="small" sx={{ color: disabled ? colors.darkGray : colors.primaryBlue }} />} 
                  label={<Typography variant="body2" sx={{ color: disabled ? colors.darkGray : colors.black }}>True</Typography>} 
                  disabled={disabled}
                />
              </OptionItem>
              <OptionItem 
                selected={currentAnswer === 'false'}
                onClick={() => !disabled && handleAnswerChange(question.question_id, 'false')}
                disabled={disabled}
              >
                <FormControlLabel 
                  value="false" 
                  control={<Radio size="small" sx={{ color: disabled ? colors.darkGray : colors.primaryBlue }} />} 
                  label={<Typography variant="body2" sx={{ color: disabled ? colors.darkGray : colors.black }}>False</Typography>} 
                  disabled={disabled}
                />
              </OptionItem>
            </RadioGroup>
          </FormControl>
        );

      case 'short_answer':
        return (
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            variant="outlined"
            placeholder="Type your answer here..."
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
            size="small"
            disabled={disabled}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: colors.lightGray,
                },
                '&:hover fieldset': {
                  borderColor: colors.primaryBlue,
                },
                '&.Mui-focused fieldset': {
                  borderColor: colors.primaryBlue,
                },
                color: colors.black,
                background: colors.white,
                borderRadius: '8px'
              },
              '& .MuiInputBase-input.Mui-disabled': {
                color: colors.darkGray,
                WebkitTextFillColor: colors.darkGray
              }
            }}
          />
        );

      default:
        return (
          <Alert severity="warning" sx={{ mb: 1, fontSize: '0.8rem' }}>
            Unsupported question type: {question.type}
          </Alert>
        );
    }
  }, [maxAttemptsReached, handleAnswerChange]);
  const renderQuestion = useCallback(() => {
    if (!currentQuestion) return null;

    const currentAnswer = answers[currentQuestion.question_id];
    const attemptsLeft = currentQuestion.max_attempts 
      ? currentQuestion.max_attempts - (attempts[currentQuestion.question_id] || 0)
      : null;
      
      return (
        <Box sx={{ mb: 1, p: 1.5, background: colors.white, borderRadius: '8px', border: `1px solid ${colors.lightGray}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', color: colors.black, fontWeight: 'bold' }}>
              {currentQuestion.question_text}
            </Typography>
            
            {attemptsLeft !== null && (
              <Box sx={{ 
                ml: 1,
                px: 1,
                py: 0.5,
                background: attemptsLeft <= 1 
                  ? 'linear-gradient(90deg, #ff3860 0%, #ff144d 100%)'
                  : attemptsLeft <= 3 
                    ? 'linear-gradient(90deg, #ffaa00 0%, #ff8800 100%)'
                    : 'linear-gradient(90deg, #15A245 0%, #80C41C 100%)',
                color: colors.white,
                fontWeight: 'bold',
                fontSize: '0.7rem',
                borderRadius: '12px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                Attempts Left: {attemptsLeft}
              </Box>
            )}
          </Box>

          {currentQuestion.hint && (
            <Box sx={{ mb: 1.5 }}>
              <Button
                startIcon={<HelpIcon fontSize="small" sx={{ color: colors.primaryBlue }} />}
                onClick={handleShowHint}
                disabled={hintsShown[currentQuestion.question_id]}
                size="small"
                sx={{ 
                  fontSize: '0.7rem',
                  color: hintsShown[currentQuestion.question_id] ? colors.darkGray : colors.primaryBlue,
                  '&:hover': {
                    background: 'rgba(0, 114, 187, 0.1)'
                  }
                }}
              >
                {hintsShown[currentQuestion.question_id] ? 'Hint Shown' : 'Show Hint'}
              </Button>
              
              <Collapse in={hintsShown[currentQuestion.question_id]}>
                <Paper elevation={0} sx={{ 
                  p: 1, 
                  mt: 0.5, 
                  background: 'rgba(0, 114, 187, 0.1)',
                  border: `1px solid ${colors.primaryBlue}`,
                  borderRadius: '8px'
                }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: colors.black }}>
                    {currentQuestion.hint}
                  </Typography>
                </Paper>
              </Collapse>
            </Box>
          )}

          {currentQuestion.media_url && (
            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
              <img 
                src={currentQuestion.media_url} 
                alt="Question media"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '200px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: `1px solid ${colors.lightGray}`
                }} 
              />
            </Box>
          )}

          {renderQuestionInput(currentQuestion, currentAnswer)}
        </Box>
      );
    }, [currentQuestion, answers, attempts, hintsShown, handleShowHint, renderQuestionInput]);

  const renderFeedbackScreen = useCallback(() => {
      if (!feedback) return null;
      const canTryAgain = !maxAttemptsReached && !feedback.isCorrect;

      return (
          <QuestionCard>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  {feedback.isCorrect ? (
                      <>
                          <SentimentVerySatisfied sx={{ 
                            fontSize: 40, 
                            mb: 1,
                            color: colors.secondaryGreen,
                            filter: 'drop-shadow(0 0 8px rgba(21, 162, 69, 0.5))'
                          }} />
                          <Typography variant="subtitle1" sx={{ 
                            color: colors.secondaryGreen,
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            textShadow: '0 0 5px rgba(21, 162, 69, 0.3)'
                          }}>
                              Correct!
                          </Typography>
                      </>
                  ) : (
                      <>
                          <SentimentDissatisfied sx={{ 
                            fontSize: 40, 
                            mb: 1,
                            color: '#ff3860',
                            filter: 'drop-shadow(0 0 8px rgba(255, 56, 96, 0.3))'
                          }} />
                          <Typography variant="subtitle1" sx={{ 
                            color: '#ff3860',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            textShadow: '0 0 5px rgba(255, 56, 96, 0.2)'
                          }}>
                              Incorrect
                          </Typography>
                      </>
                  )}
                  <Typography variant="body2" sx={{ 
                    mb: 1.5, 
                    fontSize: '0.8rem',
                    color: colors.black
                  }}>
                      {feedback.message}
                  </Typography>

                  <Box sx={{display: 'flex', justifyContent: 'center', gap: 1}}>
                    {canTryAgain && (
                         <Button 
                           variant="outlined" 
                           size="small" 
                           onClick={handleTryAgain}
                           sx={{
                             color: colors.primaryBlue,
                             borderColor: colors.primaryBlue,
                             '&:hover': {
                               background: 'rgba(0, 114, 187, 0.1)',
                               borderColor: colors.primaryBlue
                             }
                           }}
                         >
                            Try Again
                         </Button>
                    )}
                    {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
                        <Button 
                          variant="contained" 
                          size="small" 
                          onClick={handleContinue}
                          sx={{
                            background: `linear-gradient(90deg, ${colors.primaryBlue} 0%, ${colors.darkBlue} 100%)`,
                            '&:hover': {
                              background: `linear-gradient(90deg, ${colors.darkBlue} 0%, ${colors.primaryBlue} 100%)`
                            }
                          }}
                        >
                            Continue
                        </Button>
                    ) : (
                       <Button
                            variant="contained"
                            onClick={() => handleSubmitQuiz()}
                            disabled={loading.submission}
                            endIcon={loading.submission ? <CircularProgress size={16} /> : null}
                            size="small"
                            sx={{
                              background: `linear-gradient(90deg, ${colors.secondaryGreen} 0%, ${colors.accentGreen} 100%)`,
                              '&:hover': {
                                background: `linear-gradient(90deg, ${colors.accentGreen} 0%, ${colors.secondaryGreen} 100%)`
                              }
                            }}
                        >
                            {loading.submission ? 'Submitting...' : 'Submit Quiz'}
                       </Button>
                    )}
                  </Box>
              </CardContent>
          </QuestionCard>
      );
  }, [feedback, maxAttemptsReached, currentQuestionIndex, selectedQuiz, loading.submission, handleTryAgain, handleContinue, handleSubmitQuiz]);
  const uiProps = {
    quizzes,
    selectedQuiz,
    currentQuestionIndex,
    answers,
    attempts,
    hintsShown,
    timeLeft,
    quizEnded,
    showInstructions,
    loading,
    submitted,
    score,
    error,
    attemptedQuizzes,
    pagination,
    searchQuery,
    showResults,
    activeAttempt,
  viewAttemptResults,
    feedback,
    isFeedbackVisible,
    isOnline,
    syncStatus,
    resultsShownOnce,
    formattedTime,
    currentQuestion,
    quizProgress,
    maxAttemptsReached,
    emptySubmission,
    setSearchQuery,
    setSelectedQuiz,
    setCurrentQuestionIndex,
    setShowResults,
    setActiveAttempt, 
    setIsFeedbackVisible,
    setPagination,
    
    fetchQuizDetails,
    handleAnswerChange,
    handleShowHint,
    handleShowFeedback,
    handleContinue,
    handleTryAgain,
    handleSubmitQuiz,
    viewAttemptResults,
    handleStartQuiz,
    renderQuestion,
    renderFeedbackScreen
  };

return (
  <Box sx={{ p: 0 }}>
    <QuizDashboardUI {...uiProps} />
  </Box>
);
};

export default QuizDashboard;