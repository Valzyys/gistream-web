import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

const STATS_API =
  "https://v2.jkt48connect.com/api/admin/stats?apikey=JKTCONNECT&username=vzy&password=vzy";

interface IpWhitelistStat {
  api_key: string;
  owner: string;
  type: string;
  ip_count: string;
  active_ip_count: string;
}

interface StatsResponse {
  status: boolean;
  data: {
    ipWhitelistStats: IpWhitelistStat[];
    summary: {
      totalIPs: number;
      activeIPs: number;
    };
  };
}

const TYPE_COLORS: Record<string, string> = {
  enterprise: "#DC1F2E",
  premiumPlus: "#465FFF",
  premium: "#7C3AED",
  basic: "#F59E0B",
  free: "#6B7280",
};

const TYPE_LABELS: Record<string, string> = {
  enterprise: "Enterprise",
  premiumPlus: "Premium+",
  premium: "Premium",
  basic: "Basic",
  free: "Free",
};

const formatNumber = (n: number): string => n.toLocaleString("id-ID");

export default function DemographicCard() {
  const [stats, setStats] = useState<IpWhitelistStat[]>([]);
  const [summary, setSummary] = useState<{
    totalIPs: number;
    activeIPs: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(STATS_API);
      const data: StatsResponse = await res.json();
      if (data.status) {
        setStats(data.data.ipWhitelistStats ?? []);
        setSummary(data.data.summary ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalIpCount = stats.reduce((sum, s) => sum + Number(s.ip_count), 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            IP Whitelist Stats
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Distribusi IP per API key
          </p>
        </div>
        <div className="relative inline-block">
          <button
            className="dropdown-toggle"
            onClick={() => setIsOpen(!isOpen)}
          >
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={() => {
                setIsOpen(false);
                fetchStats();
              }}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Refresh
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Summary Pills */}
      {!loading && summary && (
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="h-2 w-2 rounded-full bg-[#465FFF]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total IP
            </span>
            <span className="text-xs font-semibold text-gray-800 dark:text-white/90">
              {formatNumber(summary.totalIPs)}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Active IP
            </span>
            <span className="text-xs font-semibold text-gray-800 dark:text-white/90">
              {formatNumber(summary.activeIPs)}
            </span>
          </div>
        </div>
      )}

      {/* Visual Bar Chart */}
      {!loading && stats.length > 0 && (
        <div className="mt-5 px-4 py-5 border border-gray-100 rounded-2xl dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
            Distribusi IP
          </p>
          <div className="flex items-end gap-2 h-[100px]">
            {stats.map((s) => {
              const pct =
                totalIpCount > 0
                  ? (Number(s.ip_count) / totalIpCount) * 100
                  : 0;
              const color = TYPE_COLORS[s.type] ?? "#465FFF";
              return (
                <div
                  key={s.api_key}
                  className="flex flex-col items-center gap-1 flex-1"
                  title={`${s.owner}: ${s.ip_count} IP`}
                >
                  <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400">
                    {s.ip_count}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, 8)}px`,
                      backgroundColor: color,
                      opacity: 0.85,
                    }}
                  />
                  <span
                    className="text-[9px] font-medium truncate w-full text-center"
                    style={{ color }}
                  >
                    {s.api_key.length > 8
                      ? s.api_key.slice(0, 8) + "…"
                      : s.api_key}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="mt-5 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {!loading && (
        <div className="mt-5 space-y-4">
          {stats.map((s) => {
            const pct =
              totalIpCount > 0
                ? Math.round((Number(s.ip_count) / totalIpCount) * 100)
                : 0;
            const color = TYPE_COLORS[s.type] ?? "#465FFF";

            return (
              <div
                key={s.api_key}
                className="flex items-center justify-between"
              >
                {/* Left: Icon + Info */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: `${color}18`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color }}>
                      {s.owner.slice(0, 1).toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90 leading-tight">
                      {s.owner}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          color,
                          backgroundColor: `${color}15`,
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {TYPE_LABELS[s.type] ?? s.type}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {s.active_ip_count}/{s.ip_count} aktif (
                        {Number(s.ip_count) > 0
                          ? Math.round(
                              (Number(s.active_ip_count) /
                                Number(s.ip_count)) *
                                100
                            )
                          : 0}
                        %)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Progress + Pct */}
                <div className="flex w-full max-w-[130px] items-center gap-2">
                  <div className="relative h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right flex-shrink-0">
                    {pct}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!loading && stats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 mt-4">
          <div className="text-4xl">🌐</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tidak ada data IP whitelist
          </p>
        </div>
      )}
    </div>
  );
}
