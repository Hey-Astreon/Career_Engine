import React from "react";

export interface StrideLogoProps {
  variant?: "light" | "dark";
  iconOnly?: boolean;
  className?: string;
  height?: number;
}

/**
 * Stride Brand Emblem & Horizontal Lockup
 * - Light mode: Royal Blue (#2254EB) + Ink Black (#09131C)
 * - Dark mode:  Royal Blue (#2254EB) + Pure White (#FFFFFF)
 */
export function StrideLogo({
  variant = "light",
  iconOnly = false,
  className = "",
  height = 32,
}: StrideLogoProps) {
  const secondaryColor = variant === "dark" ? "#FFFFFF" : "#09131C";
  const brandBlue = "#2254EB";

  if (iconOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        height={height}
        width={height}
        fill="none"
        className={className}
        aria-label="Stride"
      >
        <polygon points="48.0,0.0 70.0,0.0 32.0,38.0 50.0,56.0 28.0,56.0 10.0,38.0" fill={brandBlue} />
        <polygon points="78.0,0.0 100.0,0.0 62.0,38.0 51.0,27.0" fill={secondaryColor} />
        <polygon points="22.0,100.0 0.0,100.0 38.0,62.0 49.0,73.0" fill={secondaryColor} />
        <polygon points="52.0,100.0 30.0,100.0 68.0,62.0 50.0,44.0 72.0,44.0 90.0,62.0" fill={brandBlue} />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 100"
      height={height}
      width={Math.round(height * 3.6)}
      fill="none"
      className={className}
      aria-label="Stride"
    >
      <polygon points="48.0,0.0 70.0,0.0 32.0,38.0 50.0,56.0 28.0,56.0 10.0,38.0" fill={brandBlue} />
      <polygon points="78.0,0.0 100.0,0.0 62.0,38.0 51.0,27.0" fill={secondaryColor} />
      <polygon points="22.0,100.0 0.0,100.0 38.0,62.0 49.0,73.0" fill={secondaryColor} />
      <polygon points="52.0,100.0 30.0,100.0 68.0,62.0 50.0,44.0 72.0,44.0 90.0,62.0" fill={brandBlue} />
      <text
        x="122"
        y="72"
        fontFamily="Inter, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="64"
        fontWeight="700"
        letterSpacing="-0.03em"
        fill={secondaryColor}
      >
        Stride
      </text>
    </svg>
  );
}

export default StrideLogo;
