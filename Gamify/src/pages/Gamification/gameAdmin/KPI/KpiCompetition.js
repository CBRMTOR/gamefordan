import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import AdminMetrics from './AdminMetrics';
import AdvisorDetailsModal from './AdvisorDetailsModal';
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  useScrollTrigger,
  Zoom,
  alpha,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
const primaryBlue = "#0072BB";
const secondaryGreen = "#15A245";
const accentGreen = "#80C41C";
const darkBlue = "#004E80";
const lightBlue = "#E8F4FD";
const white = "#ffffff";
const black = "#212529";
const lightGray = "#f8f9fa";
const darkGray = "#495057";
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryBlue,
      light: '#4d9dd6',
      dark: darkBlue,
    },
    secondary: {
      main: secondaryGreen,
      light: '#4caf50',
      dark: '#1b5e20',
    },
    background: {
      default: lightBlue,
      paper: white,
    },
    text: {
      primary: black,
      secondary: darkGray,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '2.2rem',
      color: darkBlue,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.8rem',
      color: darkBlue,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.3rem',
      color: darkBlue,
    },
    body1: {
      fontSize: '0.95rem',
      color: black,
    },
    body2: {
      fontSize: '0.85rem',
      color: darkGray,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: lightBlue,
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          background: white,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: 'none',
          position: 'relative',
          overflow: 'hidden',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${darkBlue} 0%, ${primaryBlue} 100%)`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderBottom: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.3s ease',
          background: `linear-gradient(135deg, ${primaryBlue} 0%, ${secondaryGreen} 100%)`,
          color: white,
          boxShadow: '0 4px 8px rgba(0, 114, 187, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0, 114, 187, 0.4)',
            transform: 'translateY(-2px)',
          },
        },
        outlined: {
          background: 'transparent',
          border: `1px solid ${primaryBlue}`,
          color: primaryBlue,
          '&:hover': {
            background: 'rgba(0, 114, 187, 0.1)',
            border: `1px solid ${primaryBlue}`,
            boxShadow: '0 0 8px rgba(0, 114, 187, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            color: black,
            '& fieldset': {
              borderColor: lightGray,
            },
            '&:hover fieldset': {
              borderColor: primaryBlue,
            },
            '&.Mui-focused fieldset': {
              borderColor: primaryBlue,
              boxShadow: '0 0 0 2px rgba(0, 114, 187, 0.2)',
            },
          },
          '& .MuiInputLabel-root': {
            color: darkGray,
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          overflow: 'hidden',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${lightGray}`,
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          background: lightGray,
          color: darkBlue,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s ease',
          color: primaryBlue,
          '&:hover': {
            background: 'rgba(0, 114, 187, 0.1)',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${primaryBlue} 0%, ${secondaryGreen} 100%)`,
          boxShadow: '0 4px 12px rgba(0, 114, 187, 0.3)',
          color: white,
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0, 114, 187, 0.4)',
            transform: 'translateY(-3px)',
          },
        },
      },
    },
  },
});

const NavigationMenu = ({ sections, activeSection, setActiveSection }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setMobileOpen(false);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center', background: white, height: '100%' }}>
      <Typography variant="h6" sx={{color: darkBlue, fontWeight: 700 }}>
        KPI Competition
      </Typography>
      <List>
        {sections.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton 
              selected={activeSection === item.id}
              onClick={() => handleSectionChange(item.id)}
              sx={{ 
                textAlign: 'center',
                background: activeSection === item.id ? lightBlue : 'transparent',
                borderLeft: activeSection === item.id ? `3px solid ${primaryBlue}` : 'none',
                '&:hover': {
                  background: lightBlue,
                }
              }}
            >
              <ListItemText 
                primary={item.label} 
                sx={{
                  '& .MuiTypography-root': {
                    fontSize: '0.9rem',
                    fontWeight: activeSection === item.id ? 600 : 400,
                    color: activeSection === item.id ? primaryBlue : darkGray,
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: white, fontWeight: 700 }}>
            KPI Competition
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {sections.map((item) => (
              <Button 
                key={item.id}
                color="inherit" 
                onClick={() => handleSectionChange(item.id)}
                variant={activeSection === item.id ? "contained" : "text"}
                sx={{ 
                  mx: 0.5,
                  fontSize: '0.8rem',
                  borderRadius: '20px',
                  background: activeSection === item.id ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <nav>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: 240,
              background: white,
              borderRight: `1px solid ${lightGray}`,
            },
          }}
        >
          {drawer}
        </Drawer>
      </nav>
    </>
  );
};
function ScrollTop(props) {
  const { children } = props;
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = (event) => {
    const anchor = (event.target.ownerDocument || document).querySelector(
      '#back-to-top-anchor',
    );

    if (anchor) {
      anchor.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        {children}
      </Box>
    </Zoom>
  );
}

function KpiCompetition() {
  const [metrics, setMetrics] = useState([]);
  const [latestRound, setLatestRound] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [roundMetricsDisplay, setRoundMetricsDisplay] = useState({});
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeSection, setActiveSection] = useState('metrics');
  const [removeAdvisorDialog, setRemoveAdvisorDialog] = useState({ open: false, index: -1 });

  const sections = useMemo(() => [
    { id: 'metrics', label: 'Define Performance Ranges' },
    { id: 'round', label: 'View Latest Range' },
    { id: 'leaderboard', label: 'Leaderboard' }
  ], []);

  useEffect(() => {
    fetchMetrics();
    fetchLatestRound();
    fetchLeaderboard();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_KPI_URL}/metrics`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchLatestRound = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_KPI_URL}/latest-round`);
      setLatestRound(response.data.round);
    } catch (error) {
      console.error('Error fetching latest round:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_KPI_URL}/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const refreshLeaderboard = () => {
    fetchLeaderboard();
  };

  const handleViewDetails = async (advisor) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_KPI_URL}/advisor-details/${advisor.extension_id}/${latestRound}`
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
        metric_details: {}
      });
      setShowDetailsModal(true);
    }
  };

  useEffect(() => {
    window.refreshLeaderboard = refreshLeaderboard;
    return () => {
      delete window.refreshLeaderboard;
    };
  }, []);
