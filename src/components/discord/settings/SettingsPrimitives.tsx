"use client";

// iOS Settings vocabulary: a small uppercase header, an inset grouped list
// with hairlines between rows, and an optional footnote under the group.

export function SettingsSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-end justify-between gap-4 px-4">
        <h3 className="text-[12px] font-medium uppercase tracking-[0.04em] text-text-muted">{title}</h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="list-group">{children}</div>
      {description && (
        <p className="mt-2 px-4 text-[12.5px] leading-relaxed text-text-muted">{description}</p>
      )}
    </section>
  );
}

export function SettingRow({
  label,
  description,
  htmlFor,
  children,
  stacked = false,
  icon,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children?: React.ReactNode;
  stacked?: boolean;
  /** Optional coloured glyph tile, as in the iOS Settings app. */
  icon?: React.ReactNode;
}) {
  const Label = htmlFor ? "label" : "div";
  return (
    <div className="list-row" style={icon ? { ["--row-inset" as string]: "56px" } : undefined}>
      {icon && <span className="self-start pt-0.5">{icon}</span>}
      <div className={`min-w-0 flex-1 ${stacked ? "block" : "flex items-center justify-between gap-4"}`}>
        <Label
          {...(htmlFor ? { htmlFor } : {})}
          className={`min-w-0 ${htmlFor ? "cursor-pointer" : ""}`}
        >
          <span className="block text-[14.5px] text-text-normal">{label}</span>
          {description && (
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-text-muted">
              {description}
            </span>
          )}
        </Label>
        {children && (
          <div className={stacked ? "mt-2.5" : "shrink-0"}>{children}</div>
        )}
      </div>
    </div>
  );
}

/** UISwitch: green track, white knob that stretches while pressed. */
export function Toggle({
  checked,
  onChange,
  id,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group relative inline-flex h-[28px] w-[46px] shrink-0 rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? "bg-sys-green" : "bg-fill"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-[2px] h-[24px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-[left,width] duration-500 ease-spring group-active:w-[29px] ${
          checked ? "left-[20px] w-[24px] group-active:left-[15px]" : "left-[2px] w-[24px]"
        }`}
      />
    </button>
  );
}

export const settingsInputClass = "field";

export function Hint({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "super" | "online" }) {
  return (
    <span
      className={`pill ${
        tone === "super"
          ? "bg-super/15 text-super"
          : tone === "online"
            ? "bg-status-online/15 text-status-online"
            : "bg-fill-tertiary text-text-muted"
      }`}
    >
      {children}
    </span>
  );
}
