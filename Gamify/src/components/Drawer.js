import React from 'react';
import { Drawer as MuiDrawer, List, ListItem, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import { Home, Report, Settings } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Drawer = () => {
  const user = { role: 'admin' }; // Hardcoded or just remove the conditions

  return (
    <MuiDrawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <List>
        <ListItem button component={Link} to="/">
          <ListItemIcon><Home /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/report">
          <ListItemIcon><Report /></ListItemIcon>
          <ListItemText primary="Report Incident" />
        </ListItem>
        <ListItem button component={Link} to="/settings">
          <ListItemIcon><Settings /></ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
    </MuiDrawer>
  );
};

export default Drawer;
