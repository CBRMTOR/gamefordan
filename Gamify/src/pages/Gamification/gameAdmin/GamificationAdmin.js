import {
  ChevronLeft,
  ChevronRight,
  Close as CloseIcon,
  EmojiEvents,
  ExitToApp,
  LibraryBooks as LibraryBooksIcon,
  Menu as MenuIcon,
  Person,
  PostAdd as PostsIcon,
  Quiz as QuizIcon,
  Rocket as RocketIcon,
  Stars as StarsIcon,
  Today
} from '@mui/icons-material';
import {
  Avatar,
  Badge,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  styled,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import axios from 'axios';
import confetti from 'canvas-confetti';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import AdminAttendanceManagement from './Attendance/AdminAttendanceManagement';
import KpiCompetition from './KPI/KpiCompetition';
import Posts from './PostManagement/Posts';
import CreateMatchingQuestion from './QuestionManagement/CreateMatchingQuestion.js';
import QuestionManagement from './QuestionManagement/QuestionManagement';
import QuizCreation from './QuestionManagement/QuizCreation';
import Analytics from './QuestionManagement/Response/Analytics';
import Responses from './QuestionManagement/Responses';
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

const GamificationAdmin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quizCreation');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [userLevel, setUserLevel] = useState(5);
  const [xp, setXp] = useState(680);
  const [xpToNextLevel, setXpToNextLevel] = useState(1000);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const [profilePicture, setProfilePicture] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
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
    const fetchProfilePicture = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`, { 
          withCredentials: true 
        });
        if (res.data?.profile_picture) {
          setProfilePicture(res.data.profile_picture);
        }
      } catch (err) {
        console.error('Failed to fetch profile picture:', err);
      }
    };
    
    fetchProfilePicture();
  }, []);

  useEffect(() => {
    if (user && user.role !== 'game_admin') {
      navigate('/unauthorized');
    }
  }, [user, navigate]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (isMobile) setSidebarOpen(false);
    
    if (['quizCreation', 'analytics'].includes(tab)) {
      confetti({
        particleCount: 100,
        spread: 70,
        colors: ['#ff00aa', '#00ccff', '#ffcc00', '#cc00ff', '#00aaff'],
        origin: { y: 0.6 }
      });
    }
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileNavigation = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'KpiCompetition':
        return <KpiCompetition />;
      case 'posts':
        return <Posts />;
      case 'quizCreation':
        return <QuizCreation />;
      case 'questionManagement':
        return <QuestionManagement />;
      case 'responses':
        return <Responses />;
      case 'AttendanceManagement':
        return <AdminAttendanceManagement />;
      case 'analytics':
        return <Analytics />;
      case 'createMatching':
        return <CreateMatchingQuestion />;
      default:
        return <Box sx={{ p: 3 }}>Select a tab</Box>;
    }
  };
  const menuItems = [
    { key: 'posts', label: 'Posts', icon: <PostsIcon />, color: accentGreen },
    { key: 'quizCreation', label: 'Quiz Creation', icon: <QuizIcon />, color: primaryBlue },
    { key: 'questionManagement', label: 'Question Bank', icon: <LibraryBooksIcon />, color: secondaryGreen },
    { key: 'responses', label: 'Player Responses', icon: <StarsIcon />, color: accentGreen },
    { key: 'KpiCompetition', label: 'Win With performance', icon: <EmojiEvents />, color: primaryBlue },
    { key: 'AttendanceManagement', label: 'Attendance Management', icon: <Today />, color: secondaryGreen },
    // { key: 'analytics', label: 'Game Analytics', icon: <AnalyticsIcon />, color: '#00aaff' },
  ];

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
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

  const drawer = (
    <Box sx={{
      width: sidebarCollapsed ? 80 : 280,
      height: '100%',
      background: darkBlue,
      color: white,
      padding: '8px 0',
      display: 'flex',
      flexDirection: 'column',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.easeInOut,
        duration: theme.transitions.duration.standard,
      }),
      position: 'relative',
      overflowY: 'auto',
      borderBottomRightRadius: '5px',
    }}>
      <SidebarAnimations>
        {memoizedBackgroundElements}
      </SidebarAnimations>
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        px: 2, 
        py: 1,
        mb: 1,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        zIndex: 2,
      }}>
        {isMobile && (
          <IconButton onClick={toggleSidebar} sx={{ color: white }}>
            <CloseIcon />
          </IconButton>
        )}
        
        {!sidebarCollapsed && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            opacity: isMobile ? 0 : 1,
            transition: 'opacity 0.3s'
          }}>
            <RocketIcon sx={{ 
              fontSize: 24,
              color: accentGreen,
            }} />
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 700,
              color: white
            }}>
              Game Admin
            </Typography>
          </Box>
        )}
        
        {!isMobile && isLargeScreen && (
          <IconButton
            onClick={toggleSidebarCollapse}
            sx={{
              color: white,
              background: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>

      <List sx={{ flexGrow: 1, position: 'relative', zIndex: 2 }}>
        {menuItems.map(({ key, label, icon, badge, color }) => (
          <ListItem
            button
            key={key}
            onClick={() => handleTabChange(key)}
            sx={{
              backgroundColor: activeTab === key ? `rgba(${hexToRgb(color)}, 0.2)` : 'transparent',
              mx: 1,
              my: 0.5,
              borderRadius: 2,
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              '&:hover': { 
                backgroundColor: `rgba(${hexToRgb(color)}, 0.1)`,
                transform: 'translateX(4px)',
              },
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:after': activeTab === key ? {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: color
              } : {}
            }}
          >
            <ListItemIcon sx={{ 
              color: activeTab === key ? color : 'rgba(255, 255, 255, 0.7)', 
              minWidth: sidebarCollapsed ? 'auto' : 40 
            }}>
              <Badge 
                badgeContent={badge || null} 
                color="error" 
                max={99}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'left'
                }}
              >
                {React.cloneElement(icon, {
                  sx: { 
                    fontSize: sidebarCollapsed ? 24 : 20,
                  }
                })}
              </Badge>
            </ListItemIcon>
            {!sidebarCollapsed && (
              <>
                <ListItemText 
                  primary={label} 
                  primaryTypographyProps={{ 
                    color: activeTab === key ? white : 'rgba(255, 255, 255, 0.8)',
                    fontWeight: activeTab === key ? 700 : 600,
                    fontSize: '0.95rem'
                  }} 
                />
                {activeTab === key && (
                  <StarsIcon sx={{ 
                    ml: 1, 
                    fontSize: 16, 
                    color: color,
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.3 },
                      '100%': { opacity: 1 }
                    }
                  }} />
                )}
              </>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );

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
              <IconButton
                color="inherit"
                edge="start"
                onClick={isMobile ? toggleSidebar : toggleSidebarCollapse}
                sx={{ 
                  mr: 1, 
                  color: white,
                  background: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: '"Comfortaa", sans-serif',
                  fontSize: { xs: '0.8rem', md: '1.2rem' },
                  fontWeight: 800,
                  color: white,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
               Hey {user?.username || 'Admin'}
              </Typography>
            </Box>
          </Box>

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
        </Box>
        {!isMobile && (
          <Box component="nav" sx={{
            width: sidebarCollapsed ? 80 : 280,
            flexShrink: 0,
            position: 'fixed',
            top: 70,
            bottom: 0,
            left: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.standard,
            }),
          }}>
            {drawer}
          </Box>
        )}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={sidebarOpen}
            onClose={toggleSidebar}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: 280,
                background: darkBlue,
                color: white,
                borderBottomRightRadius: '5px',
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            mt: {
              xs: 7,
              sm: 8,
            },
            ml: {
              xs: 0,
              md: !isMobile ? (sidebarCollapsed ? '80px' : '280px') : 0,
            },
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.standard,
            }),
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
            minHeight: 'calc(100vh - 100px)',
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
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}>
            {renderTab()}
          </Box>
        </Box>
      </Box>
    </AppContainer>
  );
};

export default GamificationAdmin;