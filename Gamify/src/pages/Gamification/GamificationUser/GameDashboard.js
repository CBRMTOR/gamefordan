import {
  Article,
  Close,
  EmojiEvents,
  ExitToApp,
  Leaderboard,
  Menu as MenuIcon,
  Person,
  Quiz,
  Today
} from '@mui/icons-material';
import {
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  CircularProgress,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  styled,
  SwipeableDrawer,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import logo from './../../assets/logo.png';
import UserAttendance from './Attendance/UserAttendance';
import LeaderboardDashboard from './LeaderboardDashboard';
import PostsComponent from './posteuser/Posts';
import ProfileDashboard from './ProfileDashboard';
import QuizDashboard from './Quiz/QuizDashboard';
import WinWithPerformance from './WinWithPerformance';
const primaryBlue = "#0072BB";
const secondaryGreen = "#15A245";
const accentGreen = "#80C41C";
const darkBlue = "#004E80";
const lightBlue = "#E8F4FD";
const white = "#ffffff";
const black = "#212529";
const lightGray = "#f8f9fa";
const darkGray = "#495057";
const AppContainer = styled(Box)(() => ({
  minHeight: "100vh",
  background: lightBlue,
  position: "relative",
  overflow: "hidden",
}));
const BackgroundElements = styled(Box)({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: -1,
  overflow: "hidden",
  pointerEvents: "none",
});

const Circle = styled(Box)({
  position: "absolute",
  borderRadius: "50%",
  opacity: 0.06,
  animation: "float 25s infinite ease-in-out",
  
  "@keyframes float": {
    "0%, 100%": {
      transform: "translateY(0) translateX(0) scale(1)",
    },
    "33%": {
      transform: "translateY(-20px) translateX(15px) scale(1.05)",
    },
    "66%": {
      transform: "translateY(10px) translateX(-15px) scale(0.95)",
    },
  }
});

const HeaderAnimations = styled(Box)({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  overflow: "hidden",
  borderRadius: "inherit",
});

const SidebarAnimations = styled(Box)({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  overflow: "hidden",
  borderBottomRightRadius: "20px",
});

const GameDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [profilePicture, setProfilePicture] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winPerformanceData, setWinPerformanceData] = useState([]);
  const [roundMetrics, setRoundMetrics] = useState({});
  const memoizedBackgroundElements = useMemo(() => {
    const elements = [];
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 100 + 20;
      const colors = [primaryBlue, secondaryGreen, accentGreen];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      elements.push(
        <Circle
          key={`bg-${i}`}
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`, { 
          withCredentials: true 
        });
        if (profileRes.data?.profile_picture) {
          setProfilePicture(profileRes.data.profile_picture);
        }

        const leaderboardRes = await axios.get(process.env.REACT_APP_LEADERBOARD_URL);
        const quizGroups = leaderboardRes.data.reduce((acc, entry) => {
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
        if (sortedQuizzes.length > 0) {
          const newestQuiz = sortedQuizzes[0];
          const topUsersFromNewestQuiz = newestQuiz.entries
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
          
          setTopUsers(topUsersFromNewestQuiz);
        } else {
          setTopUsers([]);
        }
        if (user) {
          const statsRes = await axios.get(`${process.env.REACT_APP_LEADERBOARD_URL}/user/${user.id || user.user_id}/stats`);
          setUserStats(statsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const toggleSidebarMenu = () => setSidebarMenuOpen(!sidebarMenuOpen);
  const toggleAttendanceMenu = () => setAttendanceMenuOpen(!attendanceMenuOpen);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setShowProfile(false);
    if (isMobile) setMobileOpen(false);
  }, [isMobile]);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
    handleProfileMenuClose();
  };

 const handleProfileNavigation = () => {
  setShowProfile(true);
  setActiveTab(''); 
  handleProfileMenuClose();
  if (isMobile) setMobileOpen(false);
};

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleViewFullLeaderboard = () => {
    handleTabChange('leaderboard');
    setSidebarMenuOpen(false);
  };

  const formatUsername = (username) => {
    if (!username) return 'Anonymous';
    const nameParts = username.split(' ');
    if (nameParts.length === 1) return username;
    return `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
  };

const renderActiveTab = useCallback(() => {
  if (showProfile) {
    return <ProfileDashboard />;
  }

  switch (activeTab) {
    case 'posts':
      return <PostsComponent fullWidth />;
    case 'leaderboard':
      return <LeaderboardDashboard fullWidth />;
    case 'attendance':
      return <UserAttendance fullWidth />;
    case 'winperformance':
      return <WinWithPerformance 
                onViewDetails={(advisor) => console.log('View details:', advisor)}
                metrics={roundMetrics}
                roundMetricsDisplay={roundMetrics}
              />;
    case 'quizzes':
    default:
      return <QuizDashboard fullWidth />;
  }
}, [activeTab, showProfile, roundMetrics]);
const menuItems = [
  { key: 'posts', label: 'Posts', icon: <Article />, color: accentGreen },
  { key: 'winperformance', label: 'Performance', icon: <EmojiEvents />, color: secondaryGreen },
  { key: 'quizzes', label: 'Quizzes', icon: <Quiz />, color: primaryBlue },
  { key: 'leaderboard', label: 'Leaderboard', icon: <Leaderboard />, color: secondaryGreen },
  { key: 'attendance', label: 'Attendance', icon: <Today />, color: primaryBlue },
  { key: 'winperformance', label: 'Win With Performance', icon: <EmojiEvents />, color: secondaryGreen },
];

const bottomNavItems = [
  { key: 'posts', label: 'Posts', icon: <Article />, color: accentGreen },
  { key: 'quizzes', label: 'Quizzes', icon: <Quiz />, color: primaryBlue },
  { key: 'leaderboard', label: 'Leaderboard', icon: <Leaderboard />, color: secondaryGreen },
  { key: 'winperformance', label: 'Performance', icon: <EmojiEvents />, color: secondaryGreen },
  { key: 'attendance', label: 'Attendance', icon: <Today />, color: primaryBlue },
];
  const SidebarSection = ({ title, children, onClick, sx = {} }) => (
    <Box sx={{ 
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      zIndex: 2,
      cursor: onClick ? 'pointer' : 'default',
      mb: 2,
      ...sx
    }} onClick={onClick}>
      <Typography variant="h6" sx={{ 
        marginBottom: '15px',
        paddingBottom: '8px',
        borderBottom: `2px solid ${accentGreen}`,
        color: accentGreen,
      }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
  const drawerContent = useMemo(() => (
    <Box sx={{
      width: sidebarCollapsed ? 80 : 280,
      height: '100%',
      background: darkBlue,
      color: white,
      padding: '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
      overflowY: 'auto',
      borderBottomRightRadius: '5px',
    }}>
      <SidebarAnimations>
        {memoizedBackgroundElements}
      </SidebarAnimations>
      
      <SidebarSection title="Posts" onClick={() => handleTabChange('posts')} />
      <SidebarSection title="Win With Performance" onClick={() => handleTabChange('winperformance')}>
        {winPerformanceData.length > 0 && (
          <Typography variant="body2" sx={{ 
            mt: 1, 
            textAlign: 'center', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '4px',
            p: 0.5
          }}>
            {winPerformanceData.length} participants
          </Typography>
        )}
      </SidebarSection>
      <SidebarSection title="Quizzes" onClick={() => handleTabChange('quizzes')} />
      <SidebarSection title="Leaderboard">
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CircularProgress size={20} sx={{ color: accentGreen }} />
          </Box>
        ) : topUsers.length === 0 ? (
          <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: 'rgba(255,255,255,0.7)' }}>
            No leaderboard data yet
          </Typography>
        ) : (
          topUsers.map((user, index) => (
            <Box key={user.user_id} sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '8px 0', 
              borderBottom: index < topUsers.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' 
            }}>
              <Box sx={{ 
                width: '25px', 
                height: '25px', 
                background: accentGreen, 
                color: darkBlue, 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                fontSize: '0.8rem' 
              }}>
                {index + 1}
              </Box>
              <Typography variant="body2">
                {formatUsername(user.username || user.user?.username)}
              </Typography>
              <Typography variant="body2" sx={{ marginLeft: 'auto' }}>
                {user.score} pts
              </Typography>
            </Box>
          ))
        )}
        
        <Typography 
          component="button" 
          onClick={handleViewFullLeaderboard}
          sx={{ 
            color: accentGreen, 
            textDecoration: 'none', 
            fontSize: '0.9rem', 
            display: 'block', 
            marginTop: '10px', 
            textAlign: 'right', 
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
        >
          View Full Leaderboard →
        </Typography>
      </SidebarSection>
      
      <SidebarSection title="Your Stats">
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CircularProgress size={20} sx={{ color: accentGreen }} />
          </Box>
        ) : userStats ? (
          <>
            <Typography variant="body2">Total Score: {userStats.total_score || 0} pts</Typography>
            <Typography variant="body2">Quizzes Taken: {userStats.quizzes_taken || 0}</Typography>
            
            <Box sx={{ 
              height: '8px', 
              background: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: '4px', 
              margin: '10px 0',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                width: `${Math.min((userStats.total_score || 0) / 1000 * 100, 100)}%`, 
                height: '100%', 
                background: accentGreen,
                borderRadius: '4px'
              }} />
            </Box>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Complete quizzes to see your stats
          </Typography>
        )}
      </SidebarSection>
      
   <SidebarSection 
  title="Attendance" 
  onClick={() => handleTabChange('attendance')}
  sx={{ cursor: 'pointer' }}
