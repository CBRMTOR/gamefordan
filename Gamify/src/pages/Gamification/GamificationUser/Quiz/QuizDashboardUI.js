import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box, Container, Typography, Card, CardContent, CardHeader,
  Button, LinearProgress, Alert, TextField, Grid,
  CircularProgress, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Pagination, Divider,
  Chip, Avatar, useMediaQuery, useTheme, Tooltip
} from '@mui/material';
import {
  Quiz as QuizIcon, ArrowBack, ArrowForward, Check, Close,
  Timer, Visibility, Star, StarBorder, Notifications, ChevronDown,
  Rocket, Bolt, QuestionAnswer, Schedule
} from '@mui/icons-material';
import { MonetizationOn as Coins, EmojiEvents as Trophy } from '@mui/icons-material';

import { styled } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
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

const QuizCard = styled(Card)(({ theme }) => ({
  background: colors.white,
  borderRadius: '12px',
  padding: '1.8rem',
  boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.4s ease',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  border: '2px solid transparent',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 12px 25px rgba(0, 0, 0, 0.15)',
    borderColor: colors.lightBlue,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    background: `linear-gradient(90deg, ${colors.secondaryGreen}, ${colors.primaryBlue})`,
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: 'transform 0.4s ease',
  },
  '&:hover::before': {
    transform: 'scaleX(1)',
  },
  animation: 'slideIn 0.6s ease forwards',
  opacity: 0,
}));

