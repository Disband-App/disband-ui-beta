/** UIActivityIndicatorView: eight tapered spokes that step round. */
export function ActivityIndicator({
  size = 20,
  className = "",
  label,
}: {
  size?: number;
  className?: string;
  /** Accessible name; omit when the surrounding text already says it. */
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`activity-spinner ${/(?:^|\s)text-/.test(className) ? "" : "text-text-muted"} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="10.9"
          y="1.5"
          width="2.2"
          height="6.2"
          rx="1.1"
          fill="currentColor"
          opacity={0.18 + (i / 7) * 0.82}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  );
}
