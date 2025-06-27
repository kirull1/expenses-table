import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Получаем переменные окружения из window.ENV_VARS или process.env
const getEnvVar = (name) => {
  if (window.ENV_VARS && window.ENV_VARS[name]) {
    return window.ENV_VARS[name];
  }
  if (window.process && window.process.env && window.process.env[name]) {
    return window.process.env[name];
  }
  return '';
};

// Configuration - read from environment variables
const SPREADSHEET_ID = getEnvVar('SPREADSHEET_ID');

// For debugging
console.log("SPREADSHEET_ID available:", !!SPREADSHEET_ID);

/**
 * Custom hook for Google Sheets API integration
 */
export const useGoogleSheets = () => {
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [spreadsheetId, setSpreadsheetId] = useState(SPREADSHEET_ID);

  // Try to get environment variables from API if not available in client
  useEffect(() => {
    if (!spreadsheetId) {
      const fetchEnvVars = async () => {
        try {
          const response = await axios.get('/api/env-info');
          if (response.data && response.data.SPREADSHEET_ID) {
            console.log("Got SPREADSHEET_ID from API:", response.data.SPREADSHEET_ID);
            setSpreadsheetId(response.data.SPREADSHEET_ID);
          }
        } catch (err) {
          console.error("Error fetching env vars from API:", err);
        }
      };
      
      fetchEnvVars();
    }
  }, [spreadsheetId]);

  // Function to get access token
  const getAccessToken = useCallback(async () => {
    try {
      const response = await axios.post('/api/auth/google-token');
      return response.data.access_token;
    } catch (err) {
      console.error('Error getting access token:', err);
      setError('Error getting access token: ' + err.message);
      return null;
    }
  }, []);

  // Initialize access token
  useEffect(() => {
    const initToken = async () => {
      const token = await getAccessToken();
      if (token) {
        setAccessToken(token);
      }
    };

    if (spreadsheetId) {
      console.log("Initializing token with spreadsheetId:", spreadsheetId);
      initToken();
    } else {
      setError('Missing spreadsheet ID. Please check your .env file settings.');
    }
  }, [getAccessToken, spreadsheetId]);

  /**
   * Fetches categories from Google Sheet
   */
  const fetchCategories = useCallback(async () => {
    if (!accessToken || !spreadsheetId) return;

    try {
      setLoading(true);
      
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Справочники!B2:B`,
        { 
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (response.data && response.data.values) {
        const categoryList = response.data.values.map(row => row[0]).filter(Boolean);
        setCategories(categoryList);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, spreadsheetId]);

  /**
   * Fetches authors from Google Sheet
   */
  const fetchAuthors = useCallback(async () => {
    if (!accessToken || !spreadsheetId) return;

    try {
      setLoading(true);
      
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Справочники!E2:E`,
        { 
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (response.data && response.data.values) {
        const authorList = response.data.values.map(row => row[0]).filter(Boolean);
        setAuthors(authorList);
      } else {
        setAuthors([]);
      }
    } catch (err) {
      console.error('Error fetching authors:', err);
      setAuthors([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, spreadsheetId]);

  /**
   * Submits expense data to Google Sheet
   */
  const submitExpense = async (expenseData) => {
    if (!accessToken) {
      throw new Error('Access token not initialized');
    }

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not available');
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Расходы!A1:append`,
        {
          values: [[
            expenseData.date,
            expenseData.category,
            expenseData.amount,
            expenseData.comment,
            expenseData.author
          ]]
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS'
          }
        }
      );
      
      setError(null);
      return response.data;
    } catch (err) {
      setError('Error submitting data: ' + err.message);
      console.error('Error submitting expense:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load categories and authors when access token is available
  useEffect(() => {
    if (accessToken && spreadsheetId) {
      fetchCategories();
      fetchAuthors();
    }
  }, [accessToken, spreadsheetId, fetchCategories, fetchAuthors]);

  return {
    categories,
    authors,
    loading,
    error,
    submitExpense,
    refreshData: () => {
      fetchCategories();
      fetchAuthors();
    },
    isTestMode: false,
    spreadsheetId
  };
}; 