const QuestionCard = styled(Card)(({ theme }) => ({
  background: colors.white,
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '0.5rem',
  boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  border: `2px solid ${colors.lightGray}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    background: `linear-gradient(90deg, ${colors.secondaryGreen}, ${colors.primaryBlue})`,
  },
}));

const TimerBox = styled(Box)(({ theme, timecritical }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(1),
  borderRadius: '20px',
  background: timecritical === 'true' 
    ? 'linear-gradient(90deg, #ff6b6b 0%, #ff3860 100%)'
    : `linear-gradient(90deg, ${colors.secondaryGreen} 0%, ${colors.primaryBlue} 100%)`,
  color: colors.white,
  marginBottom: theme.spacing(1),
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  fontWeight: 'bold',
  fontSize: '0.9rem'
}));

const BackgroundElements = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: -1,
  overflow: 'hidden',
  pointerEvents: 'none',
});

const Circle = styled(Box)({
  position: 'absolute',
  borderRadius: '50%',
  opacity: 0.06,
  animation: 'float 25s infinite ease-in-out',
});

const Footer = styled(Box)({
  background: `linear-gradient(135deg, ${colors.darkBlue} 0%, ${colors.primaryBlue} 100%)`,
  color: colors.white,
  padding: '2rem',
  textAlign: 'center',
  marginTop: '3rem',
  borderTopLeftRadius: '20px',
});

const ProgressContainer = styled(Box)({
  width: '100%',
  height: '8px',
  background: colors.lightGray,
  borderRadius: '4px',
  margin: '1rem 0',
  overflow: 'hidden',
});

const ProgressBar = styled(Box)({
  height: '100%',
  background: `linear-gradient(90deg, ${colors.primaryBlue} 0%, ${colors.secondaryGreen} 100%)`,
  borderRadius: '4px',
  width: '65%',
  animation: 'progressAnimation 1.5s ease-in-out',
});
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
const MemoizedQuizCard = React.memo(({ quiz, index, loading, fetchQuizDetails, attemptedQuizzes }) => {
  const isAttempted = quiz.attempted || attemptedQuizzes.some(a => a.quiz_id === quiz.quiz_id);
  const status = quiz.status || getQuizStatus(quiz);
  
  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <Chip 
            label="Active" 
            sx={{ 
              background: colors.secondaryGreen,
              color: colors.white,
              padding: '5px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              height: 'auto',
              flexShrink: 0,
            }}
          />
        );
      case 'upcoming':
        return (
          <Chip 
            label={`Starts in ${formatTimeRemaining(quiz.time_until_active)}`} 
            sx={{ 
              background: colors.yellow,
              color: colors.black,
              padding: '5px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              height: 'auto',
              flexShrink: 0,
            }}
          />
        );
      case 'expired':
        return (
          <Chip 
            label="Expired" 
            sx={{ 
              background: '#ff3860',
              color: colors.white,
              padding: '5px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              height: 'auto',
              flexShrink: 0,
            }}
          />
        );
      default:
        return (
          <Chip 
            label={quiz.difficulty || "Quiz"} 
            sx={{ 
              background: colors.primaryBlue,
              color: colors.white,
              padding: '5px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              height: 'auto',
              flexShrink: 0,
            }}
          />
        );
    }
  };

  const handleCardClick = () => {
    if (status !== 'active' || loading.quizDetails) return;
    fetchQuizDetails(quiz.quiz_id);
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (status !== 'active') return;
    fetchQuizDetails(quiz.quiz_id);
  };

  return (
    <QuizCard 
      sx={{ 
        animationDelay: `${0.1 + index * 0.1}s`,
        maxWidth: '350px',
        width: '100%',
        margin: '0 auto',
        opacity: status !== 'active' ? 0.7 : 1,
        cursor: status === 'active' && !loading.quizDetails ? 'pointer' : 'default'
      }}
      onClick={handleCardClick}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '1.2rem',
          gap: '0.5rem'
        }}>
          <Typography variant="h6" sx={{ 
            fontSize: '1.3rem',
            color: status === 'active' ? colors.darkBlue : colors.darkGray,
            fontWeight: 700,
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            flex: 1,
            lineHeight: 1.3,
          }}>
            {quiz.title}
          </Typography>
          {getStatusBadge()}
        </Box>
        
        <Box sx={{ 
          marginBottom: '1.5rem',
          flex: 1,
          minHeight: 0
        }}>
          <Typography variant="body2" sx={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: status === 'active' ? colors.darkGray : '#adb5bd',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}>
            {quiz.description}
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          color: status === 'active' ? colors.darkGray : '#adb5bd',
          fontSize: '0.9rem',
          marginBottom: '1.2rem'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <i className="far fa-question-circle" style={{ fontSize: '0.9rem' }} />
            <Typography variant="body2"> Questions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <i className="far fa-clock" style={{ fontSize: '0.9rem' }} />
            <Typography variant="body2">
              {quiz.duration_minutes || 15} Minutes
            </Typography>
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            color: status === 'active' ? colors.darkBlue : '#adb5bd',
            fontWeight: 600
          }}>
            <i className="fas fa-coins" style={{ color: status === 'active' ? colors.yellow : '#adb5bd', fontSize: '1rem' }} />
            <Typography variant="body2"> Points
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            disabled={loading.quizDetails || isAttempted || status !== 'active'}
            onClick={handleButtonClick}
            sx={{
              background: status === 'active' ? colors.primaryBlue : '#adb5bd',
              color: colors.white,
              padding: '10px 15px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textTransform: 'none',
              '&:hover': status === 'active' ? {
                background: colors.darkBlue,
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0, 114, 187, 0.3)',
              } : {},
              '&.Mui-disabled': {
                background: colors.darkGray,
                color: colors.white
              }
            }}
          >
            {isAttempted ? 'Completed' : status !== 'active' ? 'Not Available' : 'Start Quiz'}
          </Button>
        </Box>
      </Box>
    </QuizCard>
  );
});

const CircularProgressWithLabel = React.memo(({ value }) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress 
        variant="determinate" 
        value={value} 
        size={100}
        thickness={4}
        sx={{
          color: value >= 70 ? colors.secondaryGreen : value >= 50 ? colors.yellow : '#ff3860',
          filter: `drop-shadow(0 0 8px ${value >= 70 ? 'rgba(21, 162, 69, 0.5)' : 
                   value >= 50 ? 'rgba(255, 204, 0, 0.5)' : 'rgba(255, 56, 96, 0.5)'})`
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: value >= 70 ? colors.secondaryGreen : value >= 50 ? colors.yellow : '#ff3860',
            textShadow: `0 0 5px ${value >= 70 ? 'rgba(21, 162, 69, 0.5)' : 
                         value >= 50 ? 'rgba(255, 204, 0, 0.5)' : 'rgba(255, 56, 96, 0.5)'}`
          }}
        >
          {`${Math.round(value || 0)}%`}
        </Typography>
      </Box>
    </Box>
  );
});

const QuizDashboardUI = (props) => {
  const {
    quizzes,
    selectedQuiz,
    currentQuestionIndex,
    answers,
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
    isFeedbackVisible,
    isOnline,
    formattedTime,
    quizProgress,
    maxAttemptsReached,
    setSearchQuery,
    setSelectedQuiz,
    setCurrentQuestionIndex,
    setShowResults,
    setPagination,
    
    fetchQuizDetails,
    handleShowFeedback,
    handleSubmitQuiz,
    viewAttemptResults,
    handleStartQuiz,
    renderQuestion,
    renderFeedbackScreen
  } = props;

  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
  const { enqueueSnackbar } = useSnackbar();
  const backgroundElements = useMemo(() => {
    const elements = [];
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 100 + 20;
      const colorOptions = [colors.primaryBlue, colors.secondaryGreen, colors.accentGreen];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      elements.push(
        <Circle
          key={i}
          sx={{
            width: `${size}px`,
            height: `${size}px`,
            background: color,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${15 + Math.random() * 10}s`,
          }}
        />
      );
    }
    return elements;
  }, []);

  if (loading.quizzes) {
    return (
      <Box sx={{ 
        py: 2, 
        display: 'flex', 
        justifyContent: 'center',
        background: colors.lightBlue,
        minHeight: '100vh'
      }}>
        <CircularProgress size={24} sx={{ color: colors.secondaryGreen }} />
      </Box>
    );
  }

  const MainContent = () => (
     <Box sx={{ 
    height: '100%',
    width: '100%',
    overflow: 'auto'
  }}>
      <Box sx={{ 
        flex: 1,
        pt: '2rem',
        backgroundColor: colors.white,
        position: 'relative',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}>
        <BackgroundElements>
          {backgroundElements}
        </BackgroundElements>
        
        {!selectedQuiz ? (
          <Box>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 2,
              p: 2,
              background: colors.white,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              borderBottom: `3px solid ${colors.accentGreen}`
            }}>
              <Typography variant="h4" sx={{ 
                color: colors.darkBlue,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <QuizIcon sx={{ color: colors.secondaryGreen }} />
                Available Quizzes
              </Typography>
            </Box>
            
            {error && (
              <Alert severity="error" sx={{ 
                mb: 1, 
                fontSize: '0.8rem',
                background: 'rgba(255, 56, 96, 0.2)',
                color: colors.black,
                border: '1px solid rgba(255, 56, 96, 0.5)'
              }}>
                {error}
              </Alert>
            )}

            {loading.quizDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={24} sx={{ color: colors.secondaryGreen }} />
              </Box>
            ) : (
              <>
                {quizzes.length === 0 ? (
                  <Card sx={{
                    background: colors.white,
                    border: `1px solid ${colors.lightGray}`,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}>
                    <CardContent>
                      <Typography variant="body2" sx={{ 
                        py: 2,
                        color: colors.darkGray,
                        textAlign: 'center' 
                      }}>
                        {searchQuery ? 'No quizzes match your search.' : 'No quizzes available at the moment.'}
                      </Typography>
                    </CardContent>
                  </Card>
                ) : (
<Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
  {quizzes.map((quiz, index) => (
    <Grid item xs={12} sm={6} md={4} key={quiz.quiz_id} sx={{ display: 'flex' }}>
      <MemoizedQuizCard 
        quiz={quiz} 
        index={index} 
        loading={loading}
        fetchQuizDetails={fetchQuizDetails}
        attemptedQuizzes={attemptedQuizzes}
      />
    </Grid>
  ))}
</Grid>
                )}
                
                {pagination.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                      count={pagination.totalPages}
                      page={pagination.page}
                      onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
                      sx={{
                        '& .MuiPaginationItem-root': {
                          color: colors.darkBlue
                        },
                        '& .Mui-selected': {
                          background: `${colors.primaryBlue} !important`,
                          color: colors.white,
                          border: `1px solid ${colors.secondaryGreen}`
                        }
                      }}
                      size="small"
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        ) : (
          <Box>

            {showInstructions && !submitted ? (
              <QuestionCard>
                <CardContent>
                  <Typography variant="h4" gutterBottom sx={{ 
                    fontSize: '1.1rem',
                    color: colors.darkBlue,
                    fontWeight: 'bold'
                  }}>
                    {selectedQuiz.title}
                  </Typography>
                  <Typography variant="body2" gutterBottom sx={{ 
                    mb: 2,
                    color: colors.darkGray
                  }}>
                    {selectedQuiz.description}
                  </Typography>
                  {selectedQuiz.instructions && (
                    <Alert severity="info" sx={{ 
                      mb: 2, 
                      fontSize: '0.8rem',
                      background: colors.lightBlue,
                      color: colors.darkBlue,
                      border: `1px solid ${colors.primaryBlue}`,
                      whiteSpace: 'pre-wrap' 
                    }}>
                      <Typography variant="subtitle2" sx={{ 
                        fontSize: '0.8rem',
                        color: colors.darkBlue,
                        fontWeight: 'bold'
                      }}>
                        Instructions:
                      </Typography>
                      {selectedQuiz.instructions}
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleStartQuiz}
                    fullWidth
                    size="small"
                    sx={{
                      background: `linear-gradient(90deg, ${colors.secondaryGreen} 0%, ${colors.primaryBlue} 100%)`,
                      '&:hover': {
                        background: `linear-gradient(90deg, ${colors.primaryBlue} 0%, ${colors.darkBlue} 100%)`
                      }
                    }}
                  >
                    Start Quiz
                  </Button>
                </CardContent>
              </QuestionCard>
            ) : !submitted ? (
              <>
                {selectedQuiz && timeLeft !== null && (
                  <TimerBox timecritical={timeLeft <= 60 ? 'true' : 'false'}>
                    <Timer sx={{ mr: 0.5, fontSize: '1rem' }} />
                    <Typography variant="subtitle2">
                      Time: {formattedTime}
                    </Typography>
                  </TimerBox>
                )}

                {selectedQuiz && timeLeft !== null && timeLeft <= 60 && (
                  <Alert severity="warning" sx={{ 
                    mb: 1, 
                    fontSize: '0.8rem',
                    background: 'rgba(255, 170, 0, 0.2)',
                    color: colors.black,
                    border: '1px solid rgba(255, 170, 0, 0.5)'
                  }}>
                    Time is running out! You have less than 1 minute remaining.
                  </Alert>
                )}

                <Box>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 1,
                    p: 1,
                    background: colors.white,
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    <Typography variant="body2" sx={{ color: colors.darkBlue }}>
                      Q{currentQuestionIndex + 1}/{selectedQuiz.questions.length}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={quizProgress} 
                      sx={{ 
                        width: '100px', 
                        height: '8px', 
                        borderRadius: '4px',
                        background: colors.lightGray,
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, ${colors.primaryBlue} 0%, ${colors.secondaryGreen} 100%)`
                        }
                      }} 
                    />
                  </Box>

                  {isFeedbackVisible ? renderFeedbackScreen() : renderQuestion()}
{!isFeedbackVisible && (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    mt: 1.5,
    background: colors.white,
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  }}>
    {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
      <Tooltip 
        title={!answers[selectedQuiz.questions[currentQuestionIndex].question_id] ? 
          "Please provide at least one answer to proceed" : ""}
        placement="top"
      >
        <span> 
          <Button
            endIcon={<ArrowForward fontSize="small" sx={{ color: colors.white }} />}
            onClick={handleShowFeedback}
            variant="contained"
            disabled={loading.submission || maxAttemptsReached || !answers[selectedQuiz.questions[currentQuestionIndex].question_id]}
            size="small"
            sx={{
              background: `linear-gradient(90deg, ${colors.secondaryGreen} 0%, ${colors.primaryBlue} 100%)`,
              '&:hover': {
                background: `linear-gradient(90deg, ${colors.primaryBlue} 0%, ${colors.darkBlue} 100%)`
              },
              '&.Mui-disabled': {
                background: colors.darkGray
              }
            }}
          >
            Next
          </Button>
        </span>
      </Tooltip>
    ) : (
      <Button
        variant="contained"
        onClick={() => handleSubmitQuiz()}
        disabled={loading.submission || maxAttemptsReached}
        endIcon={loading.submission ? <CircularProgress size={16} /> : null}
        size="small"
        sx={{
          background: `linear-gradient(90deg, ${colors.secondaryGreen} 0%, ${colors.primaryBlue} 100%)`,
          '&:hover': {
            background: `linear-gradient(90deg, ${colors.primaryBlue} 0%, ${colors.darkBlue} 100%)`
          },
          '&.Mui-disabled': {
            background: colors.darkGray
          }
        }}
      >
        {loading.submission ? 'Submitting...' : 'Submit Quiz'}
      </Button>
    )}
  </Box>
)}

                </Box>
              </>
) : (
  <QuestionCard>
    <CardContent>
      <Typography variant="h4" gutterBottom sx={{ 
        fontSize: '1.1rem',
        color: colors.darkBlue,
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        Quiz Completed!
      </Typography>
      <Box sx={{ 
        width: '100%', 
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <CircularProgressWithLabel value={score} />
        <Typography variant="subtitle1" sx={{ 
          mt: 1, 
          fontSize: '0.9rem',
          color: colors.darkBlue,
          fontWeight: 'bold'
        }}>
          {score >= 90 ? 'Excellent work!' : 
           score >= 70 ? 'Good job!' : 
           score >= 50 ? 'Not bad!' : 
           'Keep practicing!'}
        </Typography>
        
        <Box sx={{ mt: 1, display: 'flex' }}>
          {[...Array(5)].map((_, i) => (
            score >= (i + 1) * 20 ? (
              <Star key={i} sx={{ color: colors.yellow }} />
            ) : (
              <StarBorder key={i} sx={{ color: colors.lightGray }} />
            )
          ))}
        </Box>
      </Box>
      
      {quizEnded && (
        <Typography variant="body2" sx={{ 
          mt: 1, 
          fontSize: '0.8rem',
          color: colors.darkGray,
          textAlign: 'center'
        }}>
          Your quiz was automatically submitted when time expired.
        </Typography>
      )}
      
      {!isOnline && (
        <Alert severity="info" sx={{ 
          mt: 1, 
          fontSize: '0.8rem',
          background: colors.lightBlue,
          color: colors.darkBlue,
          border: `1px solid ${colors.primaryBlue}`
        }}>
          Your quiz was submitted offline. It will sync with the server when you're back online.
        </Alert>
      )}
      
{activeAttempt && (
  <Box sx={{ 
    mt: 1, 
    background: colors.lightBlue, 
    borderRadius: '8px',
    maxHeight: { xs: 'none', sm: '400px' },
    overflowY: { xs: 'visible', sm: 'auto' }
  }}>
    <Typography variant="h6" sx={{ 
      color: colors.darkBlue, 
      fontSize: '1rem',
      mb: 1
    }}>
      Quiz Results
    </Typography>
    
    <Box sx={{ mb: 2, background: colors.white, borderRadius: '16px', p: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', color: colors.black, mb: { xs: 1, sm: 0 } }}>
          Score: {activeAttempt.score}%
        </Typography>
        <Typography variant="body2" sx={{ color: colors.darkGray, fontSize: '0.8rem' }}>
          Completed on: {new Date(activeAttempt.completed_at).toLocaleString()}
        </Typography>
      </Box>
    </Box>
    
    <Typography variant="subtitle2" sx={{ mb: 1, color: colors.darkBlue }}>
      Question Review:
    </Typography>
    
    {activeAttempt.answers && activeAttempt.answers.map((answer, index) => (
      <Box key={index} sx={{ 
        mb: 1, 
        p: 1, 
        background: colors.white, 
        borderRadius: '8px',
        border: `1px solid ${answer.is_correct ? colors.secondaryGreen : '#ff3860'}`
      }}>
        <Typography variant="body2" sx={{ 
          fontWeight: 'bold', 
          color: colors.black,
          fontSize: { xs: '0.9rem', sm: '1rem' },
          whiteSpace: 'pre-wrap'
        }}>
          Q{index + 1}: {answer.question_text}
        </Typography>
        
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="body2" sx={{ 
            color: colors.darkGray, 
            fontSize: { xs: '0.75rem', sm: '0.8rem' },
            wordBreak: 'break-word'
          }}>
            <strong>Your answer:</strong> {
              answer.selected_option_text || answer.written_answer || 'No answer provided'
            }
          </Typography>
          
          <Typography variant="body2" sx={{ 
            color: answer.is_correct ? colors.secondaryGreen : '#ff3860',
            fontSize: { xs: '0.75rem', sm: '0.8rem' },
            wordBreak: 'break-word'
          }}>
            <strong>Correct answer:</strong> {answer.correct_answer || answer.correct_answer_value}
          </Typography>
          
          <Box sx={{ 
            display: 'inline-block', 
            px: 0.5, 
            py: 0.2, 
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
      </Box>
    ))}
  </Box>
)}
      
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        mt: 2,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <Button 
          variant="contained" 
          onClick={() => setSelectedQuiz(null)}
          size="small"
          sx={{
            background: `linear-gradient(90deg, ${colors.secondaryGreen} 0%, ${colors.primaryBlue} 100%)`,
            '&:hover': {
              background: `linear-gradient(90deg, ${colors.primaryBlue} 0%, ${colors.darkBlue} 100%)`
            }
          }}
        >
          Back to Quizzes
        </Button>
      </Box>
    </CardContent>
  </QuestionCard>
)}
          </Box>
        )}
      </Box>
    </Box>
  );
  
  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.lightBlue} 0%, ${colors.white} 100%)`,
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <BackgroundElements>
        {backgroundElements}
      </BackgroundElements>
      <MainContent />
     
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes float {
            0% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(10deg);
            }
            100% {
              transform: translateY(0) rotate(0deg);
            }
          }
          
          @keyframes progressAnimation {
            0% {
              width: 0%;
            }
            100% {
              width: 65%;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default QuizDashboardUI;