import Link from "next/link";
import type { ReactNode } from "react";

export const TEAM_COLORS = ["var(--coral)", "var(--sky)"] as const;
const AVATAR_COLORS = ["#FF7A6B", "#7AC8FF", "#D9F04F", "#F4EFE8", "#C9A4FF", "#FFB86B"];

export function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function Avatar({ name, index, size = 36 }: { name: string; index: number; size?: number }) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ background: avatarColor(index), width: size, height: size, borderRadius: size / 2 }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

export function TeamLabel({ team, name, align = "start" }: { team: 0 | 1; name: string; align?: "start" | "end" }) {
  const dot = <span className="dot" style={{ background: TEAM_COLORS[team] }} />;
  return (
    <span className="row small" style={{ gap: 6, fontWeight: 700, color: TEAM_COLORS[team] }}>
      {align === "start" && dot}
      {name}
      {align === "end" && dot}
    </span>
  );
}

export function TopBar({ back, label, right }: { back?: string | (() => void); label: string; right?: ReactNode }) {
  const arrow = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
  return (
    <div className="row between">
      {typeof back === "string" ? (
        <Link href={back} className="icon-btn" aria-label="Back">
          {arrow}
        </Link>
      ) : back ? (
        <button type="button" className="icon-btn" aria-label="Back" onClick={back}>
          {arrow}
        </button>
      ) : null}
      <span className="eyebrow" style={{ flex: back ? undefined : 1 }}>
        {label}
      </span>
      {right ?? (back ? <span style={{ width: 44 }} /> : null)}
    </div>
  );
}

const PATHS = {
  check: <path d="M5 12l5 5 9-10" />,
  play: <path d="M8 5v14l11-7Z" fill="currentColor" stroke="none" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
    </>
  ),
  shuffle: <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  chat: <path d="M4 5h16v11H10l-6 4Z" />,
  eye: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M7 9l5-5 5 5" />
      <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    </>
  ),
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
} as const;

export function Icon({ name, size = 18, color = "currentColor", stroke = 2 }: { name: keyof typeof PATHS; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
