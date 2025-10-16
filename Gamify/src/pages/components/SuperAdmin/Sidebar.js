import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import AccountMenu from '../auth/AccountMenu'; 

const SidebarContainer = styled(Drawer)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: 240,
    backgroundColor: theme.palette.background.paper,
    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    zIndex: theme.zIndex.appBar - 1,
    marginTop: '64px',
    height: 'calc(100vh - 64px)',
    display: 'flex',
    flexDirection: 'column', 
  },
}));

const SidebarHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const Sidebar = ({
  onSelect,
  currentView,
  open,
  onClose,
  isMobile,
  menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
    { text: 'Create Users', icon: <PersonAddIcon />, view: 'createUsers' },
    { text: 'Manage Users', icon: <PeopleIcon />, view: 'manageUsers' },
  ],
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [showSettings, setShowSettings] = useState(false);

  const handleItemClick = (view) => {
    onSelect(view);
    if (isMobile) {
      onClose();
    }
  };

  return (
    <SidebarContainer
      variant={fullScreen ? 'temporary' : 'permanent'}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
    >
      {fullScreen && (
        <SidebarHeader>
          <IconButton onClick={onClose}>
            <ChevronLeftIcon />
          </IconButton>
        </SidebarHeader>
      )}
      <Divider />
      <List sx={{ pt: 0, flex: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            selected={currentView === item.view}
            onClick={() => handleItemClick(item.view)}
            sx={{
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.light,
                '&:hover': {
                  backgroundColor: theme.palette.primary.light,
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              px: 3,
              py: 1,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color:
                  currentView === item.view
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                fontWeight: currentView === item.view ? 600 : 400,
                color:
                  currentView === item.view
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
              }}
            />
          </ListItem>
        ))}
        <ListItem
          button
          onClick={() => setShowSettings((prev) => !prev)}
          sx={{
            px: 3,
            py: 1,
            borderTop: '1px solid rgba(0,0,0,0.1)',
            color: showSettings ? theme.palette.primary.main : theme.palette.text.primary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: showSettings ? theme.palette.primary.main : theme.palette.text.secondary,
            }}
          >
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Settings"
            primaryTypographyProps={{
              fontWeight: showSettings ? 600 : 400,
            }}
          />
        </ListItem>
        <Collapse in={showSettings} timeout="auto" unmountOnExit>
          <Box sx={{ px: 3, pb: 2 }}>
            <AccountMenu />
          </Box>
        </Collapse>
      </List>
    </SidebarContainer>
  );
};

export default Sidebar;
