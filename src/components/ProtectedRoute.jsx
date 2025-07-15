import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children }) => {
  const { currentUser, token, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Check token expiration
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        // If token is expired, logout and redirect to login
        if (decoded.exp && decoded.exp < currentTime) {
          console.log('Token expired, redirecting to login');
          logout();
          navigate('/login');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        logout();
        navigate('/login');
      }
    }
  }, [token, logout, navigate]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !token) {
    return <Navigate to="/login" />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;