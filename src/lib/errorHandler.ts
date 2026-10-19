// StayNexa Centralized Error Handler & PostgreSQL Error Translator

export interface AppError {
  code?: string;
  message: string;
  userMessage: string;
  technicalDetails?: string;
  canRetry: boolean;
}

export function parseDatabaseError(error: unknown): AppError {
  if (!error) {
    return {
      message: 'Unknown error occurred',
      userMessage: 'An unexpected issue occurred. Please try again.',
      canRetry: true,
    };
  }

  const errObj = error as Record<string, any>;
  const code = String(errObj.code || errObj.statusCode || '');
  const rawMessage = String(errObj.message || errObj.error_description || JSON.stringify(error));

  // PostgreSQL Error Code Mapping
  switch (code) {
    case '23505': // Unique constraint violation
      return {
        code,
        message: rawMessage,
        userMessage: 'An item or room with this unique identifier already exists in the system.',
        technicalDetails: rawMessage,
        canRetry: false,
      };

    case '23503': // Foreign key violation
      return {
        code,
        message: rawMessage,
        userMessage: 'This action references a non-existent hotel, room, or user record.',
        technicalDetails: rawMessage,
        canRetry: false,
      };

    case '42501': // Insufficient privilege / RLS failure
      return {
        code,
        message: rawMessage,
        userMessage: 'Access denied: You do not have permission to access or modify records for this hotel tenant.',
        technicalDetails: rawMessage,
        canRetry: false,
      };

    case '42P01': // Undefined table
      return {
        code,
        message: rawMessage,
        userMessage: 'Database table not found. Please ensure all Supabase migrations are applied.',
        technicalDetails: rawMessage,
        canRetry: false,
      };

    case '42703': // Undefined column
      return {
        code,
        message: rawMessage,
        userMessage: 'Database column mismatch. Please verify that the latest schema migration has executed.',
        technicalDetails: rawMessage,
        canRetry: false,
      };

    case 'PGRST116': // Supabase single row query returned 0 rows
      return {
        code,
        message: rawMessage,
        userMessage: 'The requested record was not found.',
        technicalDetails: rawMessage,
        canRetry: false,
      };

    case '08006':
    case '08001':
    case '57P01':
      return {
        code,
        message: rawMessage,
        userMessage: 'Database connection interrupted. Please check your internet connection.',
        technicalDetails: rawMessage,
        canRetry: true,
      };

    default:
      if (rawMessage.toLowerCase().includes('network') || rawMessage.toLowerCase().includes('failed to fetch')) {
        return {
          code: 'NETWORK_ERROR',
          message: rawMessage,
          userMessage: 'Network error: Unable to reach the server. Please check your connection.',
          technicalDetails: rawMessage,
          canRetry: true,
        };
      }

      return {
        code: code || 'UNKNOWN',
        message: rawMessage,
        userMessage: rawMessage.length < 120 ? rawMessage : 'An unexpected database error occurred.',
        technicalDetails: rawMessage,
        canRetry: true,
      };
  }
}

export function logError(context: string, error: unknown): AppError {
  const parsed = parseDatabaseError(error);
  console.error(`[StayNexa Error: ${context}]`, {
    code: parsed.code,
    userMessage: parsed.userMessage,
    technicalDetails: parsed.technicalDetails,
  });
  return parsed;
}
