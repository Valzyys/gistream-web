import React, { useEffect, useState, useCallback, useRef } from "react";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║         ⚙  KONFIGURASI — Edit bagian ini untuk menambah monitor            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

interface CategoryConfig {
  id: string;
  name: string;
  description?: string;
  monitors: { id: string; name: string }[];
}

const MONITOR_CATEGORIES: CategoryConfig[] = [
  {
    id: "website",
    name: "Website & Frontend",
    description: "Ketersediaan halaman web utama",
    monitors: [
      { id: "3523155", name: "Main Website" },
    ],
  },
  {
    id: "api",
    name: "API Services",
    description: "Endpoint API dan layanan backend",
    monitors: [
      // { id: "2345678", name: "REST API v1" },
    ],
  },
  {
    id: "infra",
    name: "Infrastructure",
    description: "Database, CDN, dan infrastruktur pendukung",
    monitors: [
      // { id: "4567890", name: "PostgreSQL" },
    ],
  },
];

const API_BASE = "/api/betterstack";

const ALL_MONITORS = MONITOR_CATEGORIES.flatMap((c) => c.monitors);

// ── Types ─────────────────────────────────────────────────────────────────────

type MonitorStatus =
  | "up"
  | "down"
  | "paused"
  | "pending"
  | "maintenance"
  | "validating";
type DayStatus = "up" | "down" | "partial" | "nodata";

interface MonitorInfo {
  id: string;
  attributes: {
    url: string;
    pronounceable_name: string;
    status: MonitorStatus;
    last_checked_at: string | null;
    check_frequency: number;
    created_at: string;
  };
}

interface SLAData {
  attributes: {
    availability: number;
    total_downtime: number;
    longest_incident: number;
    average_incident: number;
    // BetterStack uses "number_of_incidents" not "incidents_count"
    number_of_incidents: number;
  };
}

interface ResponseTimeRegion {
  region: string;
  response_times: { at: string; response_time: number }[];
}

interface Incident {
  id: string;
  attributes: {
    cause: string;
    started_at: string;
    resolved_at: string | null;
  };
}

