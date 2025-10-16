import React, { useState } from 'react';
import {
  List, ListItem, ListItemText, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, LinearProgress
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
axios.defaults.withCredentials = true;

const AccountMenu = () => {
  const { logout, user, refreshAuth } = useAuth();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ 
    currentPassword: '', 
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await logout(navigate);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError('');
    setSuccess('');
  };

  const validatePassword = () => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  if (!strongRegex.test(form.newPassword)) {
    setError('Password must be at least 8 characters, with uppercase, lowercase, number, and special character.');
    return false;
  }
  if (form.newPassword !== form.confirmPassword) {
    setError('Passwords do not match');
    return false;
  }
  if (form.currentPassword === form.newPassword) {
    setError('New password must be different from current password');
    return false;
  }
  return true;
};


  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/change-password`,
        {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      setSuccess(response.data.message || 'Password updated successfully');
      await refreshAuth();
      
      setTimeout(() => {
        handleDialogClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                         err.message || 
                         'Failed to change password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <List disablePadding sx={{ pl: 2 }}>
        <ListItem button onClick={handleDialogOpen}>
          <ListItemText primary="Change Password" />
        </ListItem>
        <ListItem button onClick={handleLogout}>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {loading && <LinearProgress />}
          
          <TextField
            label="Current Password"
            type="password"
            fullWidth
            margin="normal"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            required
            autoComplete="current-password"
          />
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            required
           helperText="At least 8 characters with uppercase, lowercase, number, and special character."
            autoComplete="new-password"
          />
          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            margin="normal"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
            autoComplete="new-password"
          />
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained" 
            color="primary"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AccountMenu;