const removeAdvisorRow = (index) => {
  setLeaderboard((prev) => prev.filter((_, i) => i !== index));
  setRemoveAdvisorDialog({ open: false, index: -1 });
};
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'metrics':
        return (
          <Grid item xs={12} lg={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <AdminMetrics
                latestRound={latestRound}
                setLatestRound={setLatestRound}
                roundMetricsDisplay={roundMetricsDisplay}
                setRoundMetricsDisplay={setRoundMetricsDisplay}
              />
            </Paper>
          </Grid>
        );
      case 'round':
        return (
          <Grid item xs={12} lg={6}>
            {Object.keys(roundMetricsDisplay).length > 0 && (
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ color: darkBlue, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', background: primaryBlue }}></Box>
                  Current Round ({latestRound}) Metrics
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(roundMetricsDisplay).map(([metric, ranges]) => (
                    <Grid item xs={12} sm={6} key={metric}>
                      <Paper variant="outlined" sx={{ p: 2, background: lightBlue }}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', color: primaryBlue }}>
                          {metric.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        <Box>
                          {ranges.map((range, idx) => (
                            <Box key={idx} display="flex" justifyContent="space-between" sx={{ py: 0.5 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {range.range_from} - {range.range_to}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: secondaryGreen, fontSize: '0.8rem' }}>
                                {range.points} pts
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Grid>
        );
      case 'leaderboard':
        return (
          <Grid item xs={12} lg={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: darkBlue, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', background: primaryBlue }}></Box>
                Leaderboard (Round {latestRound})
              </Typography>
              {leaderboard.length > 0 ? (
                <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
                  <Table sx={{ minWidth: 650 }} aria-label="leaderboard table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>Rank</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>Extension ID</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>Advisor Name</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>Total Points</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>View Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaderboard.map((advisor, index) => (
                        <TableRow 
                          key={advisor.id} 
                          sx={{ 
                            '&:last-child td, &:last-child th': { border: 0 },
                          }}
                        >
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography sx={{ fontSize: '0.9rem' }}>
                              {index + 1}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{advisor.extension_id}</TableCell>
                          <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{advisor.advisor_name}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography fontWeight="bold" sx={{ color: secondaryGreen, fontSize: '0.9rem' }}>
                              {advisor.total_points}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(advisor)}
                              sx={{ 
                                color: primaryBlue,
                                '&:hover': {
                                  background: 'rgba(0, 114, 187, 0.1)',
                                }
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4, fontStyle: 'italic' }}>
                  No submissions yet for this round.
                </Typography>
              )}
            </Paper>
          </Grid>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <NavigationMenu 
          sections={sections} 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
        />
        
        <Box component="main" sx={{ flexGrow: 1, background: lightBlue, minHeight: '100vh' }}>
          <Toolbar id="back-to-top-anchor" />
          <Typography variant="h6" component="h6" gutterBottom align="center" sx={{ color: darkBlue}}>
            KPI Competition
          </Typography>

          <Grid container spacing={2}>
            {renderActiveSection()}
          </Grid>

          <ScrollTop>
            <Fab color="primary" size="small" aria-label="scroll back to top">
              <KeyboardArrowUpIcon />
            </Fab>
          </ScrollTop>
        </Box>
      </Box>
      <Dialog
        open={removeAdvisorDialog.open}
        onClose={() => setRemoveAdvisorDialog({ open: false, index: -1 })}
        PaperProps={{
          sx: {
            background: white,
            borderRadius: '12px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
          }
        }}
      >
        <DialogTitle sx={{ color: primaryBlue, fontSize: '1.2rem' }}>Remove Advisor</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove this advisor?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveAdvisorDialog({ open: false, index: -1 })}>
            Cancel
          </Button>
          <Button 
            onClick={() => removeAdvisorRow(removeAdvisorDialog.index)} 
            color="error"
            autoFocus
            sx={{
              background: 'linear-gradient(45deg, #ef4444, #dc2626)',
              '&:hover': {
                background: 'linear-gradient(45deg, #dc2626, #b91c1c)',
              }
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
      {showDetailsModal && (
        <AdvisorDetailsModal
          advisor={selectedAdvisor}
          metrics={metrics}
          roundMetricsDisplay={roundMetricsDisplay}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </ThemeProvider>
  );
}

export default KpiCompetition;