interface MonitorData {
  config: { id: string; name: string };
  info: MonitorInfo | null;
  sla30: SLAData | null;
  responseTimes: ResponseTimeRegion[];
  incidents90: Incident[];
  loading: boolean;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysAgoDate(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// BetterStack response_time is in SECONDS — multiply by 1000 for ms
function fmtMs(ms: number) {
  if (ms <= 0) return "—";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function fmtSeconds(s: number) {
  if (s <= 0) return "0s";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function fmtAvailability(n: number) {
  if (n >= 100) return "100%";
  if (n >= 99.9) return `${n.toFixed(3)}%`;
  if (n >= 99) return `${n.toFixed(2)}%`;
  return `${n.toFixed(1)}%`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

// response_time dari BetterStack dalam detik → kali 1000 → ms
function getAvgResponseTimeMs(regions: ResponseTimeRegion[]): number | null {
  const all: number[] = [];
  regions.forEach((r) =>
    r.response_times.forEach((e) => all.push(e.response_time * 1000))
  );
  if (!all.length) return null;
  return all.reduce((a, b) => a + b, 0) / all.length;
}

function computeDayStatus(incidents: Incident[], dayStart: Date): DayStatus {
  const dayEnd = new Date(dayStart.getTime() + 86399999);
  let downtimeMs = 0;
  for (const inc of incidents) {
    const a = new Date(inc.attributes.started_at).getTime();
    const b = inc.attributes.resolved_at
      ? new Date(inc.attributes.resolved_at).getTime()
      : Date.now();
    const overlapStart = Math.max(a, dayStart.getTime());
    const overlapEnd = Math.min(b, dayEnd.getTime());
    if (overlapEnd > overlapStart) downtimeMs += overlapEnd - overlapStart;
  }
  const mins = downtimeMs / 60000;
  if (mins === 0) return "up";
  if (mins < 10) return "partial";
  return "down";
}

async function fetchMonitor(
  config: { id: string; name: string }
): Promise<MonitorData> {
  const from30 = toISODate(daysAgoDate(30));
  const to30 = toISODate(new Date());
  const from90 = toISODate(daysAgoDate(90));

  const [infoR, slaR, rtR, incR] = await Promise.allSettled([
    fetch(`${API_BASE}/monitors/${config.id}`),
    fetch(`${API_BASE}/monitors/${config.id}/sla?from=${from30}&to=${to30}`),
    fetch(`${API_BASE}/monitors/${config.id}/response-times`),
    fetch(
      `${API_BASE}/monitors/${config.id}/incidents?from=${from90}&per_page=100`
    ),
  ]);

  const tryJson = async (
    r: PromiseSettledResult<Response>
  ): Promise<any> => {
    if (r.status === "fulfilled" && r.value.ok) {
      try {
        return await r.value.json();
      } catch {}
    }
    return null;
  };

  const [infoD, slaD, rtD, incD] = await Promise.all([
    tryJson(infoR),
    tryJson(slaR),
    tryJson(rtR),
    tryJson(incR),
  ]);

  // response-times: data.attributes.regions (array of { region, response_times[] })
  const rawRegions: ResponseTimeRegion[] =
    rtD?.data?.attributes?.regions ?? [];

  return {
    config,
    info: infoD?.data ?? null,
    sla30: slaD?.data ?? null,
    responseTimes: rawRegions,
    incidents90: incD?.data ?? [],
    loading: false,
    error: !infoD
      ? "Gagal memuat data monitor. Pastikan proxy sudah dikonfigurasi."
      : null,
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const Ic = {
  Check: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Clock: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Refresh: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Activity: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  AlertCircle: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Shield: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Pause: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  ChevronDown: ({ s = 14, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ExternalLink: ({ s = 12, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  MonitorStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    dotColor: string;
    pulse: boolean;
    icon: React.ReactNode;
  }
> = {
  up: {
    label: "Operational",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.08)",
    border: "rgba(22,163,74,0.25)",
    dotColor: "#22c55e",
    pulse: true,
    icon: <Ic.Check s={10} c="#16a34a" />,
  },
  down: {
    label: "Outage",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    dotColor: "#ef4444",
    pulse: true,
    icon: <Ic.X s={10} c="#ef4444" />,
  },
  validating: {
    label: "Recovering",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    dotColor: "#f59e0b",
    pulse: false,
    icon: <Ic.Clock s={10} c="#f59e0b" />,
  },
  paused: {
    label: "Paused",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.08)",
    border: "rgba(107,114,128,0.25)",
    dotColor: "#9ca3af",
    pulse: false,
    icon: <Ic.Pause s={10} c="#6b7280" />,
  },
  pending: {
    label: "Pending",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.25)",
    dotColor: "#a78bfa",
    pulse: false,
    icon: <Ic.Clock s={10} c="#8b5cf6" />,
  },
  maintenance: {
    label: "Maintenance",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.25)",
    dotColor: "#38bdf8",
    pulse: false,
    icon: <Ic.Shield s={10} c="#0ea5e9" />,
  },
};

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MonitorStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: cfg.dotColor,
          animation: cfg.pulse ? "statusPulse 2s cubic-bezier(0.4,0,0.6,1) infinite" : "none",
        }}
      />
      {cfg.label}
    </span>
  );
}

// ── UptimeBars ────────────────────────────────────────────────────────────────

function UptimeBars({
  incidents,
  createdAt,
}: {
  incidents: Incident[];
  createdAt: string | null;
}) {
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (89 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const createdDate = createdAt ? new Date(createdAt) : null;

  const dayStatuses: DayStatus[] = days.map((day) => {
    if (createdDate && day < createdDate) return "nodata";
    return computeDayStatus(incidents, day);
  });

  const validDays = dayStatuses.filter((s) => s !== "nodata");
  const upDays = validDays.filter((s) => s === "up").length;
  const availPct =
    validDays.length > 0 ? (upDays / validDays.length) * 100 : 100;

  const barColors: Record<DayStatus, string> = {
    up: "#4ade80",
    down: "#f87171",
    partial: "#fbbf24",
    nodata: "rgba(156,163,175,0.2)",
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          90 hari terakhir
        </span>
        <span
          className="text-[11px] font-bold"
          style={{
            color:
              availPct >= 99.9
                ? "#16a34a"
                : availPct >= 99
                ? "#f59e0b"
                : "#ef4444",
          }}
        >
          {fmtAvailability(availPct)} uptime
        </span>
      </div>

      <div className="flex gap-px h-8">
        {days.map((day, i) => {
          const status = dayStatuses[i];
          const label = day.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          });
          const statusLabel =
            status === "up"
              ? "Operational"
              : status === "down"
              ? "Outage"
              : status === "partial"
              ? "Partial outage"
              : "No data";
          return (
            <div
              key={i}
              className="flex-1 rounded-[1.5px] transition-opacity hover:opacity-70 cursor-default"
              style={{ background: barColors[status] }}
              title={`${label}: ${statusLabel}`}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-gray-400">
        <span>90 hari lalu</span>
        <span>Hari ini</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-400">
        {(
          [
            { color: "#4ade80", label: "Operational" },
            { color: "#fbbf24", label: "Partial" },
            { color: "#f87171", label: "Outage" },
            { color: "rgba(156,163,175,0.25)", label: "No data", border: "1px solid rgba(156,163,175,0.4)" },
          ] as { color: string; label: string; border?: string }[]
        ).map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-[1.5px]"
              style={{ background: item.color, border: item.border }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── ResponseSparkline ─────────────────────────────────────────────────────────

function ResponseSparkline({
  regions,
}: {
  regions: ResponseTimeRegion[];
}) {
  // Flatten all response times, convert seconds → ms
  const all: { at: number; val: number }[] = [];
  regions.forEach((r) =>
    r.response_times.forEach((e) =>
      all.push({ at: new Date(e.at).getTime(), val: e.response_time * 1000 })
    )
  );
  all.sort((a, b) => a.at - b.at);
  const recent = all.slice(-60);
  if (recent.length < 2) return null;

  const vals = recent.map((e) => e.val);
  const maxVal = Math.max(...vals);
  const minVal = Math.min(...vals);
  const range = maxVal - minVal || 1;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const H = 36;

  const points = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * 100;
      const y = H - ((v - minVal) / range) * H * 0.85 - H * 0.075;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 100 ${H}`}
          preserveAspectRatio="none"
          className="opacity-70"
        >
          <defs>
            <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#465FFF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#465FFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,${H} ${points} 100,${H}`}
            fill="url(#rtGrad)"
            stroke="none"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={points}
            fill="none"
            stroke="#465FFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>24h lalu</span>
          <span>Sekarang</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black text-gray-800 dark:text-white">
          {fmtMs(avg)}
        </p>
        <p className="text-[10px] text-gray-400">rata-rata</p>
        <p className="text-[10px] text-gray-400">
          max {fmtMs(maxVal)}
        </p>
      </div>
    </div>
  );
}

// ── MonitorCard ───────────────────────────────────────────────────────────────

function MonitorCard({ data }: { data: MonitorData }) {
  const [expanded, setExpanded] = useState(false);

  if (data.loading) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 animate-pulse">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-40 rounded bg-gray-100 dark:bg-white/5" />
          <div className="h-2.5 w-56 rounded bg-gray-100 dark:bg-white/5" />
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="h-8 w-14 rounded bg-gray-100 dark:bg-white/5" />
          <div className="h-8 w-14 rounded bg-gray-100 dark:bg-white/5" />
        </div>
        <div className="h-6 w-24 rounded-full bg-gray-100 dark:bg-white/5" />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{data.config.name}</p>
          <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1">
            <Ic.AlertCircle s={10} c="#f87171" />{data.error}
          </p>
        </div>
      </div>
    );
  }

  const status = data.info?.attributes.status ?? "pending";
  const cfg = STATUS_CONFIG[status];
  const sla = data.sla30?.attributes;
  const avgRt = getAvgResponseTimeMs(data.responseTimes);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            background: cfg.dotColor,
            animation: cfg.pulse
              ? "statusPulse 2s cubic-bezier(0.4,0,0.6,1) infinite"
              : "none",
          }}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
            {data.config.name}
          </p>
          {data.info?.attributes.url && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
              {data.info.attributes.url}
              <a
                href={data.info.attributes.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-brand-500 transition-colors flex-shrink-0"
              >
                <Ic.ExternalLink s={10} c="currentColor" />
              </a>
            </p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-5">
          {sla && (
            <div className="text-right">
              <p
                className="text-xs font-black"
                style={{
                  color:
                    sla.availability >= 99.9
                      ? "#16a34a"
                      : sla.availability >= 99
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              >
                {fmtAvailability(sla.availability)}
              </p>
              <p className="text-[10px] text-gray-400">30d uptime</p>
            </div>
          )}
          {avgRt !== null && (
            <div className="text-right">
              <p className="text-xs font-black text-gray-700 dark:text-gray-200">
                {fmtMs(avgRt)}
              </p>
              <p className="text-[10px] text-gray-400">response</p>
            </div>
          )}
        </div>

        <StatusBadge status={status} />

        <span
          className="text-gray-300 dark:text-gray-600 flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <Ic.ChevronDown s={14} />
        </span>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-5 pb-5 pt-1 space-y-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-gray-800/60">
          {/* Mobile stats */}
          {(sla || avgRt !== null) && (
            <div className="flex sm:hidden items-center gap-5 pt-2">
              {sla && (
                <div>
                  <p
                    className="text-sm font-black"
                    style={{
                      color:
                        sla.availability >= 99.9
                          ? "#16a34a"
                          : sla.availability >= 99
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {fmtAvailability(sla.availability)}
                  </p>
                  <p className="text-[10px] text-gray-400">30d uptime</p>
                </div>
              )}
              {avgRt !== null && (
                <div>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-200">
                    {fmtMs(avgRt)}
                  </p>
                  <p className="text-[10px] text-gray-400">avg response</p>
                </div>
              )}
            </div>
          )}

          {/* SLA stats grid — gunakan number_of_incidents */}
          {sla && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  label: "Availability",
                  value: fmtAvailability(sla.availability),
                  color:
                    sla.availability >= 99.9
                      ? "#16a34a"
                      : sla.availability >= 99
                      ? "#f59e0b"
                      : "#ef4444",
                },
                {
                  label: "Incidents (30d)",
                  value: String(sla.number_of_incidents),
                  color: sla.number_of_incidents === 0 ? "#16a34a" : "#f59e0b",
                },
                {
                  label: "Total downtime",
                  value: fmtSeconds(sla.total_downtime),
                  color: undefined,
                },
                {
                  label: "Rata-rata incident",
                  value: fmtSeconds(sla.average_incident),
                  color: undefined,
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800"
                >
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {label}
                  </p>
                  <p
                    className="text-sm font-black mt-1 text-gray-800 dark:text-white"
                    style={color ? { color } : undefined}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 90-day uptime bars */}
          <div className="p-4 rounded-xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800">
            <UptimeBars
              incidents={data.incidents90}
              createdAt={data.info?.attributes.created_at ?? null}
            />
          </div>

          {/* Response time sparkline */}
          {data.responseTimes.length > 0 && (
            <div className="p-4 rounded-xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Response time — 24 jam terakhir
              </p>
              <ResponseSparkline regions={data.responseTimes} />
            </div>
          )}

          {/* Recent incidents */}
          {data.incidents90.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Incident terbaru (90 hari)
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.incidents90.slice(0, 5).map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background: inc.attributes.resolved_at
                          ? "#16a34a"
                          : "#ef4444",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                        {inc.attributes.cause || "Downtime terdeteksi"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {fmtDateTime(inc.attributes.started_at)}
                        {inc.attributes.resolved_at && (
                          <> → {fmtDateTime(inc.attributes.resolved_at)}</>
                        )}
                        {!inc.attributes.resolved_at && (
                          <span className="text-red-400 font-semibold"> (Ongoing)</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer meta */}
          {data.info?.attributes.last_checked_at && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Ic.Clock s={11} c="#9ca3af" />
              Terakhir dicek:{" "}
              {fmtDateTime(data.info.attributes.last_checked_at)}
              {data.info.attributes.check_frequency > 0 && (
                <> · Interval: setiap {data.info.attributes.check_frequency / 60} menit</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── OverallBanner ─────────────────────────────────────────────────────────────

function OverallBanner({
  monitorDataList,
  loading,
}: {
  monitorDataList: MonitorData[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03] animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/10 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-52 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-3 w-36 rounded bg-gray-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  const loaded = monitorDataList.filter((d) => d.info && !d.loading);
  const downCount = loaded.filter(
    (d) => d.info?.attributes.status === "down"
  ).length;
  const issueCount = loaded.filter((d) =>
    ["down", "validating"].includes(d.info?.attributes.status ?? "")
  ).length;
  const allUp = issueCount === 0 && loaded.length > 0;

  if (allUp) {
    return (
      <div
        className="flex items-center gap-4 p-5 rounded-2xl border"
        style={{ background: "rgba(22,163,74,0.06)", borderColor: "rgba(22,163,74,0.2)" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
        >
          <Ic.Check s={24} c="white" />
        </div>
        <div>
          <p className="text-base font-bold text-green-700 dark:text-green-400">
            All systems operational
          </p>
          <p className="text-xs text-green-600/60 dark:text-green-400/60 mt-0.5">
            Semua {loaded.length} monitor berjalan normal
          </p>
        </div>
      </div>
    );
  }

  if (downCount > 0) {
    return (
      <div
        className="flex items-center gap-4 p-5 rounded-2xl border"
        style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}
        >
          <Ic.X s={22} c="white" />
        </div>
        <div>
          <p className="text-base font-bold text-red-600 dark:text-red-400">
            {downCount} sistem mengalami gangguan
          </p>
          <p className="text-xs text-red-500/60 dark:text-red-400/60 mt-0.5">
            Tim kami sedang menyelidiki masalah ini
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-4 p-5 rounded-2xl border"
      style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
      >
        <Ic.AlertCircle s={22} c="white" />
      </div>
      <div>
        <p className="text-base font-bold text-amber-600 dark:text-amber-400">
          Beberapa sistem sedang dipantau
        </p>
        <p className="text-xs text-amber-500/60 dark:text-amber-400/60 mt-0.5">
          Ada beberapa gangguan minor yang sedang dipantau
        </p>
      </div>
    </div>
  );
}

// ── StatusPage ────────────────────────────────────────────────────────────────

const StatusPage: React.FC = () => {
  const [monitorData, setMonitorData] = useState<Record<string, MonitorData>>({});
  const [globalLoading, setGlobalLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setGlobalLoading(true);

    const results = await Promise.all(
      ALL_MONITORS.map((m) =>
        fetchMonitor(m).catch(
          (): MonitorData => ({
            config: m,
            info: null,
            sla30: null,
            responseTimes: [],
            incidents90: [],
            loading: false,
            error: "Gagal memuat",
          })
        )
      )
    );

    const dataMap: Record<string, MonitorData> = {};
    results.forEach((r) => {
      dataMap[r.config.id] = r;
    });

    setMonitorData(dataMap);
    setLastUpdated(new Date());
    setGlobalLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAll();
    intervalRef.current = setInterval(() => loadAll(true), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadAll]);

  const allMonitorDataList = ALL_MONITORS.map(
    (m) =>
      monitorData[m.id] ?? {
        config: m,
        info: null,
        sla30: null,
        responseTimes: [],
        incidents90: [],
        loading: true,
        error: null,
      }
  );

  const activeCategories = MONITOR_CATEGORIES.filter(
    (c) => c.monitors.length > 0
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
          <div
            className="px-6 py-8"
            style={{
              background:
                "linear-gradient(135deg, rgba(70,95,255,0.06), rgba(124,58,237,0.09))",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #465FFF, #7c3aed)" }}
                >
                  <Ic.Activity s={26} c="white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                    System Status
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Monitor ketersediaan layanan secara real-time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                {lastUpdated && (
                  <span className="text-xs text-gray-400">
                    Update:{" "}
                    {lastUpdated.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                )}
                <button
                  onClick={() => loadAll(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  <span
                    style={{
                      animation: refreshing ? "spin 1s linear infinite" : "none",
                      display: "inline-flex",
                    }}
                  >
                    <Ic.Refresh s={12} />
                  </span>
                  {refreshing ? "Memperbarui..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800">
            <OverallBanner
              monitorDataList={allMonitorDataList}
              loading={globalLoading}
            />
          </div>
        </div>

        {/* Categories */}
        {activeCategories.map((cat) => (
          <div
            key={cat.id}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const catMonitors = cat.monitors.map(
                    (m) =>
                      monitorData[m.id] ?? {
                        config: m,
                        info: null,
                        sla30: null,
                        responseTimes: [],
                        incidents90: [],
                        loading: true,
                        error: null,
                      }
                  );
                  const allUp = catMonitors.every(
                    (d) => d.info?.attributes.status === "up"
                  );
                  const anyDown = catMonitors.some(
                    (d) => d.info?.attributes.status === "down"
                  );
                  const loading = catMonitors.some((d) => d.loading);
                  if (loading) {
                    return (
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                        {cat.monitors.length} monitor
                      </span>
                    );
                  }
                  return (
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                      style={
                        allUp
                          ? { color: "#16a34a", background: "rgba(22,163,74,0.08)", borderColor: "rgba(22,163,74,0.2)" }
                          : anyDown
                          ? { color: "#ef4444", background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }
                          : { color: "#f59e0b", background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" }
                      }
                    >
                      {allUp
                        ? `${cat.monitors.length} operational`
                        : anyDown
                        ? "Issues detected"
                        : "Monitoring"}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div>
              {cat.monitors.map((m) => (
                <MonitorCard
                  key={m.id}
                  data={
                    monitorData[m.id] ?? {
                      config: m,
                      info: null,
                      sla30: null,
                      responseTimes: [],
                      incidents90: [],
                      loading: true,
                      error: null,
                    }
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {activeCategories.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Ic.Activity s={24} c="#9ca3af" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Belum ada monitor dikonfigurasi
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Tambah monitor ID di bagian{" "}
              <code className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">
                MONITOR_CATEGORIES
              </code>{" "}
              di atas file ini
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-2">
          Data diperbarui otomatis setiap 60 detik · Powered by{" "}
          <a
            href="https://betterstack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-500 transition-colors"
          >
            BetterStack Uptime
          </a>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
};

export default StatusPage;
