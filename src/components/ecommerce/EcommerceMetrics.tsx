import { useEffect, useState } from "react";
import { ArrowUpIcon, BoxIconLine, GroupIcon } from "../../icons";
import Badge from "../ui/badge/Badge";

const STATS_API =
  "https://v2.jkt48connect.com/api/admin/stats?apikey=JKTCONNECT&username=vzy&password=vzy";

interface Summary {
  totalKeys: number;
  activeKeys: number;
  totalRequests: number;
  totalIPs: number;
  activeIPs: number;
}

interface StatsResponse {
  status: boolean;
  data: {
    summary: Summary;
  };
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "JT";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("id-ID");
};

export default function EcommerceMetrics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(STATS_API);
        const data: StatsResponse = await res.json();
        if (data.status && data.data?.summary) {
          setSummary(data.data.summary);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Total API Keys */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total API Keys
            </span>
            {loading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            ) : (
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {summary ? formatNumber(summary.totalKeys) : "—"}
              </h4>
            )}
          </div>
          {!loading && summary && (
            <Badge color="success">
              <ArrowUpIcon />
              {summary.activeKeys} aktif
            </Badge>
          )}
        </div>
      </div>

      {/* Total Requests */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Requests
            </span>
            {loading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            ) : (
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {summary ? formatNumber(summary.totalRequests) : "—"}
              </h4>
            )}
          </div>
          {!loading && summary && (
            <Badge color="success">
              <ArrowUpIcon />
              {summary.activeIPs} IP
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
