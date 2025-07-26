import { z } from 'zod';
import { sanitizeText } from './sanitization';

// Email validation schema
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .transform(sanitizeText);

// Client data validation schemas
export const clientSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform(sanitizeText),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .transform(sanitizeText),
  email: emailSchema,
  phone: z.string()
    .max(20, 'Phone number too long')
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
  company: z.string()
    .max(100, 'Company name too long')
    .optional()
    .transform(val => val ? sanitizeText(val) : undefined),
});

// Email content validation
export const emailContentSchema = z.object({
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long')
    .transform(sanitizeText),
  body: z.string()
    .min(1, 'Body is required')
    .max(50000, 'Email body too long'),
  recipient_emails: z.array(emailSchema)
    .min(1, 'At least one recipient is required'),
});

// Request validation
export const requestSchema = z.object({
  origin: z.string()
    .min(3, 'Origin is required')
    .max(100, 'Origin too long')
    .transform(sanitizeText),
  destination: z.string()
    .min(3, 'Destination is required')
    .max(100, 'Destination too long')
    .transform(sanitizeText),
  departure_date: z.string()
    .refine(date => !isNaN(Date.parse(date)), 'Invalid departure date'),
  passengers: z.number()
    .min(1, 'At least 1 passenger required')
    .max(9, 'Maximum 9 passengers allowed'),
});

// Generic text input validation
export const textInputSchema = z.string()
  .max(1000, 'Input too long')
  .transform(sanitizeText);

// Security validation helpers
export const validateUserInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.errors.map(e => e.message).join(', '));
    }
    throw new Error('Invalid input');
  }
};

// Rate limiting validation
export const isValidRequestRate = (lastRequestTime: number, minInterval: number = 1000): boolean => {
  return Date.now() - lastRequestTime >= minInterval;
};

// Password strength validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number, and special character');

// File upload validation
export const validateFileUpload = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  return true;
};