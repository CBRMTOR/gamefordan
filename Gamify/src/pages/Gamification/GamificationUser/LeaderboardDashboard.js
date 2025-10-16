import {
  ArrowBackIos as ArrowBackIcon,
  ArrowForwardIos as ArrowForwardIcon,
  Replay as AttemptIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HintIcon,
  Person as PersonIcon,
  Stars as StarsIcon,
  Schedule as TimeIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Card,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Stack,
  styled,
  Tab,
  Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import axios from 'axios';
import confetti from 'canvas-confetti';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const LEADERBOARD_URL = process.env.REACT_APP_LEADERBOARD_URL;
const colors = {
  primaryBlue: '#0072BB',
  secondaryGreen: '#15A245',
  accentGreen: '#80C41C',
  darkBlue: '#004E80',
  lightBlue: '#E8F4FD',
  white: '#ffffff',
  black: '#212529',
  yellow: '#FFD700',
};

const StyledTableRow = styled(TableRow)(({ iscurrentuser }) => ({
  backgroundColor: iscurrentuser === 'true'
    ? `${colors.lightBlue}`
    : 'transparent',
  '&:hover': {
    backgroundColor: `${colors.lightBlue}80`,
  },
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: iscurrentuser === 'true' 
      ? `linear-gradient(to bottom, ${colors.secondaryGreen}, ${colors.primaryBlue})` 
      : 'transparent'
  }
}));
const LeaderboardRow = React.memo(({ 
  entry, 
  isCurrentUser, 
  isExpanded, 
  onRowClick, 
  formatUsername, 
  formatTime, 
  formatDate,
  isMobile 
}) => {
  return (
    <React.Fragment key={`${entry.quiz_id}-${entry.user_id}`}>
      <StyledTableRow 
        iscurrentuser={isCurrentUser.toString()}
        onClick={() => onRowClick(entry.user_id)}
        sx={{
          '& td': {
            color: colors.black,
            borderBottom: `1px solid ${colors.lightBlue}`,
            fontSize: isMobile ? '0.65rem' : '0.75rem',
            px: isMobile ? 0.5 : 2,
            py: isMobile ? 0.5 : 1,
            cursor: 'pointer'
          }
        }}
      >
        <TableCell>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: entry.rank <= 3 ? 700 : 500,
            color: entry.rank <= 3 ? 
              [colors.yellow, colors.primaryBlue, colors.secondaryGreen][entry.rank - 1] : 
              colors.darkBlue
          }}>
            {entry.rank}
            {entry.rank <= 3 && !isMobile && (
              <Box component="span" sx={{ ml: 0.5 }}>
                {['🥇', '🥈', '🥉'][entry.rank - 1]}
              </Box>
            )}
          </Box>
        </TableCell>
        <TableCell sx={{ minWidth: isMobile ? 100 : 120 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            {formatUsername(entry.username || entry.user?.username)}
            {isCurrentUser && (
              <Chip
                label="YOU"
                size="small"
                sx={{
                  ml: 0.5,
                  background: `linear-gradient(90deg, ${colors.secondaryGreen}, ${colors.primaryBlue})`,
                  color: colors.white,
                  fontSize: '0.55rem',
                  height: 16,
                  fontWeight: 700
                }}
              />
            )}
          </Box>
        </TableCell>
        <TableCell sx={{ 
          fontWeight: 600,
          color: entry.score >= 90 ? colors.secondaryGreen : 
                entry.score >= 70 ? colors.primaryBlue : 
                entry.score >= 50 ? colors.accentGreen : colors.darkBlue
        }}>
          {entry.score}%
        </TableCell>
      </StyledTableRow>
      <TableRow>
        <TableCell 
          style={{ padding: 0, borderBottom: isExpanded ? `1px solid ${colors.lightBlue}` : 'none' }} 
          colSpan={3}
        >
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ 
              p: 2, 
              backgroundColor: `${colors.lightBlue}40`,
              borderTop: `1px solid ${colors.lightBlue}`,
              borderBottom: `1px solid ${colors.lightBlue}`
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2,
                justifyContent: 'space-around'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttemptIcon sx={{ fontSize: 16, mr: 0.5, color: colors.primaryBlue }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colors.darkBlue }}>
                    Attempts: {entry.total_attempts || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HintIcon sx={{ fontSize: 16, mr: 0.5, color: colors.primaryBlue }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colors.darkBlue }}>
                    Hints: {entry.total_hints_used || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TimeIcon sx={{ fontSize: 16, mr: 0.5, color: colors.primaryBlue }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colors.darkBlue }}>
                    Time: {formatTime(entry.duration_seconds)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colors.darkBlue }}>
                    Submitted: {formatDate(entry.completed_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
});
const QuizChampions = React.memo(({ quizId, entries, isMobile, isTablet }) => {
  const topPerformers = entries.slice(0, 3);
  const cardWidth = isMobile ? 90 : isTablet ? 110 : 130;
  const avatarSize = isMobile ? 36 : 44;
  
  return (
    <Box sx={{ mb: 2, mt: 1 }}>
      <Typography variant="h6" sx={{ 
        textAlign: 'center', 
        fontWeight: 'bold',
        color: colors.darkBlue,
        fontSize: isMobile ? '1rem' : '1.25rem',
        mb: 1
      }}>
        Top Performers
      </Typography>
      <Stack 
        direction="row" 
        spacing={1} 
        justifyContent="center"
        sx={{ 
          overflowX: 'auto',
          paddingBottom: 1,
          '&::-webkit-scrollbar': {
            height: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: `${colors.primaryBlue}80`,
            borderRadius: 2,
          }
        }}
      >
        {topPerformers.map((entry, index) => (
          <Card 
            key={`champion-${quizId}-${index}`}
            sx={{ 
              minWidth: cardWidth, 
              p: 1, 
              textAlign: 'center',
              background: colors.white,
              border: `2px solid ${
                index === 0 ? colors.yellow :
                index === 1 ? colors.lightBlue :
                colors.secondaryGreen
              }`,
              borderRadius: '12px',
              transform: index === 0 ? 'translateY(-5px)' : 'none',
              boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box sx={{ position: 'relative', mb: 0.5 }}>
              <Avatar
                sx={{ 
                  width: avatarSize, 
                  height: avatarSize, 
                  mx: 'auto',
                  bgcolor: colors.primaryBlue,
                  border: `2px solid ${
                    index === 0 ? colors.yellow :
                    index === 1 ? colors.lightBlue :
                    colors.secondaryGreen
                  }`
                }}
              >
                <PersonIcon sx={{ 
                  fontSize: isMobile ? 18 : 22,
                  color: colors.white 
                }} />
              </Avatar>
              <Box sx={{
                position: 'absolute',
                top: -6,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: index === 0 ? colors.yellow :
                         index === 1 ? colors.primaryBlue :
                         colors.secondaryGreen,
                color: colors.white,
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                border: `2px solid ${colors.white}`,
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                {index + 1}
              </Box>
            </Box>
            <Typography variant="caption" sx={{ 
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: isMobile ? '0.65rem' : '0.75rem',
              color: colors.darkBlue
            }}>
              {entry.username ? 
                entry.username.split(' ').length === 1 ? 
                  entry.username : 
                  `${entry.username.split(' ')[0]} ${entry.username.split(' ')[1].charAt(0)}.` 
                : 'Anonymous'}
            </Typography>
            <Typography variant="caption" sx={{ 
              color: colors.darkBlue,
              fontWeight: 700,
              mt: 0.5,
              fontSize: isMobile ? '0.65rem' : '0.75rem'
            }}>
              {entry.score}%
            </Typography>
          </Card>
        ))}
      </Stack>
    </Box>
  );
});

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [expandedRows, setExpandedRows] = useState({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTab, setCurrentTab] = useState(0);
  const [quizzes, setQuizzes] = useState([]);

  const formatTime = useCallback((seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  }, []);

  const formatUsername = useCallback((username) => {
    if (!username) return 'Anonymous';
    
    const nameParts = username.split(' ');
    
    if (nameParts.length === 1) return username;
    
    return `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await axios.get(LEADERBOARD_URL);
        setLeaderboard(response.data);
        const quizGroups = response.data.reduce((acc, entry) => {
          if (!acc[entry.quiz_id]) {
            acc[entry.quiz_id] = {
              id: entry.quiz_id,
              title: entry.quiz_title,
              created_at: entry.quiz_created_at,
              entries: []
            };
          }
          
          acc[entry.quiz_id].entries.push(entry);
          
          return acc;
        }, {});
        
        const sortedQuizzes = Object.values(quizGroups).sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        setQuizzes(sortedQuizzes);
        
        if (response.data.length > 0) {
          confetti({
            particleCount: 30,
            spread: 70,
            origin: { y: 0.6 },
            colors: [colors.secondaryGreen, colors.primaryBlue, colors.accentGreen]
          });
        }
      } catch (err) {
        setError('Failed to load leaderboard. Please try again later.');
        console.error('Leaderboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const handleRowClick = useCallback((userId) => {
    setExpandedRows(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  }, []);
  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
    setCurrentPage(1);
    setExpandedRows({});
  }, []);
  const handleNext = useCallback(() => {
    if (currentTab < quizzes.length - 1) {
      setCurrentTab(currentTab + 1);
      setCurrentPage(1);
      setExpandedRows({});
    }
  }, [currentTab, quizzes.length]);

  const handlePrevious = useCallback(() => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
      setCurrentPage(1);
      setExpandedRows({});
    }
  }, [currentTab]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 2 }}>
        <LinearProgress 
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: `${colors.lightBlue}`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: `linear-gradient(90deg, ${colors.secondaryGreen}, ${colors.primaryBlue})`
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: isMobile ? 1 : 2,
        backgroundColor: colors.lightBlue,
        minHeight: '100vh'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: isMobile ? 1 : 2,
        gap: 1,
        px: isMobile ? 1 : 0
      }}>
        <TrophyIcon sx={{ 
          fontSize: isMobile ? 28 : 36,
          color: colors.yellow,
        }} />
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          sx={{
            fontWeight: 800,
            color: colors.darkBlue,
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
          }}
        >
          Quiz Leaderboard
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ 
          mb: 2,
          background: `${colors.lightBlue}`,
          border: `1px solid ${colors.primaryBlue}`,
          color: colors.darkBlue,
          fontSize: isMobile ? '0.75rem' : '0.875rem'
        }}>
          {error}
        </Alert>
      )}

      {quizzes.length === 0 ? (
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.white,
          borderRadius: '12px',
          border: `2px solid ${colors.lightBlue}`,
          p: 2,
          textAlign: 'center',
          boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
        }}>
          <Typography
            variant={isMobile ? 'body2' : 'h6'}
            sx={{
              color: colors.darkBlue,
              fontSize: isMobile ? '0.875rem' : '1.125rem'
            }}
          >
            No records yet - be the first to top the leaderboard!
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: colors.primaryBlue, 
            mb: 2,
            backgroundColor: colors.white,
            borderRadius: '12px 12px 0 0',
            overflow: 'hidden',
            boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
          }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                '& .MuiTab-root': {
                  color: colors.darkBlue,
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  minWidth: 'auto',
                  px: 1.5,
                  py: 1,
                  fontWeight: 600,
                },
                '& .Mui-selected': {
                  color: colors.primaryBlue,
                  fontWeight: 'bold'
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: colors.primaryBlue
                }
              }}
            >
              {quizzes.map((quiz, index) => (
                <Tab 
                  key={quiz.id} 
                  label={
                    <Tooltip title={quiz.title}>
                      <span>
                        {quiz.title.length > 15 
                          ? `${quiz.title.substring(0, 15)}...` 
                          : quiz.title}
                      </span>
                    </Tooltip>
                  } 
                />
              ))}
            </Tabs>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2,
            backgroundColor: colors.white,
            borderRadius: '12px',
            p: 1,
            boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
          }}>
            <IconButton 
              onClick={handlePrevious}
              disabled={currentTab === 0}
              sx={{ 
                color: currentTab === 0 ? `${colors.darkBlue}80` : colors.primaryBlue,
                fontSize: isMobile ? '0.8rem' : '1rem'
              }}
            >
              <ArrowBackIcon fontSize="small" />
              {!isMobile && 'Previous'}
            </IconButton>
            
            <Typography variant="h6" sx={{ 
              textAlign: 'center', 
              fontWeight: 'bold',
              color: colors.darkBlue,
              fontSize: isMobile ? '1rem' : '1.25rem'
            }}>
              {quizzes[currentTab]?.title}
            </Typography>
            
            <IconButton 
              onClick={handleNext}
              disabled={currentTab === quizzes.length - 1}
              sx={{ 
                color: currentTab === quizzes.length - 1 ? `${colors.darkBlue}80` : colors.primaryBlue,
                fontSize: isMobile ? '0.8rem' : '1rem'
              }}
            >
              {!isMobile && 'Next'}
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </Box>
          <QuizChampions 
            quizId={quizzes[currentTab]?.id} 
            entries={quizzes[currentTab]?.entries || []}
            isMobile={isMobile}
            isTablet={isTablet}
          />

          <Card
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: colors.white,
              border: `2px solid ${colors.lightBlue}`,
              borderRadius: '12px',
              boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
              position: 'relative',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${colors.secondaryGreen}, ${colors.primaryBlue})`,
                transform: 'scaleX(1)',
              }
            }}
          >
            <TableContainer sx={{ 
              flex: 1,
              maxHeight: 'calc(100vh - 250px)',
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                width: 6,
                height: 6,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: `${colors.primaryBlue}80`,
                borderRadius: 3,
              }
            }}>
              <Table size={isMobile ? 'small' : 'medium'} stickyHeader>
                <React.Fragment key={quizzes[currentTab]?.id}>
                  <TableHead>
                    <TableRow sx={{
                      '& th': {
                        backgroundColor: colors.white,
                        color: colors.darkBlue,
                        borderBottom: `2px solid ${colors.lightBlue}`,
                        fontSize: isMobile ? '0.7rem' : '0.85rem',
                        px: isMobile ? 0.5 : 2,
                        py: isMobile ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                        fontWeight: 700
                      }
                    }}>
                      <TableCell colSpan={3} sx={{ 
                        fontWeight: 'bold',
                        background: colors.white,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StarsIcon sx={{ 
                            fontSize: isMobile ? 16 : 20,
                            color: colors.primaryBlue
                          }} />
                          <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ 
                            fontSize: isMobile ? '0.8rem' : '0.95rem',
                            color: colors.darkBlue
                          }}>
                            {quizzes[currentTab]?.title} - Full Leaderboard
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{
                      '& th': {
                        backgroundColor: colors.lightBlue,
                        color: colors.darkBlue,
                        borderBottom: `2px solid ${colors.lightBlue}`,
                        fontWeight: 600,
                        fontSize: isMobile ? '0.65rem' : '0.75rem',
                        px: isMobile ? 0.5 : 2,
                        py: isMobile ? 0.5 : 1,
                        whiteSpace: 'nowrap'
                      }
                    }}>
                      <TableCell>Rank</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quizzes[currentTab]?.entries.map((entry) => {
                      const isCurrentUser = user && (user.id === entry.user_id || user.user_id === entry.user_id);
                      const isExpanded = expandedRows[entry.user_id];
                      
                      return (
                        <LeaderboardRow
                          key={`${entry.quiz_id}-${entry.user_id}`}
                          entry={entry}
                          isCurrentUser={isCurrentUser}
                          isExpanded={isExpanded}
                          onRowClick={handleRowClick}
                          formatUsername={formatUsername}
                          formatTime={formatTime}
                          formatDate={formatDate}
                          isMobile={isMobile}
                        />
                      );
                    })}
                  </TableBody>
                </React.Fragment>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </Box>
  );
};

export default React.memo(Leaderboard);