import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-cyber-card border border-cyber-border rounded-xl mt-4">
      <div className="text-sm text-gray-400">
        Page <span className="font-medium text-white">{currentPage}</span> of <span className="font-medium text-white">{totalPages || 1}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 text-gray-400 hover:text-white hover:bg-cyber-surface disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-cyber-border transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 text-gray-400 hover:text-white hover:bg-cyber-surface disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-cyber-border transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
