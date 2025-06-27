import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_KEY = import.meta.env.VITE_API_KEY || '';
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || '';

// Тестовые данные для демонстрации интерфейса
const TEST_CATEGORIES = ['Продукты', 'Транспорт', 'Развлечения', 'Коммунальные услуги', 'Одежда', 'Рестораны', 'Здоровье', 'Образование', 'Путешествия'];
const TEST_AUTHORS = ['Иван', 'Мария', 'Алексей', 'Екатерина', 'Дмитрий'];

/**
 * Проверяет, используются ли фиктивные ключи API
 */
const isUsingDummyKeys = () => {
  return API_KEY === 'dummy_api_key' || SPREADSHEET_ID === 'dummy_spreadsheet_id' || !API_KEY || !SPREADSHEET_ID;
};

/**
 * Custom hook for Google Sheets API integration
 */
export const useGoogleSheets = () => {
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches categories from Google Sheet or returns test data
   */
  const fetchCategories = useCallback(async () => {
    // Если используются фиктивные ключи, возвращаем тестовые данные
    if (isUsingDummyKeys()) {
      console.log('Используются тестовые категории (фиктивные ключи API)');
      setCategories(TEST_CATEGORIES);
      return;
    }

    try {
      setLoading(true);
      // Assuming categories are in a sheet named 'Categories' in column A
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Categories!A2:A`,
        { params: { key: API_KEY } }
      );

      if (response.data && response.data.values) {
        // Flatten the 2D array to 1D
        const categoryList = response.data.values.map(row => row[0]).filter(Boolean);
        setCategories(categoryList);
      }
      setError(null);
    } catch (err) {
      setError('Ошибка при загрузке категорий: ' + err.message);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches authors from Google Sheet or returns test data
   */
  const fetchAuthors = useCallback(async () => {
    // Если используются фиктивные ключи, возвращаем тестовые данные
    if (isUsingDummyKeys()) {
      console.log('Используются тестовые авторы (фиктивные ключи API)');
      setAuthors(TEST_AUTHORS);
      return;
    }

    try {
      setLoading(true);
      // Assuming authors are in a sheet named 'Authors' in column A
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Authors!A2:A`,
        { params: { key: API_KEY } }
      );

      if (response.data && response.data.values) {
        // Flatten the 2D array to 1D
        const authorList = response.data.values.map(row => row[0]).filter(Boolean);
        setAuthors(authorList);
      }
      setError(null);
    } catch (err) {
      setError('Ошибка при загрузке авторов: ' + err.message);
      console.error('Error fetching authors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Submits expense data to Google Sheet
   * @param {Object} expenseData - The expense data to submit
   * @returns {Promise} - Promise that resolves when data is submitted
   */
  const submitExpense = async (expenseData) => {
    // Если используются фиктивные ключи, имитируем успешную отправку
    if (isUsingDummyKeys()) {
      console.log('Тестовый режим: данные не отправляются в Google Sheets');
      console.log('Данные расхода:', expenseData);
      
      // Имитируем задержку сети
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { 
        success: true, 
        message: 'Тестовый режим: данные успешно обработаны (но не отправлены в Google Sheets)' 
      };
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
            key: API_KEY
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

  // Load categories and authors on mount
  useEffect(() => {
    fetchCategories();
    fetchAuthors();
  }, [fetchCategories, fetchAuthors]);

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
    isTestMode: isUsingDummyKeys()
  };
}; 