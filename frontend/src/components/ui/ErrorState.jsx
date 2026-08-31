import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorState = ({ message = 'Something went wrong while fetching data.', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-cyber-card border border-red-500/20 rounded-xl">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Error</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-surface hover:bg-cyber-border text-white rounded-lg transition-colors border border-cyber-border"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
