import React, { useState, useEffect } from 'react';
import { 
  Box, Avatar, Typography, TextField, Button, 
  IconButton, CircularProgress, Alert, Snackbar, 
  Grid, Badge, useTheme, Paper,
  Fade
} from '@mui/material';
import { 
  Edit, Save, LockReset, Visibility, 
  VisibilityOff, PhotoCamera, CheckCircle, ErrorOutline,
  Security, EmojiEvents, Rocket, TrendingUp, Lightbulb,
  ArrowBack 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { styled, keyframes } from '@mui/material/styles';

const eLightGreen = "#8DC63F";
const eDeepGreen = "#00AB4E";
const eLightBlue = "#23a6d5";
const eDeepBlue = "#23d5ab";
const eRed = "#ee7752";
const eYellow = "#ffeb3b";

const ProfileDashboard = ({ onBackToGameDashboard }) => {
  const { user, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    bio: '',
    department: '',
    section: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    bio: '',
  });
  const [activeSection, setActiveSection] = useState('profile');

  const theme = useTheme();

useEffect(() => {
  if (user) {
    setFormData({
      username: user.username || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      bio: user.bio || '',
      department: user.department || '',
      section: user.section || '',
    });
    
    if (user.profile_picture) {
      let url;
      if (user.profile_picture.startsWith("http")) {
        url = user.profile_picture;
        if (url.startsWith("http://") && process.env.NODE_ENV === 'production') {
          url = url.replace("http://", "https://");
        }
      } else {
        url = `${process.env.REACT_APP_PROFILE_PIC_BASE_URL || ''}${user.profile_picture}`;
      }
      setProfilePictureUrl(url);
    } else {
      setProfilePictureUrl('');
    }
  }
}, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      showNotification('Please upload a valid image (JPEG, PNG, GIF)', 'error');
      return;
    }

    if (file.size > maxSize) {
      showNotification('Image size should be less than 2MB', 'error');
      return;
    }

    setProfilePicture(file);
    setProfilePictureUrl(URL.createObjectURL(file));
  };

  const uploadProfilePicture = async () => {
    if (!profilePicture) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('profile_picture', profilePicture);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/upload-profile-picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setProfilePictureUrl(response.data.imageUrl);
        showNotification('Profile picture updated successfully!', 'success');
        await refreshAuth();
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Failed to update profile picture', 'error');
    } finally {
      setIsUploading(false);
      setProfilePicture(null);
    }
  };

  const handleSaveProfile = async () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/auth/update-profile`,
        formData,
        { withCredentials: true }
      );

      if (response.data.success) {
        showNotification('Profile updated successfully!', 'success');
        setEditMode(false);
        await refreshAuth();
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Failed to update profile', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showNotification('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        { withCredentials: true }
      );

      if (response.data.message === 'Password updated successfully') {
        showNotification('Password changed successfully!', 'success');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const message = error.response?.data?.error || 'Failed to change password';
      showNotification(message, 'error');
    }
  };

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const renderProfileSection = () => (
    <Fade in={activeSection === 'profile'} timeout={500}>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: eDeepGreen }}>
            Profile Information
          </Typography>
          {editMode ? (
            <Button
              variant="contained"
              onClick={handleSaveProfile}
              startIcon={<Save />}
              sx={{
                background: eLightGreen,
                '&:hover': { background: eDeepGreen }
              }}
            >
              Save Changes
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={() => setEditMode(true)}
              startIcon={<Edit />}
              sx={{
                color: eLightGreen,
                borderColor: eLightGreen,
                '&:hover': {
                  borderColor: eDeepGreen,
                  backgroundColor: `${eLightGreen}10`
                }
              }}
            >
              Edit Profile
            </Button>
          )}
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton 
                  component="label"
                  sx={{ 
                    background: 'rgba(255,255,255,0.9)',
                    '&:hover': { background: 'rgba(255,255,255,0.7)' }
                  }}
                >
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                  <PhotoCamera sx={{ fontSize: 16, color: eDeepGreen }} />
                </IconButton>
              }
            >
              <Avatar
                src={profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&size=120`}
                sx={{ width: 120, height: 120, border: `3px solid ${eLightGreen}`, mb: 2 }}
              />
            </Badge>
            
            {profilePicture && (
              <Button
                variant="contained"
                onClick={uploadProfilePicture}
                disabled={isUploading}
                startIcon={isUploading ? <CircularProgress size={16} /> : <Save />}
                sx={{ 
                  mt: 1, 
                  background: eLightGreen,
                  '&:hover': { background: eDeepGreen }
                }}
              >
                {isUploading ? 'Uploading...' : 'Save Picture'}
              </Button>
            )}
            
           
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  error={!!errors.username}
                  helperText={errors.username}
                  disabled={!editMode}
                  variant={editMode ? 'outlined' : 'filled'}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  disabled={!editMode}
                  variant={editMode ? 'outlined' : 'filled'}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber}
                  disabled={!editMode}
                  variant={editMode ? 'outlined' : 'filled'}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  variant={editMode ? 'outlined' : 'filled'}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  error={!!errors.bio}
                  helperText={errors.bio}
                  disabled={!editMode}
                  variant={editMode ? 'outlined' : 'filled'}
                  InputProps={{ readOnly: !editMode }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );

  const renderSecuritySection = () => (
    <Fade in={activeSection === 'security'} timeout={500}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: eDeepGreen, mb: 3 }}>
          Security Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.7)' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Security sx={{ mr: 1, color: eLightBlue }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Change Password
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type={showPassword.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => togglePasswordVisibility('current')}
                      edge="end"
                    >
                      {showPassword.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type={showPassword.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => togglePasswordVisibility('new')}
                      edge="end"
                    >
                      {showPassword.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type={showPassword.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirm')}
                      edge="end"
                    >
                      {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <Button
                variant="contained"
                onClick={handleChangePassword}
                startIcon={<LockReset />}
                disabled={
                  !passwordData.currentPassword ||
                  !passwordData.newPassword ||
                  !passwordData.confirmPassword
                }
                sx={{
                  background: eLightBlue,
                  '&:hover': { background: eDeepBlue }
                }}
              >
                Change Password
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2, background: 'rgba(255,255,255,0.7)' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Lightbulb sx={{ mr: 1, color: eYellow }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Security Tips
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ fontSize: 16, color: eLightGreen, mr: 1 }} />
                  Use a unique password that you don't use elsewhere
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ fontSize: 16, color: eLightGreen, mr: 1 }} />
                  Change your password regularly
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ fontSize: 16, color: eLightGreen, mr: 1 }} />
                  Never share your password with anyone
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ fontSize: 16, color: eLightGreen, mr: 1 }} />
                  Enable two-factor authentication if available
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh', 
      background: 'white',
      color: '#212529',
      py: 2,
      px: { xs: 1, sm: 2, md: 4 }
    }}>
      <Box sx={{
        backgroundColor: 'white',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: `1px solid ${eLightGreen}20`,
        minHeight: 'calc(100vh - 40px)',
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${eLightGreen} 0%, ${eLightBlue} 50%, ${eDeepBlue} 100%)`,
          zIndex: 1
        }
      }}>
        <Box sx={{ 
          p: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${eLightGreen}20`
        }}>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
           <IconButton 
  onClick={() => navigate(-1)}
  sx={{ mr: 2, color: eDeepGreen }}
>
  <ArrowBack />
</IconButton>
            <Button
              variant={activeSection === 'profile' ? 'contained' : 'outlined'}
              onClick={() => setActiveSection('profile')}
              startIcon={<PhotoCamera />}
              sx={{
                background: activeSection === 'profile' ? eLightGreen : 'transparent',
                color: activeSection === 'profile' ? 'white' : eLightGreen,
                borderColor: eLightGreen,
                '&:hover': {
                  background: activeSection === 'profile' ? eDeepGreen : `${eLightGreen}10`,
                  borderColor: eDeepGreen
                }
              }}
            >
              Profile
            </Button>
            <Button
              variant={activeSection === 'security' ? 'contained' : 'outlined'}
              onClick={() => setActiveSection('security')}
              startIcon={<Security />}
              sx={{
                background: activeSection === 'security' ? eLightBlue : 'transparent',
                color: activeSection === 'security' ? 'white' : eLightBlue,
                borderColor: eLightBlue,
                '&:hover': {
                  background: activeSection === 'security' ? eDeepBlue : `${eLightBlue}10`,
                  borderColor: eDeepBlue
                }
              }}
            >
              Security
            </Button>
          </Box>
        </Box>
        <Box>
          {activeSection === 'profile' ? renderProfileSection() : renderSecuritySection()}
        </Box>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
          icon={notification.severity === 'success' ? <CheckCircle /> : <ErrorOutline />}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfileDashboard;