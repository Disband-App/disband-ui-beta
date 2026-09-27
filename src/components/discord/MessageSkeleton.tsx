"use client";

// Placeholder history while a conversation loads: bubble-shaped shimmer on
// both sides, so the layout doesn't jump when the real messages land.
export function MessageSkeleton() {
  const rows: { own: boolean; w: number; h: number }[] = [
    { own: false, w: 46, h: 36 },
    { own: false, w: 64, h: 56 },
    { own: true, w: 38, h: 36 },
    { own: false, w: 28, h: 36 },
    { own: true, w: 58, h: 56 },
    { own: true, w: 30, h: 36 },
    { own: false, w: 52, h: 36 },
    { own: false, w: 70, h: 76 },
    { own: true, w: 44, h: 36 },
  ];

  return (
    <div className="flex flex-col gap-2.5 px-4 py-4" aria-busy="true" aria-label="Loading messages">
      {rows.map((r, i) => (
        <div key={i} className={`flex items-end gap-2.5 ${r.own ? "justify-end" : "justify-start"}`}>
          {!r.own && <div className="skeleton h-8 w-8 shrink-0 rounded-full" />}
          <div className="skeleton rounded-[19px]" style={{ width: `${r.w}%`, height: r.h }} />
        </div>
      ))}
    </div>
  );
}
