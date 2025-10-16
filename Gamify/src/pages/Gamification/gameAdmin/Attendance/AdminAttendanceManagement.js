import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  TablePagination,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  QrCode as QrCodeIcon,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

const AdminAttendanceManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    duration: 60,
    createdBy: 'Admin'
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [currentQrCode, setCurrentQrCode] = useState('');
  const [sessionMenuAnchor, setSessionMenuAnchor] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchSessions();
  }, []);
const API_ATTENDANCE_BASE = process.env.REACT_APP_ATTENDANCE_URL;
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_ATTENDANCE_BASE}/attendance/sessions`);
      
      if (response.data.sessions) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setMessage('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(`${API_ATTENDANCE_BASE}/attendance/create`, newSession);
      
      if (response.data.success) {
        setOpenCreateDialog(false);
        setNewSession({ title: '', description: '', duration: 60, createdBy: 'Admin' });
        setMessage('Session created successfully!');
        fetchSessions();
      } else {
        setMessage('Failed to create session: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setMessage('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      setLoading(true);
      const response = await axios.delete(`${API_ATTENDANCE_BASE}/attendance/sessions/${sessionId}`);
      
      if (response.data.success) {
        setMessage('Session deleted successfully!');
        
        if (selectedSession === sessionId) {
          setSelectedSession(null);
          setAttendanceLogs([]);
        }
        fetchSessions();
        setSessionMenuAnchor(null);
      } else {
        setMessage('Failed to delete session: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setMessage('Failed to delete session');
    } finally {
      setLoading(false);
    }
  };

  const viewAttendanceLogs = async (sessionId) => {
    try {
      setLogsLoading(true);
       const response = await axios.get(`${API_ATTENDANCE_BASE}/attendance/logs/${sessionId}`);
      
      if (response.data.logs) {
        setAttendanceLogs(response.data.logs);
        setSelectedSession(sessionId);
      }
    } catch (error) {
      console.error('Error fetching attendance logs:', error);
      setMessage('Failed to fetch attendance logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleSessionExpanded = (sessionId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
    
    if (!expandedSessions[sessionId]) {
      viewAttendanceLogs(sessionId);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setMessage('Session ID copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const handleSessionMenuOpen = (event, sessionId) => {
    setSessionMenuAnchor(event.currentTarget);
    setSelectedSessionId(sessionId);
  };

  const handleSessionMenuClose = () => {
    setSessionMenuAnchor(null);
    setSelectedSessionId(null);
  };

  const downloadQRCode = (qrCode, title) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${title.replace(/\s+/g, '_')}_qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSessionExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getSessionTitle = (sessionId) => {
    const session = sessions.find(s => s.session_id === sessionId);
    return session ? session.title : 'Unknown Session';
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const exportToExcel = (sessionId) => {
    const session = sessions.find(s => s.session_id === sessionId);
    if (!session) return;
    
    const logsForSession = attendanceLogs.filter(log => log.session_id === sessionId);
    
    const data = logsForSession.map(log => ({
      'User ID': log.user_id || 'N/A',
      'Username': log.username,
      'Department': log.department || 'N/A',
      'Section': log.section || 'N/A',
      'Team': log.team || 'N/A',
      'Check-in Time': new Date(log.check_in_time).toLocaleString(),
      'Status': log.status || 'Present'
    }));
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Logs');
    const fileName = `${session.title.replace(/\s+/g, '_')}_attendance.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };
  const paginatedLogs = attendanceLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Attendance Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
          disabled={loading}
        >
          Create New Session
        </Button>
      </Box>

      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setMessage('')} 
          severity={message.includes('success') ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Attendance Session</DialogTitle>
        <form onSubmit={createSession}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={newSession.title}
                  onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={newSession.description}
                  onChange={(e) => setNewSession({...newSession, description: e.target.value})}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Created By"
                  value={newSession.createdBy}
                  onChange={(e) => setNewSession({...newSession, createdBy: e.target.value})}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={newSession.duration}
                  onChange={(e) => setNewSession({...newSession, duration: parseInt(e.target.value) || 60})}
                  inputProps={{ min: 1 }}
                  disabled={loading}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Create Session'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={openQrDialog} onClose={() => setOpenQrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <img src={currentQrCode} alt="QR Code" style={{ width: '100%', maxWidth: '300px' }} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => downloadQRCode(currentQrCode, 'attendance_qr')}
            >
              Download PNG
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Active Sessions
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : sessions.length === 0 ? (
            <Typography variant="body1" color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
              No active sessions
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="5%"></TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Expires At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <React.Fragment key={session.session_id}>
                      <TableRow 
                        sx={{ 
                          backgroundColor: selectedSession === session.session_id ? 'action.selected' : 'inherit',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleSessionExpanded(session.session_id)}
                            disabled={logsLoading}
                          >
                            {expandedSessions[session.session_id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{session.title}</Typography>
                          {session.description && (
                            <Typography variant="body2" color="textSecondary">
                              {session.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{session.created_by_name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={formatDuration(session.duration)} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={isSessionExpired(session.expires_at) ? 'Expired' : 'Active'}
                            color={isSessionExpired(session.expires_at) ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(session.expires_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View QR Code">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCurrentQrCode(session.qr_code);
                                  setOpenQrDialog(true);
                                }}
                              >
                                <QrCodeIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="More options">
                              <IconButton
                                size="small"
                                onClick={(e) => handleSessionMenuOpen(e, session.session_id)}
                              >
                                <MoreIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                          <Collapse in={expandedSessions[session.session_id]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" gutterBottom component="div">
                                  Attendance Logs - {session.title}
                                </Typography>
                                <Button
                                  variant="outlined"
                                  startIcon={<ExcelIcon />}
                                  onClick={() => exportToExcel(session.session_id)}
                                  disabled={attendanceLogs.filter(log => log.session_id === session.session_id).length === 0}
                                >
                                  Export to Excel
                                </Button>
                              </Box>
                              
                              {logsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                  <CircularProgress />
                                </Box>
                              ) : attendanceLogs.filter(log => log.session_id === session.session_id).length === 0 ? (
                                <Typography variant="body1" color="textSecondary" sx={{ py: 4, textAlign: 'center' }}>
                                  No attendance records for this session
                                </Typography>
                              ) : (
                                <>
                                  <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>User</TableCell>
                                          <TableCell>Department</TableCell>
                                          <TableCell>Section</TableCell>
                                          <TableCell>Team</TableCell>
                                          <TableCell>Check-in Time</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {paginatedLogs.filter(log => log.session_id === session.session_id).map((log) => (
                                          <TableRow key={log.log_id}>
                                            <TableCell>
                                              <Typography variant="subtitle2">{log.username}</Typography>
                                              {log.user_id && (
                                                <Typography variant="body2" color="textSecondary">
                                                  ID: {log.user_id}
                                                </Typography>
                                              )}
                                            </TableCell>
                                            <TableCell>{log.department || '-'}</TableCell>
                                            <TableCell>{log.section || '-'}</TableCell>
                                            <TableCell>{log.team || '-'}</TableCell>
                                            <TableCell>
                                              {new Date(log.check_in_time).toLocaleString()}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    <Pagination
                                      count={Math.ceil(attendanceLogs.filter(log => log.session_id === session.session_id).length / rowsPerPage)}
                                      page={page + 1}
                                      onChange={(event, value) => setPage(value - 1)}
                                      color="primary"
                                    />
                                  </Box>
                                </>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
      
      <Menu
        anchorEl={sessionMenuAnchor}
        open={Boolean(sessionMenuAnchor)}
        onClose={handleSessionMenuClose}
      >
        <MenuItem onClick={() => {
          copyToClipboard(selectedSessionId);
          handleSessionMenuClose();
        }}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Session ID</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          downloadQRCode(sessions.find(s => s.session_id === selectedSessionId)?.qr_code, 'attendance_qr');
          handleSessionMenuClose();
        }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download QR Code</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          deleteSession(selectedSessionId);
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete Session</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default AdminAttendanceManagement;