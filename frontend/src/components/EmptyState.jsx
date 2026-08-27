import React from 'react';

/**
 * Reusable EmptyState Component
 * Features small civic botanical vector decoration, title, subtitle, and optional CTA button.
 * STRICT RULE: ZERO HUMANS / NO CARTOONS.
 */
const EmptyState = ({ title = 'No Reports Yet', description = 'Your civic reports will appear here once submitted.', actionText = 'Report an Issue →', onAction }) => {
  return (
    <div className="p-8 md:p-10 text-center bg-white rounded-[16px] border border-[#DDEBE2] shadow-xs space-y-4 max-w-md mx-auto my-6 select-none">
      {/* Small Botanical Vector Accents */}
      <div className="w-16 h-16 mx-auto rounded-full bg-[#EAF7EF] border border-[#D5EBDD] flex items-center justify-center text-[#237A52]">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 4C22 4 27 9 27 16C27 23 22 28 16 28C10 28 5 23 5 16C5 9 10 4 16 4Z" stroke="#237A52" strokeWidth="2" strokeDasharray="4 2" fill="#F1FAF4" />
          <path d="M10 22C14 16 20 15 23 20" stroke="#3D9168" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 24C17 18 22 17 25 22" stroke="#237A52" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-[#163A2C]">{title}</h3>
        <p className="text-xs text-[#648274] font-normal leading-relaxed">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-[#237A52] hover:bg-[#185C3E] text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
