import { Logo } from "./Logo";

/**
 * The Disband mark on its app-icon tile: a near-black squircle with a
 * top-lit sheen, the way it sits on a home screen.
 */
export function AppIcon({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`squircle relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#0b0b0c] ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        boxShadow: "inset 0 0.5px 0 rgb(255 255 255 / 0.18), 0 0 0 0.5px rgb(0 0 0 / 0.2), var(--elev-2)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgb(255 255 255 / 0.1) 0%, rgb(255 255 255 / 0) 55%)" }}
      />
      <Logo size={Math.round(size * 0.92)} className="relative" />
    </span>
  );
}
