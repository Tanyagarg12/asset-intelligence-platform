/**
 * Circumcircle Pvt Limited mark, drawn inline so it stays crisp at any size
 * and needs no asset pipeline — same approach as SunMobilityLogo. The shape
 * literally is a circumcircle: the unique circle passing through all three
 * vertices of a triangle. No official logo file was supplied; swap this for
 * an <Image> reading from `public/` if one is provided later.
 */
export function CircumcircleLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Circumcircle Pvt Limited"
      className="flex-none"
    >
      <circle
        cx="24"
        cy="24"
        r="19.5"
        fill="none"
        stroke="var(--series-1)"
        strokeWidth="3"
      />
      <path
        d="M24 5.5 L6.9 34.8 L41.1 34.8 Z"
        fill="var(--series-1)"
        fillOpacity="0.12"
        stroke="var(--series-1)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {[
        [24, 5.5],
        [6.9, 34.8],
        [41.1, 34.8],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="var(--series-1)" />
      ))}
    </svg>
  );
}
