import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// Validation schema for login form with stronger password requirements
const loginSchema = Yup.object().shape({
  username: Yup.string().required('Имя пользователя обязательно'),
  password: Yup.string().required('Пароль обязателен'),
});

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login, error: authError, loading } = useAuth();
  const [loginError, setLoginError] = useState(null);

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoginError(null);
    
    try {
      console.log('Attempting login with:', values.username);
      const success = await login(values.username, values.password);
      console.log('Login result:', success);
      if (success) {
        // Redirect to home page after successful login
        navigate('/');
      } else {
        setLoginError('Неверное имя пользователя или пароль');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Ошибка входа');
    } finally {
      setSubmitting(false);
    }
  };
  

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Box
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: 400,
            padding: { xs: 3, sm: 4 },
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              backgroundColor: theme.palette.primary.main,
              borderRadius: '50%',
              padding: 1.5,
              marginBottom: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LockOutlinedIcon sx={{ color: 'white', fontSize: 30 }} />
          </Box>

          <Typography variant="h4" align="center" gutterBottom sx={{ mb: 3 }}>
            Вход в систему
          </Typography>

          {(loginError || authError) && (
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              {loginError || authError}
            </Alert>
          )}

          <Formik
            initialValues={{ username: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, touched, errors }) => (
              <Form style={{ width: '100%' }}>
                <Field name="username">
                  {({ field }) => (
                    <TextField
                      {...field}
                      label="Имя пользователя"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      error={touched.username && Boolean(errors.username)}
                      helperText={touched.username && errors.username}
                      disabled={isSubmitting || loading}
                    />
                  )}
                </Field>

                <Field name="password">
                  {({ field }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="Пароль"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      error={touched.password && Boolean(errors.password)}
                      helperText={touched.password && errors.password}
                      disabled={isSubmitting || loading}
                    />
                  )}
                </Field>

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={isSubmitting || loading}
                  sx={{ mt: 3, mb: 2, height: '56px', borderRadius: '28px' }}
                >
                  {isSubmitting || loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Войти'
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        </Paper>
      </Box>
    </Box>
  );
};

export default Login;