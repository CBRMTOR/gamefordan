import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import KpiCompetition from './pages/Gamification/gameAdmin/KPI/KpiCompetition';
import GameDashboard from './pages/Gamification/GamificationUser/GameDashboard';
import SuperAdminDashboard from './pages/components/SuperAdmin/SuperAdminDashboard';
import ManageUsers from './pages/components/SuperAdmin/ManageUsers';
import LoginPage from './pages/components/auth/LoginPage';
import UnauthorizedPage from './pages/components/auth/UnauthorizedPage';
import GamificationAdmin from './pages/Gamification/gameAdmin/GamificationAdmin';
import QuizDashboard from './pages/Gamification/GamificationUser/Quiz/QuizDashboard';
import ProfileDashboard from './pages/Gamification/GamificationUser/ProfileDashboard'; 
import Leaderboard from './pages/Gamification/GamificationUser/LeaderboardDashboard';
import PostsComponent from './pages/Gamification/GamificationUser/posteuser/Posts';
import { AuthProvider, useAuth } from './context/AuthContext';
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/users"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gamification-admin"
              element={
                <ProtectedRoute roles={['game_admin']}>
                  <GamificationAdmin />
                </ProtectedRoute>
              }
            />
<Route
  path="/game-dashboard"
  element={
    <ProtectedRoute roles={['user', 'superadmin', 'game_admin']}>
      <GameDashboard />
    </ProtectedRoute>
  }
>
  <Route index element={<PostsComponent />} />
  <Route path="posts" element={<PostsComponent />} />
  <Route path="quizzes" element={<QuizDashboard />} />
  <Route path="quizzes/attempt/:attemptId" element={<QuizDashboard />} />
  <Route path="leaderboard" element={<Leaderboard />} />
</Route>
<Route
  path="/kpi-competition"
  element={
    <ProtectedRoute roles={['user', 'superadmin', 'game_admin']}>
      <KpiCompetition />
    </ProtectedRoute>
  }
/>
<Route
  path="/profile"
  element={
    <ProtectedRoute roles={['user', 'superadmin', 'game_admin']}>
      <ProfileDashboard />
    </ProtectedRoute>
  }
/>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
