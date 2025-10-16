import React from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthContext';

const AuthWrapper = ({ children }) => {
  const location = useLocation();
  return (
    <AuthProvider location={location}>
      {children}
    </AuthProvider>
  );
};

export default AuthWrapper;
