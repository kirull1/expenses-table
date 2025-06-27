import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  CircularProgress, 
  useTheme, 
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle
} from '@mui/material';
import { Formik, Form } from 'formik';
import { motion } from 'framer-motion';
import FormField from './FormField';
import Notification from './Notification';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { expenseFormSchema } from '../utils/validators';
import { formatDateForSheet } from '../utils/dateFormatter';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoIcon from '@mui/icons-material/Info';

const ExpenseForm = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { categories, authors, loading: apiLoading, error: apiError, submitExpense, isTestMode } = useGoogleSheets();
  
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const initialValues = {
    date: new Date(),
    category: '',
    amount: '',
    comment: '',
    author: ''
  };

  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    try {
      // Format date for Google Sheets
      const formattedValues = {
        ...values,
        date: formatDateForSheet(values.date),
        amount: String(values.amount) // Ensure amount is string for Google Sheets
      };

      await submitExpense(formattedValues);
      
      // Show success animation
      setSubmissionSuccess(true);
      
      // Show success notification
      setNotification({
        open: true,
        message: isTestMode 
          ? 'Расход успешно добавлен (тестовый режим)' 
          : 'Расход успешно добавлен!',
        severity: 'success'
      });
      
      // Reset form after delay
      setTimeout(() => {
        resetForm();
        setSubmissionSuccess(false);
      }, 1500);
      
    } catch (error) {
      setNotification({
        open: true,
        message: error.message || 'Ошибка при отправке данных',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const successVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: 'spring',
        stiffness: 200,
        damping: 10
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        backgroundColor: theme.palette.background.default
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 800,
          padding: { xs: 2, sm: 4 },
          borderRadius: 2
        }}
      >
        {submissionSuccess ? (
          <motion.div
            variants={successVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px'
            }}
          >
            <CheckCircleOutlineIcon 
              color="success" 
              sx={{ fontSize: 80, mb: 2 }} 
            />
            <Typography variant="h5" color="success.main">
              {isTestMode ? 'Расход успешно добавлен (тестовый режим)' : 'Расход успешно добавлен!'}
            </Typography>
          </motion.div>
        ) : (
          <>
            <Typography 
              variant="h4" 
              align="center" 
              gutterBottom
              sx={{ mb: 4 }}
            >
              Добавление расхода
            </Typography>
            
            {isTestMode && (
              <Alert 
                severity="info" 
                icon={<InfoIcon />}
                sx={{ mb: 3 }}
              >
                <AlertTitle>Тестовый режим</AlertTitle>
                Приложение работает в тестовом режиме с демонстрационными данными. Расходы не будут отправлены в Google Sheets.
                <br />
                Для полноценной работы укажите действительные API_KEY и SPREADSHEET_ID в файле .env
              </Alert>
            )}
            
            {apiError && !isTestMode && (
              <Card sx={{ mb: 3, bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography color="error">
                    {apiError}
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            <Formik
              initialValues={initialValues}
              validationSchema={expenseFormSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Grid container spacing={3}>
                      <Grid md={6} lg={6} sm={6} xs={12}>
                        <FormField
                          type="date"
                          name="date"
                          label="Дата"
                        />
                      </Grid>
                      <Grid md={6} lg={6} sm={6} xs={12}>
                        <FormField
                          type="autocomplete"
                          name="category"
                          label="Категория"
                          options={categories}
                          loading={apiLoading && !isTestMode}
                          disabled={apiLoading && !isTestMode || isSubmitting}
                        />
                      </Grid>
                      <Grid md={6} lg={6} sm={6} xs={12}>
                        <FormField
                          type="number"
                          name="amount"
                          label="Стоимость"
                          inputProps={{ 
                            min: 0.01, 
                            step: 0.01 
                          }}
                        />
                      </Grid>
                      <Grid md={6} lg={6} sm={6} xs={12}>
                        <FormField
                          type="select"
                          name="author"
                          label="Автор"
                          options={authors}
                          disabled={apiLoading && !isTestMode || isSubmitting}
                        />
                      </Grid>
                      <Grid xs={12}>
                        <FormField
                          type="textarea"
                          name="comment"
                          label="Комментарий"
                        />
                      </Grid>
                      <Grid xs={12} sx={{ textAlign: 'center' }}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          size="large"
                          disabled={isSubmitting || (apiLoading && !isTestMode)}
                          sx={{
                            minWidth: isMobile ? '100%' : '200px',
                            height: '56px',
                            borderRadius: '28px'
                          }}
                        >
                          {isSubmitting ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            'Добавить расход'
                          )}
                        </Button>
                      </Grid>
                    </Grid>
                  </motion.div>
                </Form>
              )}
            </Formik>
          </>
        )}
      </Paper>
      
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />
    </Box>
  );
};

export default ExpenseForm; 