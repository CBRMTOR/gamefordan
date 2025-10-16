import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  AppBar,
  Box, CssBaseline,
  IconButton,
  Toolbar, Typography,
  useMediaQuery
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import logo from './../../assets/logo.png';
import CreateUsers from './CreateUsers';
import ManageUsers from './ManageUsers';
import Sidebar from './Sidebar';

const PRIMARY_COLOR = '#8DC63F';
const TEXT_PRIMARY = '#0a2e38';
const TEXT_SECONDARY = '#1a4d5c';

const theme = createTheme({
  palette: {
    primary: { 
      main: PRIMARY_COLOR,
      contrastText: '#ffffff'
    },
    secondary: { 
      main: '#6da534',
      contrastText: '#ffffff'
    },
    background: { 
      default: '#f8f9fa',
      paper: '#ffffff'
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)'
        }
      }
    }
  }
});

const SuperadminDashboard = () => {
  const { user } = useAuth();
  const [view, setView] = useState('dashboard');
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_DROPDOWNS_API_URL}/dropdowns`);
      setTeams(res.data.teams.map(team => team.name));
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, {
        withCredentials: true
      });
      setUsers(res.data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      view: 'dashboard' 
    },
    { 
      text: 'Create Users', 
      icon: <PersonAddIcon />, 
      view: 'createUsers' 
    },
    { 
      text: 'Manage Users', 
      icon: <PeopleIcon />, 
      view: 'manageUsers' 
    }
  ];

  const renderComponent = () => {
    switch (view) {
      case 'createUsers':
        return <CreateUsers fetchUsers={fetchUsers} teams={teams} />;
      case 'manageUsers':
        return <ManageUsers />;
      case 'dashboard':
      default:
        return (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              Superadmin Dashboard
            </Typography>
            <Typography variant="body1">
              Welcome to the Superadmin Dashboard. Use the sidebar to navigate between different sections.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <CssBaseline />
        
       <AppBar 
  position="fixed" 
  sx={{ 
    zIndex: theme.zIndex.drawer + 1,
    background: '#ffffff',
    boxShadow: 'none',
    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
  }}
>
  <Toolbar sx={{ minHeight: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        color="inherit"
        edge="start"
        onClick={toggleSidebar}
        sx={{ mr: 1, color: TEXT_PRIMARY }}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <MenuIcon />
      </IconButton>
      <Typography
  variant="body2"
  sx={{
    color: TEXT_PRIMARY,
    fontWeight: 600,
    fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.9rem' },
    ml: 2
  }}
>
  Welcome, {user?.username ? user.username.split(' ')[0] : user?.user_id}
</Typography>

    </Box>

    <Box>
      <img src={logo} alt="Incident Dashboard Logo" style={{ height: '40px' }} />
    </Box>
  </Toolbar>
</AppBar>

        <Sidebar 
          onSelect={setView} 
          currentView={view} 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          menuItems={menuItems}
        />
        
        <Box 
          component="main" 
           sx={{ 
    flexGrow: 1,
    width: { 
      xs: '100%', 
      md: sidebarOpen ? `calc(100% - 240px)` : '100%' 
    },
    p: 3,
    pt: '80px',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    maxWidth: '1600px',
    mx: 'auto'
  }}
        >
          <Typography variant="h4" id="main-title" sx={{ mb: 3, display: 'none' }}>
            {view === 'dashboard' ? 'Dashboard' : 
             view === 'createUsers' ? 'Create Users' : 
             'Manage Users'}
          </Typography>
          
          <Box sx={{ width: '100%' }}>
            {renderComponent()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default SuperadminDashboard;