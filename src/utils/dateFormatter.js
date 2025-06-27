import { format } from 'date-fns';

/**
 * Formats a date object to dd.mm.yyyy string format
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateForSheet = (date) => {
  if (!date) return '';
  return format(date, 'dd.MM.yyyy');
};

/**
 * Checks if a date is today or in the past
 * @param {Date} date - The date to check
 * @returns {boolean} True if date is today or in the past
 */
export const isDateTodayOrPast = (date) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today || isSameDay(date, today);
};

/**
 * Checks if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if dates are the same day
 */
const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}; 