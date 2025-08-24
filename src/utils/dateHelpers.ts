import { format, isValid } from 'date-fns';

/**
 * Safely formats a date with fallback handling for null/undefined/invalid dates
 */
export const safeDateFormat = (
  date: string | Date | null | undefined,
  formatString: string = 'MMM d',
  fallback: string = 'No date'
): string => {
  if (!date) return fallback;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) return fallback;
    
    return format(dateObj, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return fallback;
  }
};

/**
 * Safely formats an email date with automatic fallback to created_at
 */
export const safeEmailDateFormat = (
  receivedAt: string | null | undefined,
  createdAt: string | null | undefined,
  formatString: string = 'MMM d',
  fallback: string = 'Unknown'
): string => {
  const primaryDate = receivedAt || createdAt;
  return safeDateFormat(primaryDate, formatString, fallback);
};