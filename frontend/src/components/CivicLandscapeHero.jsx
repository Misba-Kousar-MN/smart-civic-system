import React from 'react';

/**
 * CivicLandscapeHero - Inline Vector SVG Component for Landing Page Hero
 * Strictly guarantees 100% rendering without image loader / asset path failures.
 * Colors:
 * Trunk: #236A48
 * Dark Foliage: #3C8A68
 * Medium Foliage: #70A989
 * Light Foliage: #A8C9B1
 * Background Foliage: #DDEBE0
 * Sky / Hills: #F4F8F4, #E8F2EA, #DDEBE0
 * NO PEOPLE / ZERO CARTOONS
 */
const CivicLandscapeHero = ({ className = '' }) => {
  return (
    <div className={`w-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        width="100%"
        height="340"
        viewBox="0 0 1200 340"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        {/* Extremely Light Mint Sky */}
        <rect width="1200" height="340" fill="#F4F8F4" />

        {/* Subtle Organic Curved Shapes in Background */}
        <circle cx="200" cy="80" r="180" fill="#E8F2EA" opacity="0.7" />
        <circle cx="1000" cy="60" r="220" fill="#E8F2EA" opacity="0.6" />

        {/* LAYER 1: Distant Soft City Skyline (8-12 Buildings with windows) */}
        <g fill="#DDEBE0">
          {/* Building 1 */}
          <rect x="80" y="120" width="46" height="150" rx="4" />
          <rect x="92" y="135" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.8" />
          <rect x="108" y="135" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.8" />
          <rect x="92" y="155" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.8" />
          <rect x="108" y="155" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.8" />

          {/* Building 2 */}
          <rect x="135" y="85" width="40" height="185" rx="4" fill="#D2E4D6" />
          <rect x="147" y="100" width="16" height="6" rx="1" fill="#FFFFFF" opacity="0.9" />
          <rect x="147" y="115" width="16" height="6" rx="1" fill="#FFFFFF" opacity="0.9" />

          {/* Building 3 */}
          <rect x="185" y="140" width="54" height="130" rx="4" />

          {/* Center Civic Tower (Building 4 & 5) */}
          <rect x="370" y="100" width="55" height="170" rx="4" fill="#D2E4D6" />
          <rect x="435" y="60" width="48" height="210" rx="4" fill="#C5DDCB" />
          <path d="M459 35L464 60H454L459 35Z" fill="#A8C9B1" />
          <rect x="493" y="125" width="52" height="145" rx="4" />

          {/* Right Skyline (Buildings 6-10) */}
          <rect x="760" y="110" width="50" height="160" rx="4" fill="#D2E4D6" />
          <rect x="820" y="80" width="45" height="190" rx="4" fill="#C5DDCB" />
          <rect x="875" y="130" width="58" height="140" rx="4" />
          <rect x="940" y="100" width="42" height="170" rx="4" fill="#D2E4D6" />
        </g>

        {/* LAYER 2: Soft Rolling Hills */}
        <path
          d="M-50 230 Q 250 140 550 190 T 1150 160 Q 1200 155 1250 170 V 340 H -50 Z"
          fill="#DDEBE0"
        />
        <path
          d="M-50 255 Q 350 175 750 225 T 1250 205 V 340 H -50 Z"
          fill="#E8F2EA"
        />

        {/* LAYER 3: Curved Pedestrian Pathway */}
        <path
          d="M-50 340 C 300 270 580 305 780 270 C 980 235 1120 280 1250 260 L 1250 340 Z"
          fill="#FFFFFF"
        />
        <path
          d="M-50 340 C 300 270 580 305 780 270 C 980 235 1120 280 1250 260"
          stroke="#A8C9B1"
          strokeWidth="3.5"
          strokeDasharray="14 10"
          opacity="0.85"
        />

        {/* LAYER 4: Minimal Civic Streetlights */}
        <g stroke="#3C8A68" strokeWidth="2.5" fill="none">
          {/* Streetlight 1 */}
          <path d="M230 300 V 235 C 230 223 248 223 248 229" />
          <circle cx="248" cy="230" r="3.5" fill="#236A48" stroke="none" />
          
          {/* Streetlight 2 */}
          <path d="M640 285 V 220 C 640 208 658 208 658 214" />
          <circle cx="658" cy="215" r="3.5" fill="#236A48" stroke="none" />

          {/* Streetlight 3 */}
          <path d="M990 275 V 210 C 990 198 1008 198 1008 204" />
          <circle cx="1008" cy="205" r="3.5" fill="#236A48" stroke="none" />
        </g>

        {/* LAYER 5: PROMINENT FOREGROUND TREES (High Contrast & Clear Visibility) */}

        {/* LEFT LANDSCAPE COMPOSITION */}
        <g id="left-landscape-group">
          {/* Background Small Tree Left */}
          <rect x="35" y="220" width="8" height="65" rx="3" fill="#236A48" />
          <circle cx="39" cy="205" r="28" fill="#70A989" />
          <circle cx="32" cy="195" r="20" fill="#A8C9B1" />

          {/* MAIN PROMINENT FOREGROUND TREE LEFT (230px Tall) */}
          <rect x="95" y="150" width="14" height="135" rx="4" fill="#236A48" />
          {/* Layered Canopies */}
          <circle cx="102" cy="130" r="54" fill="#3C8A68" />
          <circle cx="82" cy="112" r="40" fill="#70A989" />
          <circle cx="122" cy="112" r="38" fill="#236A48" />
          <circle cx="102" cy="88" r="32" fill="#A8C9B1" />
          <circle cx="102" cy="70" r="22" fill="#DDEBE0" />

          {/* Secondary Medium Tree Left */}
          <rect x="175" y="210" width="10" height="75" rx="3" fill="#236A48" />
          <circle cx="180" cy="192" r="32" fill="#70A989" />
          <circle cx="186" cy="180" r="24" fill="#3C8A68" />
          <circle cx="174" cy="180" r="20" fill="#A8C9B1" />
        </g>

        {/* RIGHT LANDSCAPE COMPOSITION (Asymmetrical) */}
        <g id="right-landscape-group">
          {/* Background Medium Tree Right */}
          <rect x="990" y="195" width="10" height="85" rx="3" fill="#236A48" />
          <circle cx="995" cy="175" r="34" fill="#70A989" />
          <circle cx="986" cy="162" r="26" fill="#A8C9B1" />

          {/* MAIN PROMINENT FOREGROUND TREE RIGHT (230px Tall) */}
          <rect x="1070" y="145" width="15" height="140" rx="4" fill="#236A48" />
          {/* Layered Canopies */}
          <circle cx="1077.5" cy="122" r="58" fill="#236A48" />
          <circle cx="1055" cy="102" r="42" fill="#3C8A68" />
          <circle cx="1100" cy="102" r="40" fill="#70A989" />
          <circle cx="1077.5" cy="78" r="34" fill="#A8C9B1" />
          <circle cx="1077.5" cy="58" r="24" fill="#DDEBE0" />

          {/* Secondary Small Tree Right */}
          <rect x="1145" y="225" width="8" height="60" rx="3" fill="#236A48" />
          <circle cx="1149" cy="208" r="28" fill="#3C8A68" />
          <circle cx="1154" cy="198" r="20" fill="#A8C9B1" />
        </g>

        {/* Bush Clusters */}
        <path d="M10 300 C 10 280 35 280 48 292 C 58 282 80 282 85 300 Z" fill="#3C8A68" />
        <path d="M460 295 C 460 282 482 282 490 290 C 498 284 515 284 520 295 Z" fill="#70A989" opacity="0.9" />
        <path d="M790 290 C 790 275 812 275 820 285 C 828 277 848 277 854 290 Z" fill="#3C8A68" opacity="0.9" />
        <path d="M1175 300 C 1175 282 1195 282 1200 295 Z" fill="#3C8A68" />

        {/* Botanical Corner framing leaves */}
        <g transform="translate(0, 250)">
          <path d="M0 90 Q 50 45 85 75 Q 45 105 0 90Z" fill="#3C8A68" />
          <path d="M0 90 Q 70 15 105 55 Q 55 95 0 90Z" fill="#70A989" />
        </g>
        <g transform="translate(1110, 250)">
          <path d="M90 90 Q 45 45 10 75 Q 45 105 90 90Z" fill="#3C8A68" />
          <path d="M90 90 Q 20 15 -15 55 Q 35 95 90 90Z" fill="#A8C9B1" />
        </g>
      </svg>
    </div>
  );
};

export default CivicLandscapeHero;
