import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Data',
  message = 'A network error occurred while retrieving current shop reports. Please try again.',
  onRetry,
}) => {
  return (
    <div
      className="p-8 sm:p-12 bg-red-50/70 border border-red-200 rounded-lg text-center max-w-lg mx-auto shadow-sm"
      role="alert"
    >
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-xs text-red-700 leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 bg-red-700 text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};
