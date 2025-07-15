import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { jwtDecode } from 'jwt-decode';

// Provider component that wraps the app and makes auth object available to any child component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const checkToken = async () => {
      const storedToken = localStorage.getItem('authToken');
      
      if (storedToken) {
        try {
          // Verify token is valid and not expired
          const decoded = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp && decoded.exp < currentTime) {
            // Token expired
            localStorage.removeItem('authToken');
            setToken(null);
            setCurrentUser(null);
          } else {
            // Token valid
            setToken(storedToken);
            setCurrentUser({ username: decoded.username, isAuthenticated: true });
            
            // Set authorization header for all future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          }
        } catch (error) {
          console.error('Invalid token:', error);
          localStorage.removeItem('authToken');
          setToken(null);
          setCurrentUser(null);
        }
      }
      
      setLoading(false);
    };
    
    checkToken();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('AuthProvider: Attempting login with username:', username);
      
      // Get CSRF token first (if CSRF protection is enabled)
      let csrfToken;
      try {
        const csrfResponse = await axios.get('/api/csrf-token');
        csrfToken = csrfResponse.data.csrfToken;
      } catch (error) {
        console.log('CSRF token not available, continuing without it:', error.message);
      }
      
      // Make login request with CSRF token if available
      const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
      const response = await axios.post('/api/auth/login', { username, password }, { headers });
      
      console.log('AuthProvider: Login response:', response.data);
      
      if (response.data.success && response.data.token) {
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        setToken(response.data.token);
        
        // Set authorization header for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Decode token to get user info
        const decoded = jwtDecode(response.data.token);
        const user = { username: decoded.username, isAuthenticated: true };
        setCurrentUser(user);
        
        return true;
      } else {
        throw new Error(response.data.message || 'Неверные учетные данные');
      }
    } catch (error) {
      console.error('AuthProvider: Login error:', error);
      console.error('AuthProvider: Error response:', error.response?.data);
      setError(error.response?.data?.message || error.message || 'Ошибка входа');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  // Value object that will be passed to consumers of this context
  const value = {
    currentUser,
    token,
    login,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;