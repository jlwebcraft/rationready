import React from 'react';
import { SearchX, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Ration Shops Found',
  message = 'No Fair Price Shops matched your filter criteria in the current locality.',
  actionText = 'Reset Filters',
  onAction,
}) => {
  return (
    <div className="p-8 sm:p-12 bg-white rounded-lg border border-slate-200 shadow-sm text-center max-w-lg mx-auto">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-6">{message}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center space-x-2 bg-brand-700 text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
