import React, { useState } from 'react';
import axios from 'axios';
import {
  TextField,
  MenuItem,
  Button,
  Typography,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  Tooltip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import * as xlsx from 'xlsx';
import { useAuth } from "../../../context/AuthContext";

const roles = ['user', 'TS', 'supervisor', 'superadmin', 'game_admin'];

const CreateUsers = ({ fetchUsers, teams }) => {
  const { user: currentUser } = useAuth();
  const [usersForm, setUsersForm] = useState({
    user_id: '',
    username: '',
    email: '',
    password: '',
    role: 'user',
    team: '',
    department: '',
    section: '',
    phone_number: ''
  });

  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'supervisor';
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const handleApiError = (error, defaultMessage) => {
    console.error(error);
    const message = error.response?.data?.error || defaultMessage;
    showSnackbar(message, 'error');
  };

  const createUser = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/admin/users`,
        {
          user_id: parseInt(usersForm.user_id),
          username: usersForm.username,
          email: usersForm.email,
          password: usersForm.password,
          role: usersForm.role,
          team: usersForm.team,
          department: usersForm.department,
          section: usersForm.section,
          phone_number: usersForm.phone_number
        },
        { withCredentials: true }
      );
      showSnackbar('User created successfully!', 'success');
      setUsersForm({
        user_id: '',
        username: '',
        email: '',
        password: '',
        role: 'user',
        team: '',
        department: '',
        section: '',
        phone_number: ''
      });
      fetchUsers();
    } catch (err) {
      handleApiError(err, 'Failed to create user');
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/admin/users/bulk`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      );

      setUploadResults(res.data.results);
      showSnackbar(
        `Bulk upload completed: ${res.data.results.filter(r => r.status === 'success').length} users created successfully`,
        'success'
      );
      fetchUsers();
    } catch (err) {
      handleApiError(err, 'Bulk upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCloseBulkDialog = () => {
    setOpenBulkDialog(false);
    setSelectedFile(null);
    setUploadResults(null);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        user_id: '1001',
        username: 'user1',
        email: 'user1@example.com',
        password: 'password123',
        role: 'user',
        team: 'Team A',
        phone_number: '1234567890',
        department: 'department 1',
        section: 'Section A'
      },
      {
        user_id: '1002',
        username: 'user2',
        email: 'user2@example.com',
        password: 'password123',
        role: 'TS',
        team: 'Team B',
        phone_number: '1234567891',
        department: 'department 2',
        section: 'Section B'
      }
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Users');
    xlsx.writeFile(wb, 'user_bulk_upload_template.xlsx');
  };

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Create User</Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <TextField
            label="User ID"
            type="number"
            value={usersForm.user_id}
            onChange={e => setUsersForm({ ...usersForm, user_id: e.target.value })}
            size="small"
            required
            disabled={!isAdmin}
          />
          <TextField
            label="Username"
            value={usersForm.username}
            onChange={e => setUsersForm({ ...usersForm, username: e.target.value })}
            size="small"
            required
            disabled={!isAdmin}
          />
          <TextField
            label="Email"
            type="email"
            value={usersForm.email}
            onChange={e => setUsersForm({ ...usersForm, email: e.target.value })}
            size="small"
            required
            disabled={!isAdmin}
          />
          <TextField
            label="Password"
            type="password"
            value={usersForm.password}
            onChange={e => setUsersForm({ ...usersForm, password: e.target.value })}
            size="small"
            required
            disabled={!isAdmin}
          />
          <TextField
            label="Role"
            select
            value={usersForm.role}
            onChange={e => setUsersForm({ ...usersForm, role: e.target.value })}
            size="small"
            sx={{ minWidth: 120 }}
            disabled={!isAdmin || !isSuperAdmin}
          >
            {roles.map(role => (
              <MenuItem key={role} value={role}>{role}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Team"
            select
            value={usersForm.team}
            onChange={e => setUsersForm({ ...usersForm, team: e.target.value })}
            size="small"
            sx={{ minWidth: 120 }}
            disabled={!isAdmin}
          >
            {teams.map(team => (
              <MenuItem key={team} value={team}>{team}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Phone Number"
            value={usersForm.phone_number}
            onChange={e => setUsersForm({ ...usersForm, phone_number: e.target.value })}
            size="small"
            disabled={!isAdmin}
          />
          <TextField
            label="Department"
            value={usersForm.department}
            onChange={e => setUsersForm({ ...usersForm, department: e.target.value })}
            size="small"
            disabled={!isAdmin}
          />
          <TextField
            label="Section"
            value={usersForm.section}
            onChange={e => setUsersForm({ ...usersForm, section: e.target.value })}
            size="small"
            disabled={!isAdmin}
          />
        </Box>
        <Box mt={2} display="flex" gap={2}>
          <Button 
            variant="contained" 
            onClick={createUser}
            disabled={!isAdmin || !usersForm.user_id || !usersForm.username || !usersForm.email || !usersForm.password}
          >
            Create User
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => setOpenBulkDialog(true)}
            disabled={!isAdmin}
          >
            Bulk Upload
          </Button>
        </Box>
      </Paper>

      <Dialog open={openBulkDialog} onClose={handleCloseBulkDialog} fullWidth maxWidth="md">
        <DialogTitle>Bulk Upload Users</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Upload an Excel file (.xlsx) with user data. You can download a sample template below.
          </DialogContentText>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={downloadTemplate} sx={{ mt: 1, mb: 2 }}>
            Download Template
          </Button>
          <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} disabled={!isAdmin}>
            Select File
            <input
              type="file"
              accept=".xlsx, .xls"
              hidden
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  setSelectedFile(e.target.files[0]);
                  setUploadResults(null);
                }
              }}
              disabled={!isAdmin}
            />
          </Button>
          {selectedFile && <Typography mt={1}>{selectedFile.name}</Typography>}

          {isUploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 2 }} />}

          {uploadResults && (
            <Box mt={3} maxHeight={300} overflow="auto">
              <Typography variant="subtitle1" gutterBottom>Upload Results</Typography>
              <List>
                {uploadResults.map((result, idx) => (
                  <ListItem key={idx} divider>
                    <ListItemText
                      primary={`User ID: ${result.user_id} - ${result.status === 'success' ? 'Created' : 'Failed'}`}
                      secondary={result.error || ''}
                    />
                    {result.status === 'success' ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <Tooltip title={result.error}>
                        <ErrorIcon color="error" />
                      </Tooltip>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBulkDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkUpload}
            disabled={!selectedFile || isUploading || !isAdmin}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateUsers;