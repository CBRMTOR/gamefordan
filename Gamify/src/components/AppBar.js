import React, { useContext } from 'react';
import { AppBar as MuiAppBar, Toolbar, Typography, Button, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AuthContext from '../context/AuthContext';

const AppBar = () => {
  const { user, logout } = useContext(AuthContext);
  
  return (
    <MuiAppBar position="fixed">
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          PC Audit System
        </Typography>
        {user && (
          <>
            <Typography variant="subtitle1" sx={{ mr: 2 }}>
              {user.username} ({user.role})
            </Typography>
            <Button color="inherit" onClick={logout}>
              Logout
            </Button>
          </>
        )}
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;