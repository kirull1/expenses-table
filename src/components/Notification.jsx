import React from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Notification component for displaying success/error messages
 */
const Notification = ({ open, message, severity, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <Snackbar
            open={open}
            autoHideDuration={6000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            TransitionComponent={Slide}
          >
            <Alert 
              onClose={onClose} 
              severity={severity} 
              variant="filled" 
              sx={{ width: '100%' }}
            >
              {message}
            </Alert>
          </Snackbar>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification; 