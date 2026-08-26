/**
 * Circumcircle Innovations mark — a triangle with a circle circumscribing its
 * apex, matching the supplied brand logo. Drawn inline so it stays crisp at
 * any size and needs no asset pipeline, same approach as SunMobilityLogo.
 */
export function CircumcircleLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Circumcircle Innovations"
      className="flex-none"
    >
      <circle cx="50" cy="33" r="19" fill="none" stroke="#4A1D19" strokeWidth="7" />
      <path
        d="M50 17 L17 83 L83 83 Z"
        fill="none"
        stroke="#4A1D19"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Stacked wordmark used beside the icon in a "Powered by" lockup. */
export function CircumcircleWordmark() {
  return (
    <span className="leading-[1.15]" style={{ color: "#4A1D19" }}>
      <span className="block text-[12.5px] font-extrabold tracking-wide">CIRCUMCIRCLE</span>
      <span className="block text-[9px] font-medium tracking-[0.18em]">INNOVATIONS</span>
    </span>
  );
}
