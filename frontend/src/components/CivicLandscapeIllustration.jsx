import React from 'react';

/**
 * Reusable Landscape Illustration Asset for Smart Civic System
 * Contains: Soft city silhouette, layered hills, rounded trees, curved path, streetlights.
 * Colors: #236A48, #3C8A68, #A8C9B1, #DDEBE0, #E0ECE3, #E8F2EA
 * STRICT RULE: ZERO HUMANS / NO CARTOON PEOPLE.
 */
const CivicLandscapeIllustration = ({ height = 140, className = '' }) => {
  return (
    <div className={`w-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        width="100%"
        height={height}
        viewBox="0 0 1000 160"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Sky Tint */}
        <rect width="1000" height="160" fill="#F4F8F4" opacity="0.6" />

        {/* Layer 1: Distant Soft City Silhouette */}
        <g fill="#E8F2EA" opacity="0.9">
          <rect x="120" y="60" width="30" height="70" rx="2" />
          <rect x="140" y="45" width="25" height="85" rx="2" />
          <rect x="175" y="70" width="35" height="60" rx="2" />
          
          <rect x="420" y="50" width="40" height="80" rx="2" />
          <rect x="470" y="35" width="30" height="95" rx="2" />
          <path d="M485 20L488 35H482L485 20Z" fill="#DDEBE0" />
          <rect x="510" y="65" width="35" height="65" rx="2" />

          <rect x="780" y="55" width="35" height="75" rx="2" />
          <rect x="825" y="40" width="28" height="90" rx="2" />
          <rect x="860" y="68" width="40" height="62" rx="2" />
        </g>

        {/* Layer 2: Midground Rolling Green Hills */}
        <path
          d="M-50 130 Q 150 70 350 110 T 750 90 Q 900 75 1050 110 V 160 H -50 Z"
          fill="#DDEBE0"
          opacity="0.8"
        />
        <path
          d="M-50 140 Q 250 95 550 125 T 1050 115 V 160 H -50 Z"
          fill="#E0ECE3"
        />

        {/* Layer 3: Curved Civic Pathway / Road */}
        <path
          d="M-50 160 C 200 130 350 150 500 135 C 650 120 800 145 1050 125 L 1050 160 Z"
          fill="#E8F2EA"
        />
        <path
          d="M-50 160 C 200 130 350 150 500 135 C 650 120 800 145 1050 125"
          stroke="#A8C9B1"
          strokeWidth="2"
          strokeDasharray="8 6"
          opacity="0.6"
        />

        {/* Layer 4: Minimal Civic Streetlights */}
        <g stroke="#236A48" strokeWidth="2" fill="none">
          {/* Light 1 */}
          <path d="M180 145 V 110 C 180 102 192 102 192 106" />
          <circle cx="192" cy="107" r="2.5" fill="#3C8A68" stroke="none" />
          {/* Light 2 */}
          <path d="M580 138 V 105 C 580 97 592 97 592 101" />
          <circle cx="592" cy="102" r="2.5" fill="#3C8A68" stroke="none" />
          {/* Light 3 */}
          <path d="M890 135 V 100 C 890 92 902 92 902 96" />
          <circle cx="902" cy="97" r="2.5" fill="#3C8A68" stroke="none" />
        </g>

        {/* Layer 5: Layered Rounded Trees & Bushes (Foreground) */}
        {/* Tree Group Left */}
        <g>
          {/* Trunk */}
          <rect x="75" y="115" width="6" height="30" rx="2" fill="#174D38" />
          {/* Layered Canopy */}
          <circle cx="78" cy="105" r="22" fill="#236A48" />
          <circle cx="72" cy="98" r="16" fill="#3C8A68" />
          <circle cx="84" cy="98" r="14" fill="#A8C9B1" opacity="0.8" />
        </g>

        <g>
          <rect x="245" y="125" width="5" height="24" rx="1.5" fill="#174D38" />
          <circle cx="247.5" cy="115" r="17" fill="#3C8A68" />
          <circle cx="244" cy="110" r="12" fill="#A8C9B1" opacity="0.9" />
        </g>

        {/* Small Bush Clusters */}
        <path d="M300 148 C 300 138 315 138 322 145 C 328 139 342 139 345 148 Z" fill="#3C8A68" />
        <path d="M640 142 C 640 134 652 134 658 140 C 663 135 675 135 678 142 Z" fill="#236A48" />

        {/* Tree Group Center Right */}
        <g>
          <rect x="690" y="118" width="6" height="28" rx="2" fill="#174D38" />
          <circle cx="693" cy="108" r="20" fill="#236A48" />
          <circle cx="688" cy="102" r="14" fill="#3C8A68" />
        </g>

        <g>
          <rect x="940" y="112" width="7" height="34" rx="2" fill="#174D38" />
          <circle cx="943.5" cy="100" r="24" fill="#236A48" />
          <circle cx="937" cy="92" r="18" fill="#3C8A68" />
          <circle cx="950" cy="92" r="15" fill="#A8C9B1" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
};

export default CivicLandscapeIllustration;
