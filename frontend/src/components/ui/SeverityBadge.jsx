import React from 'react';

const SeverityBadge = ({ severity }) => {
  const styles = {
    CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    LOW: 'bg-green-500/10 text-green-500 border-green-500/20',
    NORMAL: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const style = styles[severity?.toUpperCase()] || styles.NORMAL;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {severity}
    </span>
  );
};

export default SeverityBadge;
