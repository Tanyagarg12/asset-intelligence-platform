/**
 * Circumcircle Innovations mark — a triangle inside a circle, matching the
 * supplied brand logo. Drawn inline so it stays crisp at any size and needs
 * no asset pipeline, same approach as SunMobilityLogo.
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
      <circle cx="50" cy="50" r="42" fill="none" stroke="#4A1D19" strokeWidth="6" />
      <path
        d="M50 26 L74 66 L26 66 Z"
        fill="none"
        stroke="#4A1D19"
        strokeWidth="6.5"
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

/**
 * The full logo — icon stacked above the wordmark, the "I" in CIRCUMCIRCLE
 * drawn as a tall bar (matching the supplied brand logo), "INNOVATIONS"
 * letter-spaced beneath. Used as one unit rather than icon + text side by
 * side, e.g. in the footer's "Powered by" lockup.
 */
export function CircumcircleFullLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex flex-col items-center leading-none"
      style={{ color: "#4A1D19" }}
      role="img"
      aria-label="Circumcircle Innovations"
    >
      <svg width={size} height={size} viewBox="0 0 100 100" className="flex-none">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#4A1D19" strokeWidth="7" />
        <path
          d="M50 25 L75 67 L25 67 Z"
          fill="none"
          stroke="#4A1D19"
          strokeWidth="7.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1.5 flex items-baseline text-[13.5px] font-extrabold tracking-wide">
        <span>C</span>
        <span className="mx-px inline-block h-[15px] w-[2.5px] translate-y-[2px] bg-current" aria-hidden />
        <span>RCUMCIRCLE</span>
      </div>
      <span className="ml-1 mt-1 text-[8px] font-semibold tracking-[0.4em]">INNOVATIONS</span>
    </div>
  );
}
