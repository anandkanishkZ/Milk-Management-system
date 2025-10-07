import React from 'react';
import { toast, ToastOptions, Id } from 'react-toastify';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Custom toast options with better defaults
const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Enhanced toast functions with icons and better styling
export const Toast = {
  // Success toast with checkmark icon
  success: (message: string, options?: ToastOptions): Id => {
    const ToastContent = () => (
      <div className="flex items-center">
        <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
    );
    return toast.success(<ToastContent />, { ...defaultOptions, ...options });
  },

  // Error toast with X icon
  error: (message: string, options?: ToastOptions): Id => {
    const ToastContent = () => (
      <div className="flex items-center">
        <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
    );
    return toast.error(<ToastContent />, { ...defaultOptions, autoClose: 6000, ...options });
  },

  // Warning toast with alert icon
  warning: (message: string, options?: ToastOptions): Id => {
    const ToastContent = () => (
      <div className="flex items-center">
        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
    );
    return toast.warning(<ToastContent />, { ...defaultOptions, ...options });
  },

  // Info toast with info icon
  info: (message: string, options?: ToastOptions): Id => {
    const ToastContent = () => (
      <div className="flex items-center">
        <Info className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
    );
    return toast.info(<ToastContent />, { ...defaultOptions, ...options });
  },

  // Loading toast for async operations
  loading: (message: string, options?: ToastOptions): Id => {
    const ToastContent = () => (
      <div className="flex items-center">
        <div className="w-5 h-5 mr-3 flex-shrink-0">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
        </div>
        <span className="font-medium">{message}</span>
      </div>
    );
    return toast.info(<ToastContent />, { 
      ...defaultOptions, 
      autoClose: false,
      closeOnClick: false,
      hideProgressBar: true,
      ...options 
    });
  },

  // Promise toast for async operations with automatic success/error handling
  promise: <T,>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: ToastOptions
  ): Promise<T> => {
    const loadingToast = Toast.loading(loadingMessage, options);

    return promise
      .then((data) => {
        toast.dismiss(loadingToast);
        const message = typeof successMessage === 'function' ? successMessage(data) : successMessage;
        Toast.success(message, options);
        return data;
      })
      .catch((error) => {
        toast.dismiss(loadingToast);
        const message = typeof errorMessage === 'function' ? errorMessage(error) : errorMessage;
        Toast.error(message, options);
        throw error;
      });
  },

  // Dismiss specific toast
  dismiss: (toastId?: Id): void => {
    toast.dismiss(toastId);
  },

  // Dismiss all toasts
  dismissAll: (): void => {
    toast.dismiss();
  },

  // Update existing toast
  update: (toastId: Id, options: ToastOptions): void => {
    toast.update(toastId, options);
  },

  // Custom toast with full control
  custom: (content: React.ReactNode, options?: ToastOptions): Id => {
    return toast(content, { ...defaultOptions, ...options });
  },
};

// Utility functions for common scenarios
export const ToastUtils = {
  // API error handler
  handleApiError: (error: any, customMessage?: string): void => {
    const message = customMessage || error.response?.data?.message || error.message || 'An unexpected error occurred';
    Toast.error(message);
  },

  // Success with action button
  successWithAction: (message: string, actionLabel: string, onAction: () => void): Id => {
    const ToastContent = () => (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
        <button
          onClick={onAction}
          className="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded-md text-sm font-medium hover:bg-opacity-30 transition-colors"
        >
          {actionLabel}
        </button>
      </div>
    );
    return toast.success(<ToastContent />, {
      ...defaultOptions,
      autoClose: 8000,
      closeOnClick: false,
    });
  },

  // Confirmation toast
  confirm: (message: string, onConfirm: () => void, onCancel?: () => void): Id => {
    const ToastContent = () => (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
        <div className="flex space-x-2 ml-8">
          <button
            onClick={() => {
              onConfirm();
              Toast.dismissAll();
            }}
            className="px-3 py-1 bg-white bg-opacity-20 rounded-md text-sm font-medium hover:bg-opacity-30 transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={() => {
              onCancel?.();
              Toast.dismissAll();
            }}
            className="px-3 py-1 bg-white bg-opacity-10 rounded-md text-sm font-medium hover:bg-opacity-20 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
    return toast.warning(<ToastContent />, {
      ...defaultOptions,
      autoClose: false,
      closeOnClick: false,
    });
  },
};

export default Toast;