import React from 'react';

const AdBanner = ({ size = 'horizontal', className = '' }) => {
  const sizes = {
    horizontal: { width: 728, height: 90, class: 'w-full max-w-3xl h-24' },
    square: { width: 300, height: 250, class: 'w-72 h-64' },
    vertical: { width: 160, height: 600, class: 'w-40 h-[600px]' },
    mobile: { width: 320, height: 50, class: 'w-full max-w-xs h-14' }
  };

  const { width, height, class: sizeClass } = sizes[size];

  return (
    <div className={`${sizeClass} bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto my-4 ${className}`}>
      <div className="text-center text-gray-500 p-4">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
        <p className="text-sm font-medium">Spazio pubblicitario {width}x{height}</p>
        <p className="text-xs mt-1 opacity-75">Il servizio rimane gratuito grazie agli sponsor</p>
      </div>
    </div>
  );
};

export default AdBanner; 