>
  <Today sx={{ fontSize: '1.2rem' }} />
</SidebarSection>
    </Box>
  ), [sidebarCollapsed, loading, topUsers, userStats, memoizedBackgroundElements, attendanceMenuOpen]);

  return (
    <AppContainer>
      <BackgroundElements>
        {memoizedBackgroundElements}
      </BackgroundElements>
      
      <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        background: 'transparent',
        color: black,
        pb: isMobile ? '56px' : 0
      }}>
        <CssBaseline />
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.drawer + 1,
          background: `linear-gradient(135deg, ${darkBlue} 0%, ${primaryBlue} 100%)`,
          color: white,
          padding: {
            xs: '0.5rem 1rem',
            sm: '0.8rem 1.5rem',
            md: '1rem 2rem',
          },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}>
          <HeaderAnimations />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: {
                xs: '6px',
                sm: '10px',
              }, 
              fontSize: {
                xs: '1.2rem',
                sm: '1.5rem',
              }, 
              fontWeight: 'bold' 
            }}>
              {isMobile ? (
                <Typography variant="h6" sx={{ 
                  color: white, 
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                }}>
                  <img src={logo} alt="Logo" style={{ height: '32px', width: 'auto' }} />
                </Typography>
              ) : (
                <>
                  <img src={logo} alt="Logo" style={{ height: '32px', width: 'auto' }} />
                  <Typography variant="h6" sx={{ 
                    color: white, 
                    fontWeight: 'bold',
                    fontSize: {
                      xs: '1rem',
                      sm: '1.25rem',
                    },
                  }}>
                  </Typography>
                </>
              )}
            </Box>
          </Box>
          
          {isMobile ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              position: 'relative', 
              zIndex: 2 
            }}>
              <IconButton
                color="inherit"
                aria-label="open sidebar menu"
                onClick={toggleSidebarMenu}
                sx={{ p: 0.5 }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: {
                xs: '8px',
                sm: '15px',
              }, 
              position: 'relative', 
              zIndex: 2 
            }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: {
                    xs: '6px',
                    sm: '10px',
                  }, 
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={handleProfileMenuOpen}
              >
                <Avatar
                  src={profilePicture || user?.photoURL}
                  sx={{
                    width: {
                      xs: 30,
                      sm: 36,
                    },
                    height: {
                      xs: 30,
                      sm: 36,
                    },
                    bgcolor: !profilePicture && !user?.photoURL ? accentGreen : 'transparent',
                    color: white,
                  }}
                >
                  {!profilePicture && !user?.photoURL && 
                    (user?.username?.charAt(0).toUpperCase() || '?')
                  }
                </Avatar>
                
                {!isMobile && (
                  <Typography variant="body1" sx={{ 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: {
                      xs: '80px',
                      sm: '120px',
                    },
                    color: white,
                    fontSize: {
                      xs: '0.9rem',
                      sm: '1rem',
                    }
                  }}>
                    {user?.username || 'User'}
                  </Typography>
                )}
              </Box>

              {!isMobile && (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleProfileMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      background: white,
                      minWidth: '160px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    },
                  }}
                >
                  <MenuItem onClick={handleProfileNavigation}>
                    <ListItemIcon>
                      <Person fontSize="small" sx={{ color: darkBlue }} />
                    </ListItemIcon>
                    <ListItemText sx={{ color: darkBlue }}>My Profile</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <ExitToApp fontSize="small" sx={{ color: darkBlue }} />
                    </ListItemIcon>
                    <ListItemText sx={{ color: darkBlue }}>Logout</ListItemText>
                  </MenuItem>
                </Menu>
              )}
            </Box>
          )}
        </Box>
        {isMobile && (
          <Paper sx={{ 
            position: 'fixed', 
            top: 56, 
            left: 0, 
            right: 0, 
            zIndex: theme.zIndex.appBar - 1,
            background: 'rgba(255, 255, 255, 0.95)',
            borderBottom: `1px solid ${accentGreen}20`,
            borderRadius: 0,
          }} elevation={1}>
            <BottomNavigation
              value={activeTab}
              onChange={(event, newValue) => handleTabChange(newValue)}
              sx={{
                background: 'transparent',
                height: 48,
                '& .MuiBottomNavigationAction-root': {
                  minWidth: 'auto',
                  padding: '6px 0',
                  color: darkGray,
                  '&.Mui-selected': {
                    color: (theme) => {
                      switch (activeTab) {
                        case 'posts': return accentGreen;
                        case 'quizzes': return primaryBlue;
                        case 'leaderboard': return secondaryGreen;
                        case 'attendance': return primaryBlue;
                        default: return primaryBlue;
                      }
                    },
                  },
                },
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.7rem',
                  mt: 0.5,
                  '&.Mui-selected': {
                    fontSize: '0.7rem',
                  },
                },
              }}
            >
              {bottomNavItems.map((item) => (
                <BottomNavigationAction
                  key={item.key}
                  value={item.key}
                  label={item.label}
                  icon={
                    React.cloneElement(item.icon, {
                      sx: { 
                        fontSize: 20,
                        color: activeTab === item.key ? item.color : darkGray,
                      }
                    })
                  }
                />
              ))}
            </BottomNavigation>
          </Paper>
        )}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              '& .MuiDrawer-paper': {
                width: 280,
                background: darkBlue,
                color: white,
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}
        {isMobile && (
          <SwipeableDrawer
            anchor="left"
            open={sidebarMenuOpen}
            onClose={toggleSidebarMenu}
            onOpen={toggleSidebarMenu}
            sx={{
              '& .MuiDrawer-paper': {
                width: '100%',
                background: darkBlue,
                color: white,
                padding: '1rem',
                borderTopRightRadius: '0',
                borderBottomRightRadius: '0',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <img src={logo} alt="Logo" style={{ height: '32px', width: 'auto' }} />
              <IconButton onClick={toggleSidebarMenu} sx={{ color: white, p: 0.5 }}>
                <Close />
              </IconButton>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '1rem', 
              mb: 2,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px'
            }}>
              <Avatar
                src={profilePicture || user?.photoURL}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: !profilePicture && !user?.photoURL ? accentGreen : 'transparent',
                  color: white,
                }}
              >
                {!profilePicture && !user?.photoURL && 
                  (user?.username?.charAt(0).toUpperCase() || '?')
                }
              </Avatar>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {user?.username || 'User'}
                </Typography>
              </Box>
            </Box>
            <List sx={{ py: 0 }}>
              <ListItem button onClick={() => { handleTabChange('posts'); setSidebarMenuOpen(false); }} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ color: accentGreen, minWidth: 36 }}>
                  <Article />
                </ListItemIcon>
                <ListItemText primary="Posts" sx={{ '& .MuiListItemText-primary': { fontSize: '1rem' } }} />
              </ListItem>
              
              <ListItem button onClick={() => { handleTabChange('winperformance'); setSidebarMenuOpen(false); }} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ color: secondaryGreen, minWidth: 36 }}>
                  <Leaderboard />
                </ListItemIcon>
                <ListItemText primary="Win With Performance" sx={{ '& .MuiListItemText-primary': { fontSize: '1rem' } }} />
              </ListItem>
              
              <ListItem button onClick={() => { handleTabChange('quizzes'); setSidebarMenuOpen(false); }} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ color: primaryBlue, minWidth: 36 }}>
                  <Quiz />
                </ListItemIcon>
                <ListItemText primary="Quizzes" sx={{ '& .MuiListItemText-primary': { fontSize: '1rem' } }} />
              </ListItem>
              
              <ListItem button onClick={() => { handleTabChange('leaderboard'); setSidebarMenuOpen(false); }} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ color: secondaryGreen, minWidth: 36 }}>
                  <Leaderboard />
                </ListItemIcon>
                <ListItemText primary="Leaderboard" sx={{ '& .MuiListItemText-primary': { fontSize: '1rem' } }} />
              </ListItem>
              
              <ListItem button onClick={() => { handleTabChange('attendance'); setSidebarMenuOpen(false); }} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ color: accentGreen, minWidth: 36 }}>
                  <Today />
                </ListItemIcon>
                <ListItemText primary="Attendance" sx={{ '& .MuiListItemText-primary': { fontSize: '1rem' } }} />
              </ListItem>
            </List>
            <SidebarSection title="Top 3 Players" sx={{ mx: 0, mt: 2, p: 1.5 }}>
              {loading ? (
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <CircularProgress size={18} sx={{ color: accentGreen }} />
                </Box>
              ) : topUsers.length === 0 ? (
                <Typography variant="body2" sx={{ textAlign: 'center', py: 1, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                  No leaderboard data yet
                </Typography>
              ) : (
                topUsers.map((user, index) => (
                  <Box key={user.user_id} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '6px 0', 
                    borderBottom: index < topUsers.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' 
                  }}>
                    <Box sx={{ 
                      width: '22px', 
                      height: '22px', 
                      background: accentGreen, 
                      color: darkBlue, 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 'bold', 
                      fontSize: '0.7rem' 
                    }}>
                      {index + 1}
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {formatUsername(user.username || user.user?.username)}
                    </Typography>
                    <Typography variant="body2" sx={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                      {user.score} pts
                    </Typography>
                  </Box>
                ))
              )}
              
              <Typography 
                component="button" 
                onClick={handleViewFullLeaderboard}
                sx={{ 
                  color: accentGreen, 
                  textDecoration: 'none', 
                  fontSize: '0.8rem', 
                  display: 'block', 
                  marginTop: '8px', 
                  textAlign: 'right', 
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                View Full Leaderboard →
              </Typography>
            </SidebarSection>
            <SidebarSection title="Your Stats" sx={{ mx: 0, mt: 1, p: 1.5 }}>
              {loading ? (
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <CircularProgress size={18} sx={{ color: accentGreen }} />
                </Box>
              ) : userStats ? (
                <>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Total Score: {userStats.total_score || 0} pts</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Quizzes Taken: {userStats.quizzes_taken || 0}</Typography>
                  
                  <Box sx={{ 
                    height: '6px', 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '3px', 
                    margin: '8px 0',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      width: `${Math.min((userStats.total_score || 0) / 1000 * 100, 100)}%`, 
                      height: '100%', 
                      background: accentGreen,
                      borderRadius: '3px'
                    }} />
                  </Box>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                  Complete quizzes to see your stats
                </Typography>
              )}
            </SidebarSection>
             <ListItem button 
             onClick={() => {
                setShowProfile(true);
                setActiveTab('');
                setSidebarMenuOpen(false);
              }} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ color: accentGreen, minWidth: 36 }}>
                  <Person />
                </ListItemIcon>
                <ListItemText primary="My Profile" sx={{ '& .MuiListItemText-primary': { fontSize: '1rem' } }} />
              </ListItem>
              
              <ListItem button onClick={handleLogout} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ color: accentGreen, minWidth: 36 }}>
                  <ExitToApp />
                </ListItemIcon>
                <ListItemText primary="Logout" sx={{ '& .MuiListItemText-primary': { fontSize: '1rem' } }} />
              </ListItem>
          </SwipeableDrawer>
        )}
        {!isMobile && (
          <Box component="nav" sx={{
            width: sidebarCollapsed ? 80 : 280,
            flexShrink: 0,
            position: 'fixed',
            top: 70,
            bottom: 0,
            left: 0,
          }}>
            {drawerContent}
          </Box>
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            mt: {
            xs: 11,
            sm: 13, 
            },
            ml: {
              xs: 0,
              md: !isMobile ? (sidebarCollapsed ? '80px' : '280px') : 0,
            },
            px: {
              xs: 1,
              sm: 2,
              md: 0,
            },
            maxWidth: {
              xs: '100%',
              md: 'calc(100% - 280px)',
            },
          }}
        >
          <Box sx={{
  backgroundColor: white,
  minHeight: {
    xs: 'calc(100vh - 144px)',
    sm: 'calc(100vh - 152px)', 
    md: 'calc(100vh - 100px)',
  },
  position: 'relative',
  overflow: 'hidden',
  padding: {
    xs: '1rem',
    sm: '1.5rem',
    md: '2rem',
  },
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: {
    xs: '8px',
    md: '0',
  },
}}>
            {renderActiveTab()}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 4, 
              pt: 2, 
              borderTop: '1px solid #eee' 
            }}>
              <img 
                src={logo} 
                alt="Company Logo" 
                style={{ 
                  height: '40px', 
                  width: 'auto',
                  opacity: 0.7
                }} 
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </AppContainer>
  );
};

export default React.memo(GameDashboard);