import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  description?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading ration shop details...',
  description = 'Fetching the latest crowdsourced reports and device operational status.',
}) => {
  return (
    <div
      className="p-8 sm:p-12 bg-white rounded-lg border border-slate-200 shadow-sm text-center max-w-lg mx-auto"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-10 h-10 text-brand-700 animate-spin mx-auto mb-4" />
      <h3 className="text-base font-semibold text-slate-900 mb-1">{message}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>

      {/* Accessible visual skeleton placeholder */}
      <div className="mt-6 space-y-2.5 max-w-xs mx-auto animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-full"></div>
        <div className="h-3 bg-slate-200 rounded w-5/6 mx-auto"></div>
        <div className="h-3 bg-slate-100 rounded w-2/3 mx-auto"></div>
      </div>
    </div>
  );
};
