export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const diff = Date.now() - then;
  const minute = 60_000, hour = 3_600_000, day = 86_400_000;
  if (diff < minute) return "just now";
  if (diff < hour) { const m = Math.max(1, Math.round(diff / minute)); return `${m} minute${m === 1 ? "" : "s"} ago`; }
  if (diff < day) { const h = Math.round(diff / hour); return `${h} hour${h === 1 ? "" : "s"} ago`; }
  const d = Math.round(diff / day);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
