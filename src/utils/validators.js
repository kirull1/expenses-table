import * as Yup from 'yup';
import { isDateTodayOrPast } from './dateFormatter';

/**
 * Validation schema for expense form
 */
export const expenseFormSchema = Yup.object().shape({
  date: Yup.date()
    .required('Дата обязательна')
    .test(
      'is-today-or-past',
      'Дата не может быть в будущем',
      (value) => isDateTodayOrPast(value)
    ),
  category: Yup.string()
    .required('Выберите категорию'),
  amount: Yup.number()
    .required('Введите стоимость')
    .positive('Стоимость должна быть положительной')
    .min(0.01, 'Минимальная стоимость 0.01'),
  comment: Yup.string()
    .max(500, 'Комментарий слишком длинный'),
  author: Yup.string()
  .required('Выберите автора')
  .default('-')
}); 
