import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Switch, Typography, Box, CircularProgress, Alert, Button, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, IconButton, Tooltip, Pagination
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockReset as ResetPasswordIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const userSchema = Yup.object().shape({
  Username: Yup.string().required('Username is required'),
  Email: Yup.string().email('Invalid email').required('Email is required'),
  Role: Yup.string().required('Role is required'),
  PhoneNumber: Yup.string(),
  Team: Yup.string(),
  department: Yup.string(),
  Section: Yup.string()
});

const passwordSchema = Yup.object().shape({
  NewPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required')
});

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openReset, setOpenReset] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const userForm = useFormik({
    initialValues: {
      Username: '',
      Email: '',
      Role: '',
      Team: '',
      PhoneNumber: '',
      department: '',
      Section: ''
    },
    validationSchema: userSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await axios.put(`${process.env.REACT_APP_MANAGE_USERS_URL}/users/${selectedUser.UserID}`, values);
        setSuccess('User updated successfully');
        fetchUsers();
        handleCloseDialog();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to update user');
      } finally {
        setSubmitting(false);
      }
    }
  });
  const passwordForm = useFormik({
    initialValues: {
      NewPassword: ''
    },
    validationSchema: passwordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await axios.post(
          `${process.env.REACT_APP_MANAGE_USERS_URL}/users/${selectedUser.UserID}/reset-password`,
          values
        );
        setSuccess('Password reset successfully');
        handleCloseDialog();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to reset password');
      } finally {
        setSubmitting(false);
      }
    }
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_MANAGE_USERS_URL}/users`, {
        params: { page, limit, search }
      });
      setUsers(response.data.users);
      setTotalUsers(response.data.total);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleStatusChange = async (userId, field, value) => {
    try {
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.UserID === userId ? { ...user, [field]: value } : user
        )
      );

      await axios.patch(`${process.env.REACT_APP_MANAGE_USERS_URL}/users/${userId}/status`, {
        IsActive: field === 'IsActive' ? value : users.find(u => u.UserID === userId).IsActive,
        IsLocked: field === 'IsLocked' ? value : users.find(u => u.UserID === userId).IsLocked
      });
      setSuccess('User status updated successfully');
    } catch (err) {
      console.error('Error updating user status:', err);
      fetchUsers(); 
      setError('Failed to update user status');
    }
  };
  const handleDelete = async () => {
    try {
      await axios.delete(`${process.env.REACT_APP_MANAGE_USERS_URL}/users/${selectedUser.UserID}`);
      setSuccess('User deleted successfully');
      fetchUsers();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    userForm.setValues({
      Username: user.Username,
      Email: user.Email,
      Role: user.Role,
      Team: user.Team || '',
      PhoneNumber: user.PhoneNumber || '',
      department: user.department || '',
      Section: user.Section || ''
    });
    setOpenEdit(true);
  };

  const handleOpenReset = (user) => {
    setSelectedUser(user);
    passwordForm.resetForm();
    setOpenReset(true);
  };

  const handleOpenDelete = (user) => {
    setSelectedUser(user);
    setOpenDelete(true);
  };

  const handleCloseDialog = () => {
    setOpenEdit(false);
    setOpenDelete(false);
    setOpenReset(false);
    setSelectedUser(null);
  };
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search]);

  const roles = [...new Set(users.map(user => user.Role))];
  const teams = [...new Set(users.map(user => user.Team).filter(Boolean))];
  const departments = [...new Set(users.map(user => user.department).filter(Boolean))];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search users..."
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
          }}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ width: 300 }}
        />
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>
      )}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                  <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Locked</TableCell>
                  <TableCell>Actions</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.UserID}>
                    <TableCell>{user.UserID}</TableCell>
                    <TableCell>{user.Username}</TableCell>
                    <TableCell>{user.Email}</TableCell>
                    <TableCell>{user.PhoneNumber || '-'}</TableCell>
                    <TableCell>{user.Role}</TableCell>
                    <TableCell>{user.Team || '-'}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={user.IsActive}
                        onChange={(e) => handleStatusChange(user.UserID, 'IsActive', e.target.checked)}
                        color="success"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.IsLocked}
                        onChange={(e) => handleStatusChange(user.UserID, 'IsLocked', e.target.checked)}
                        color="error"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleOpenEdit(user)}>
                            <EditIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset Password">
                          <IconButton onClick={() => handleOpenReset(user)}>
                            <ResetPasswordIcon color="secondary" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleOpenDelete(user)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(totalUsers / limit)}
              page={page}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}

      <Dialog open={openEdit} onClose={handleCloseDialog}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <form onSubmit={userForm.handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              label="Username"
              name="Username"
              value={userForm.values.Username}
              onChange={userForm.handleChange}
              error={userForm.touched.Username && !!userForm.errors.Username}
              helperText={userForm.touched.Username && userForm.errors.Username}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              name="Email"
              type="email"
              value={userForm.values.Email}
              onChange={userForm.handleChange}
              error={userForm.touched.Email && !!userForm.errors.Email}
              helperText={userForm.touched.Email && userForm.errors.Email}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="Role"
                value={userForm.values.Role}
                onChange={userForm.handleChange}
                label="Role"
                error={userForm.touched.Role && !!userForm.errors.Role}
              >
                {roles.map(role => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="normal"
              label="Phone Number"
              name="PhoneNumber"
              value={userForm.values.PhoneNumber}
              onChange={userForm.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Team"
              name="Team"
              value={userForm.values.Team}
              onChange={userForm.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Department"
              name="department"
              value={userForm.values.department}
              onChange={userForm.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Section"
              name="Section"
              value={userForm.values.Section}
              onChange={userForm.handleChange}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={userForm.submitForm} 
            color="primary"
            disabled={userForm.isSubmitting}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openReset} onClose={handleCloseDialog}>
        <DialogTitle>Reset Password for {selectedUser?.Username}</DialogTitle>
        <DialogContent>
          <form onSubmit={passwordForm.handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              label="New Password"
              name="NewPassword"
              type="password"
              value={passwordForm.values.NewPassword}
              onChange={passwordForm.handleChange}
              error={passwordForm.touched.NewPassword && !!passwordForm.errors.NewPassword}
              helperText={passwordForm.touched.NewPassword && passwordForm.errors.NewPassword}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={passwordForm.submitForm} 
            color="primary"
            disabled={passwordForm.isSubmitting}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openDelete} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user {selectedUser?.Username}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleDelete} 
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageUsers;