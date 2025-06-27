import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Service account credentials
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL || '';
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '';

console.log("SERVICE_ACCOUNT_EMAIL", SERVICE_ACCOUNT_EMAIL);
console.log("SERVICE_ACCOUNT_PRIVATE_KEY", SERVICE_ACCOUNT_PRIVATE_KEY);
console.log("SPREADSHEET_ID", SPREADSHEET_ID);

/**
 * Проверяет, настроены ли учетные данные
 */
const hasValidCredentials = () => {
  return SPREADSHEET_ID && SPREADSHEET_ID.length > 0;
};

/**
 * Custom hook for Google Sheets API integration
 */
export const useGoogleSheets = () => {
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');

  // Эффект для получения API ключа
  useEffect(() => {
    // Проверяем наличие API ключа
    const key = process.env.API_KEY || '';
    if (!key) {
      setError('API ключ не настроен. Пожалуйста, добавьте API_KEY в файл .env');
      return;
    }
    setApiKey(key);
  }, []);

  /**
   * Fetches categories from Google Sheet
   */
  const fetchCategories = useCallback(async () => {
    if (!hasValidCredentials()) {
      setError('Отсутствуют необходимые учетные данные. Пожалуйста, проверьте настройки в файле .env');
      return;
    }

    try {
      setLoading(true);
      
      // Assuming categories are in a sheet named 'Categories' in column A
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Справочники!B2:B`,
        { 
          params: { 
            key: apiKey 
          }
        }
      );

      if (response.data && response.data.values) {
        // Flatten the 2D array to 1D
        const categoryList = response.data.values.map(row => row[0]).filter(Boolean);
        setCategories(categoryList);
      } else {
        setError('Категории не найдены в таблице');
      }
    } catch (err) {
      setError('Ошибка при загрузке категорий: ' + err.message);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  /**
   * Fetches authors from Google Sheet
   */
  const fetchAuthors = useCallback(async () => {
    if (!hasValidCredentials()) {
      setError('Отсутствуют необходимые учетные данные. Пожалуйста, проверьте настройки в файле .env');
      return;
    }

    try {
      setLoading(true);
      
      // Assuming authors are in a sheet named 'Authors' in column A
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Справочники!E2:E`,
        { 
          params: { 
            key: apiKey 
          }
        }
      );

      console.log("Fetch authors response:", response.data.values);

      if (response.data && response.data.values) {
        // Flatten the 2D array to 1D
        const authorList = response.data.values.map(row => row[0]).filter(Boolean);
        setAuthors(authorList);
      } else {
        setError('Авторы не найдены в таблице');
      }
    } catch (err) {
      setError('Ошибка при загрузке авторов: ' + err.message);
      console.error('Error fetching authors:', err);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  /**
   * Submits expense data to Google Sheet
   * @param {Object} expenseData - The expense data to submit
   * @returns {Promise} - Promise that resolves when data is submitted
   */
  const submitExpense = async (expenseData) => {
    if (!hasValidCredentials()) {
      throw new Error('Отсутствуют необходимые учетные данные. Пожалуйста, проверьте настройки в файле .env');
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Расходы!A1:append`,
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
          params: {
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            key: apiKey
          }
        }
      );
      
      setError(null);
      return response.data;
    } catch (err) {
      setError('Ошибка при отправке данных: ' + err.message);
      console.error('Error submitting expense:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load categories and authors when apiKey is available
  useEffect(() => {
    console.log("Fetching categories and authors");
    if (apiKey && hasValidCredentials()) {
      fetchCategories();
      fetchAuthors();
    }
  }, [apiKey, fetchCategories, fetchAuthors]);

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
    isTestMode: false // Всегда в рабочем режиме
  };
}; 