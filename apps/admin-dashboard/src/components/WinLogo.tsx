import React from "react";

interface WinIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Pixel-accurate SVG representation of the WIN Freelancer icon:
 * Vibrant royal blue rounded rectangle with stylized geometric 3-prong white 'W'.
 */
export const WinIcon: React.FC<WinIconProps> = ({ className = "h-9 w-9", size }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Blue rounded square base */}
      <rect width="100" height="100" rx="20" fill="#0052FF" />

      {/* Stylized White "W" glyph: 3 vertical prongs connected along a rounded bottom base */}
      {/* Left prong */}
      <rect x="18" y="16" width="13" height="54" rx="2" fill="white" />
      {/* Center prong */}
      <rect x="43.5" y="16" width="13" height="54" rx="2" fill="white" />
      {/* Right prong */}
      <rect x="69" y="16" width="13" height="54" rx="2" fill="white" />
      {/* Bottom base connecting the 3 prongs with rounded bottom corners */}
      <path
        d="M18 64 H82 C82 76 74 84 62 84 H38 C26 84 18 76 18 64 Z"
        fill="white"
      />
    </svg>
  );
};

interface WinLogoProps {
  className?: string;
  iconClassName?: string;
  theme?: "dark" | "light";
  collapsed?: boolean;
}

export const WinLogo: React.FC<WinLogoProps> = ({
  className = "",
  iconClassName = "h-9 w-9",
  theme = "dark",
  collapsed = false,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <WinIcon className={`${iconClassName} shrink-0 drop-shadow-sm`} />
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="font-heading text-xl font-black tracking-tight text-[#0052FF]">
            WIN
          </span>
          <span
            className={`font-sans text-xs font-normal tracking-wide mt-0.5 ${
              theme === "dark" ? "text-white/90" : "text-slate-900"
            }`}
          >
            Freelancer
          </span>
        </div>
      )}
    </div>
  );
};

export default WinLogo;
