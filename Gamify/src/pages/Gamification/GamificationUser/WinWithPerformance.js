import React from 'react';
import { Visibility as VisibilityIcon, Menu as MenuIcon, Refresh as RefreshIcon, Rocket as RocketIcon } from '@mui/icons-material';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Grid,
  Card,
  CardContent,
  Menu,
  MenuItem,
  CircularProgress,
  LinearProgress,
  Alert,
  Chip,
  Collapse,
  Tooltip,
  Stack,
  styled,
  useMediaQuery,
  useTheme,
  Fade,
  Zoom
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState, useRef, useCallback, memo } from 'react';
import AdvisorDetailsModal from './AdvisorKPI/AdvisorDetailsModal';
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
const UpcomingTargetsSign = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  background: `linear-gradient(135deg, ${colors.primaryBlue}, ${colors.secondaryGreen})`,
  color: colors.white,
  borderRadius: '12px',
  boxShadow: '0 8px 20px rgba(0, 114, 187, 0.3)',
  cursor: 'pointer',
  overflow: 'hidden',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    background: colors.yellow,
    transform: 'rotate(45deg)',
    boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    transition: 'transform 0.3s ease',
    boxShadow: '0 12px 25px rgba(0, 114, 187, 0.4)',
  }
}));
const AdvisorRow = memo(({ advisor, index, onViewDetails, latestRound, isMobile, isCurrentUser }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleViewDetails = useCallback(() => {
    onViewDetails(advisor);
  }, [advisor, onViewDetails]);
  const formatName = (fullName) => {
    if (!fullName) return '';
    
    if (isMobile) {
      const nameParts = fullName.split(' ');
      if (nameParts.length <= 1) return fullName;
      
      const firstName = nameParts[0];
      const lastNameInitial = nameParts[1].charAt(0) + '.';
      
      return `${firstName} ${lastNameInitial}`;
    }
    
    return fullName;
  };

  return (
    <React.Fragment key={advisor.extension_id}>
      <StyledTableRow 
        iscurrentuser={isCurrentUser.toString()}
        onClick={handleClick}
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
            fontWeight: index + 1 <= 3 ? 700 : 500,
            color: index + 1 <= 3 ? 
              [colors.yellow, colors.primaryBlue, colors.secondaryGreen][index] : 
              colors.darkBlue
          }}>
            {index + 1}
            {index + 1 <= 3 && !isMobile && (
              <Box component="span" sx={{ ml: 0.5 }}>
                {['🥇', '🥈', '🥉'][index]}
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
            {advisor.extension_id}
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
            {formatName(advisor.advisor_name)}
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
          color: advisor.total_points >= 90 ? colors.secondaryGreen : 
                advisor.total_points >= 70 ? colors.primaryBlue : 
                advisor.total_points >= 50 ? colors.accentGreen : colors.darkBlue
        }}>
          {advisor.total_points}
        </TableCell>
        <TableCell>
          <IconButton
            size="small"
            onClick={handleViewDetails}
            sx={{ 
              color: colors.primaryBlue,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(0, 114, 187, 0.1)',
              }
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </StyledTableRow>
    </React.Fragment>
  );
});
const MetricCard = memo(({ metric, isMobile }) => {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card variant="outlined" sx={{ 
        height: '100%',
        borderRadius: '8px',
        background: colors.white,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${colors.lightBlue}`,
      }}>
        <CardContent sx={{ p: isMobile ? 1 : 2 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            fontSize: isMobile ? '0.9rem' : '1rem', 
            color: colors.primaryBlue,
            fontWeight: 600,
          }}>
            {metric.metric_name}
          </Typography>
          <Box sx={{ mt: 1 }}>
            {metric.ranges.map((range, rangeIndex) => (
              <Box key={rangeIndex} sx={{ 
                mb: 1, 
                p: 1, 
                border: `1px solid ${colors.lightBlue}`, 
                borderRadius: '4px',
                fontSize: isMobile ? '0.7rem' : '0.8rem'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Range: {range.range_from} - {range.range_to}
                </Typography>
                <Typography variant="body2">
                  Points: {range.points}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
});

function WinWithPerformance({ 
  onViewDetails, 
  metrics = [],
  roundMetricsDisplay = {}
}) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [latestRound, setLatestRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [upcomingTargets, setUpcomingTargets] = useState([]);
  const [targetRound, setTargetRound] = useState(1);
  const [message, setMessage] = useState(null);
  const [showUpcomingTargetsSign, setShowUpcomingTargetsSign] = useState(true);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const leaderboardRef = useRef(null);
  const upcomingTargetsRef = useRef(null);
  
  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const leaderboardResponse = await axios.get(`${process.env.REACT_APP_KPI_LEADERBOARD_URL}/leaderboard`);
      const targetsResponse = await axios.get(`${process.env.REACT_APP_KPI_LEADERBOARD_URL}/upcoming-targets`);
      setLeaderboard(leaderboardResponse.data.submissions || []);
      setLatestRound(leaderboardResponse.data.round || 1);
      setUpcomingTargets(targetsResponse.data.metrics || []);
      setTargetRound(targetsResponse.data.round || 1);
      setShowUpcomingTargetsSign(targetsResponse.data.metrics && targetsResponse.data.metrics.length > 0);
      if (leaderboardResponse.data.hasUpcomingTargets && leaderboardResponse.data.submissions.length > 0) {
        setMessage("Showing leaderboard for previous round as upcoming targets are set");
      } else if (leaderboardResponse.data.message) {
        setMessage(leaderboardResponse.data.message);
      } else if (targetsResponse.data.message && targetsResponse.data.message.includes("Using current round")) {
        setMessage("No upcoming targets defined yet. Showing current round metrics as targets");
      } else {
        setMessage(null);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleViewDetails = useCallback(async (advisor) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_KPI_LEADERBOARD_URL}/advisor-details/${advisor.extension_id}/${latestRound}`
      );
      
      const advisorData = response.data;
      
      if (typeof advisorData.metric_details === 'string') {
        advisorData.metric_details = JSON.parse(advisorData.metric_details);
      }
      
      setSelectedAdvisor(advisorData);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching advisor details:', error);
      setSelectedAdvisor({
        ...advisor,
        metric_details: {},
        round: latestRound
      });
      setShowDetailsModal(true);
    }
  }, [latestRound]);
  const handleMenuOpen = useCallback((event) => {
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
  }, []);

  const scrollToLeaderboard = useCallback(() => {
    if (leaderboardRef.current) {
      leaderboardRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    handleMenuClose();
  }, [handleMenuClose]);

  const scrollToUpcomingTargets = useCallback(() => {
    if (upcomingTargetsRef.current) {
      upcomingTargetsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    handleMenuClose();
    setShowUpcomingTargetsSign(false);
  }, [handleMenuClose]);

  const handleRefresh = useCallback(() => {
    fetchLeaderboard(true);
  }, [fetchLeaderboard]);
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

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

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ 
          mb: 2,
          background: `${colors.lightBlue}`,
          border: `1px solid ${colors.primaryBlue}`,
          color: colors.darkBlue,
          fontSize: isMobile ? '0.75rem' : '0.875rem'
        }}>
          {error}
        </Alert>
        <IconButton onClick={handleRefresh} sx={{ 
          color: colors.primaryBlue,
          background: colors.lightBlue,
          '&:hover': {
            background: 'rgba(0, 114, 187, 0.1)',
          }
        }}>
          <RefreshIcon />
        </IconButton>
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
      {/* Navigation Menu */}
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
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ 
            color: colors.primaryBlue,
            background: colors.lightBlue,
            '&:hover': {
              background: 'rgba(0, 114, 187, 0.1)',
            },
            '&:disabled': {
              opacity: 0.5
            }
          }}
        >
          {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
        </IconButton>
        
        <IconButton
          size="large"
          edge="end"
          aria-label="navigation menu"
          aria-controls="navigation-menu"
          aria-haspopup="true"
          onClick={handleMenuOpen}
          sx={{ 
            color: colors.primaryBlue,
            background: colors.lightBlue,
            '&:hover': {
              background: 'rgba(0, 114, 187, 0.1)',
            }
          }}
        >
          <MenuIcon />
        </IconButton>
        <Menu
          id="navigation-menu"
          anchorEl={menuAnchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={scrollToLeaderboard}>Leaderboard</MenuItem>
          <MenuItem onClick={scrollToUpcomingTargets}>View Upcoming Targets</MenuItem>
        </Menu>
      </Box>

      {/* Creative sign for upcoming targets */}
      {showUpcomingTargetsSign && upcomingTargets.length > 0 && (
        <Zoom in={showUpcomingTargetsSign} timeout={800}>
          <UpcomingTargetsSign 
            onClick={scrollToUpcomingTargets}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <RocketIcon sx={{ mr: 1, fontSize: isMobile ? '1.5rem' : '2rem' }} />
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              sx={{ 
                fontWeight: 700,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                fontSize: isMobile ? '1rem' : '1.5rem'
              }}
            >
              View the Upcoming Targets for Round {targetRound}!
            </Typography>
            <RocketIcon sx={{ ml: 1, fontSize: isMobile ? '1.5rem' : '2rem' }} />
          </UpcomingTargetsSign>
        </Zoom>
      )}

      {/* Leaderboard Section with ref */}
      <div ref={leaderboardRef}>
        <Paper elevation={2} sx={{ 
          p: isMobile ? 2 : 3, 
          mb: 3,
          borderRadius: '12px',
          background: colors.white,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: `2px solid ${colors.lightBlue}`,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ 
              color: colors.darkBlue, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontWeight: 600,
              fontSize: isMobile ? '1.2rem' : '1.8rem',
            }}>
              Leaderboard (Round {latestRound})
            </Typography>
            
            {refreshing && <CircularProgress size={20} sx={{ color: colors.primaryBlue }} />}
          </Box>
          
          {message && (
            <Alert severity="info" sx={{ 
              mb: 2,
              background: `${colors.lightBlue}`,
              border: `1px solid ${colors.primaryBlue}`,
              color: colors.darkBlue,
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}>
              {message}
            </Alert>
          )}
          
          {leaderboard.length > 0 ? (
            <TableContainer 
              component={Paper} 
              sx={{ 
                background: 'transparent', 
                boxShadow: 'none',
                borderRadius: '8px',
                overflow: 'auto',
                maxHeight: '600px',
                border: `1px solid ${colors.lightBlue}`,
              }}
            >
              <Table stickyHeader sx={{ minWidth: 650 }} aria-label="leaderboard table">
                <TableHead>
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
                    <TableCell>Extension ID</TableCell>
                    <TableCell>Advisor Name</TableCell>
                    <TableCell>Total Points</TableCell>
                    <TableCell>View Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboard.map((advisor, index) => {
                    const isCurrentUser = false;
                    
                    return (
                      <AdvisorRow 
                        key={advisor.extension_id} 
                        advisor={advisor} 
                        index={index} 
                        onViewDetails={handleViewDetails}
                        latestRound={latestRound}
                        isMobile={isMobile}
                        isCurrentUser={isCurrentUser}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box>
              <Typography variant="body1" sx={{ 
                py: 2, 
                fontStyle: 'italic',
                textAlign: 'center',
                color: colors.darkGray,
                fontSize: isMobile ? '0.8rem' : '0.95rem',
              }}>
                No submissions yet for this round.
              </Typography>
            </Box>
          )}
          
          {showDetailsModal && (
            <AdvisorDetailsModal
              advisor={selectedAdvisor}
              metrics={metrics}
              roundMetricsDisplay={roundMetricsDisplay}
              onClose={() => setShowDetailsModal(false)}
            />
          )}
        </Paper>
      </div>

      {/* Upcoming Targets Section with ref */}
      <div ref={upcomingTargetsRef}>
        <Paper elevation={2} sx={{ 
          p: isMobile ? 2 : 3,
          borderRadius: '12px',
          background: colors.white,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: `2px solid ${colors.lightBlue}`,
        }}>
          <Typography variant="h5" gutterBottom sx={{ 
            color: colors.darkBlue, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 600,
            fontSize: isMobile ? '1.2rem' : '1.8rem',
          }}>
            Upcoming Targets (Round {targetRound})
          </Typography>
          {upcomingTargets.length > 0 ? (
            <Grid container spacing={2}>
              {upcomingTargets.map((metric, index) => (
                <MetricCard key={index} metric={metric} isMobile={isMobile} />
              ))}
            </Grid>
          ) : (
            <Typography variant="body1" sx={{ 
              py: 2, 
              fontStyle: 'italic',
              textAlign: 'center',
              color: colors.darkGray,
              fontSize: isMobile ? '0.8rem' : '0.95rem',
            }}>
              No upcoming targets defined yet.
            </Typography>
          )}
        </Paper>
      </div>
    </Box>
  );
}

export default memo(WinWithPerformance);