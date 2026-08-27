import React from 'react';

/**
 * Smart Civic System Official SVG Logo Component (User Palette Match: #226948)
 */
const CivicLogo = ({ variant = 'full', size = 'md', className = '', showTagline = true }) => {
  const sizeMap = {
    sm: { symbolSize: 34, titleSize: 'text-sm', subtitleSize: 'text-[10px]' },
    md: { symbolSize: 42, titleSize: 'text-base', subtitleSize: 'text-[11px]' },
    lg: { symbolSize: 56, titleSize: 'text-xl', subtitleSize: 'text-xs' },
    xl: { symbolSize: 84, titleSize: 'text-2xl', subtitleSize: 'text-xs' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const SymbolSvg = () => (
    <svg
      width={currentSize.symbolSize}
      height={currentSize.symbolSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path d="M50 8C72 8 88 24 88 48C88 70 70 88 50 88C28 88 12 70 12 48C12 24 28 8 50 8Z" stroke="#226948" strokeWidth="3" fill="#E0EFE6" />
      <rect x="28" y="42" width="12" height="28" rx="2" fill="#8DAF9C" />
      <rect x="60" y="38" width="13" height="32" rx="2" fill="#4D7C65" />
      <rect x="41" y="24" width="18" height="48" rx="2.5" fill="#182F25" />
      <path d="M47 17L50 11L53 17H47Z" fill="#226948" />
      <rect x="45" y="29" width="3.5" height="6" rx="1" fill="#FFFFFF" opacity="0.9" />
      <rect x="51.5" y="29" width="3.5" height="6" rx="1" fill="#FFFFFF" opacity="0.9" />
      <rect x="45" y="39" width="3.5" height="6" rx="1" fill="#FFFFFF" opacity="0.9" />
      <rect x="51.5" y="39" width="3.5" height="6" rx="1" fill="#FFFFFF" opacity="0.9" />
      <path d="M16 68C22 55 36 54 44 65C34 76 22 75 16 68Z" fill="#4D7C65" />
      <path d="M25 76C32 60 48 58 50 72C38 84 28 82 25 76Z" fill="#226948" />
      <path d="M84 68C78 55 64 54 56 65C66 76 78 75 84 68Z" fill="#4D7C65" />
      <path d="M75 76C68 60 52 58 50 72C62 84 72 82 75 76Z" fill="#226948" />
    </svg>
  );

  if (variant === 'symbol') {
    return <SymbolSvg />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <SymbolSvg />
      <div className="flex flex-col text-left leading-tight">
        <div className={`font-extrabold tracking-tight text-[#226948] uppercase ${currentSize.titleSize}`}>
          SMART CIVIC SYSTEM
        </div>
        {showTagline && (
          <div className={`font-medium text-[#3B6452] ${currentSize.subtitleSize}`}>
            Together for a cleaner, safer city
          </div>
        )}
      </div>
    </div>
  );
};

export default CivicLogo;
