import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ErrorToastOptions extends ToastOptions {
  showDetails?: boolean;
}

// Centralized toast utilities to reduce duplicated code
export const toastHelpers = {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action,
    });
  },

  error: (message: string, error?: any, options?: ErrorToastOptions) => {
    let description = options?.description;
    
    // Extract meaningful error message if error object provided
    if (error && options?.showDetails !== false) {
      if (typeof error === 'string') {
        description = error;
      } else if (error?.message) {
        description = error.message;
      } else if (error?.error?.message) {
        description = error.error.message;
      } else if (error?.details) {
        description = error.details;
      }
    }

    sonnerToast.error(message, {
      duration: options?.duration || 6000,
      description,
      action: options?.action,
    });
  },

  loading: (message: string, promise: Promise<any>, options?: {
    success?: string;
    error?: string;
  }) => {
    return sonnerToast.promise(promise, {
      loading: message,
      success: options?.success || 'Operation completed successfully',
      error: options?.error || 'Operation failed',
    });
  },

  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action,
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      duration: options?.duration || 5000,
      description: options?.description,
      action: options?.action,
    });
  },
};

// Compatibility layer for old toast calls
export const toast = (options: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: any;
  duration?: number;
}) => {
  if (options.variant === 'destructive') {
    toastHelpers.error(options.title || 'Error', options.description, { 
      duration: options.duration,
      action: options.action 
    });
  } else {
    toastHelpers.success(options.title || 'Success', { 
      description: options.description,
      duration: options.duration,
      action: options.action 
    });
  }
};

// Specific helpers for common patterns
export const supabaseErrorToast = (operation: string, error: any) => {
  toastHelpers.error(`Failed to ${operation}`, error, { showDetails: true });
};

export const supabaseSuccessToast = (operation: string, description?: string) => {
  toastHelpers.success(`${operation} completed successfully`, { description });
};