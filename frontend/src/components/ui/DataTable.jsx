import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import { Database } from 'lucide-react';

const DataTable = ({ columns, data, isLoading, emptyMessage = 'No data found', onRowClick }) => {
  if (isLoading) {
    return (
      <div className="p-8 flex justify-center bg-cyber-card border border-cyber-border rounded-xl">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={Database} title="No Records" description={emptyMessage} />;
  }

  return (
    <div className="w-full overflow-x-auto bg-cyber-card border border-cyber-border rounded-xl">
      <table className="w-full text-left text-sm text-gray-400">
        <thead className="text-xs text-gray-400 uppercase bg-cyber-surface border-b border-cyber-border">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 font-medium">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr 
              key={i} 
              onClick={() => onRowClick && onRowClick(row)}
              className={`border-b border-cyber-border last:border-0 hover:bg-cyber-surface transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, j) => (
                <td key={j} className="px-6 py-4 whitespace-nowrap text-white">
                  {col.cell ? col.cell(row) : row[col.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
