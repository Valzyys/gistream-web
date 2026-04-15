import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";

const STATS_API =
  "https://v2.jkt48connect.com/api/admin/stats?apikey=JKTCONNECT&username=vzy&password=vzy";

interface DailyStat {
  date: string;
  count: number;
}

interface KeyStat {
  type: string;
  count: string;
  total_usage: string;
}

interface StatsResponse {
  status: boolean;
  data: {
    dailyStats: DailyStat[];
    keyStats: KeyStat[];
  };
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("id-ID");
};

export default function MonthlySalesChart() {
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [keyStats, setKeyStats] = useState<KeyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "keytype">("daily");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(STATS_API);
        const data: StatsResponse = await res.json();
        if (data.status) {
          setDailyStats(data.data.dailyStats ?? []);
          setKeyStats(data.data.keyStats ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // ── Daily Requests Chart ──
  const dailyOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: {
      categories: dailyStats.map((d) => formatDate(d.date)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatNumber(val),
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      x: { show: true },
      y: {
        formatter: (val: number) => formatNumber(val) + " requests",
      },
    },
  };

  const dailySeries = [
    {
      name: "Requests",
      data: dailyStats.map((d) => d.count),
    },
  ];

  // ── Key Type Chart ──
  const keyTypeColors: Record<string, string> = {
    premiumPlus: "#465fff",
    premium: "#7C3AED",
    enterprise: "#DC1F2E",
    basic: "#F59E0B",
    free: "#6b7280",
  };

  const keyTypeOptions: ApexOptions = {
    colors: keyStats.map((k) => keyTypeColors[k.type] ?? "#465fff"),
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 5,
        borderRadiusApplication: "end",
        distributed: true,
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: {
      categories: keyStats.map((k) =>
        k.type.replace("premiumPlus", "Prem+").replace("premium", "Premium")
          .replace("enterprise", "Enterprise").replace("basic", "Basic")
          .replace("free", "Free")
      ),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatNumber(val),
      },
    },
    legend: { show: false },
    grid: {
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      x: { show: true },
      y: {
        formatter: (val: number) => formatNumber(val) + " usage",
      },
    },
  };

  const keyTypeSeries = [
    {
      name: "Total Usage",
      data: keyStats.map((k) => Number(k.total_usage)),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {activeTab === "daily" ? "Daily Requests" : "Usage by Key Type"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeTab === "daily"
              ? `${dailyStats.length} hari terakhir`
              : `${keyStats.length} tipe key`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setActiveTab("daily")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "daily"
                  ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => setActiveTab("keytype")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "keytype"
                  ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Key Type
            </button>
          </div>

          {/* Dropdown */}
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
                onItemClick={() => setIsOpen(false)}
                className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                Refresh
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Summary Pills */}
      {!loading && activeTab === "keytype" && (
        <div className="flex flex-wrap gap-2 mt-4">
          {keyStats.map((k) => (
            <div
              key={k.type}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1"
              style={{
                borderColor: `${keyTypeColors[k.type] ?? "#465fff"}40`,
                backgroundColor: `${keyTypeColors[k.type] ?? "#465fff"}10`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: keyTypeColors[k.type] ?? "#465fff" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: keyTypeColors[k.type] ?? "#465fff" }}
              >
                {k.type}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {k.count} keys
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="max-w-full overflow-x-auto custom-scrollbar mt-2">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          {loading ? (
            <div className="flex items-center justify-center h-[180px]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            </div>
          ) : activeTab === "daily" ? (
            <Chart
              options={dailyOptions}
              series={dailySeries}
              type="bar"
              height={180}
            />
          ) : (
            <Chart
              options={keyTypeOptions}
              series={keyTypeSeries}
              type="bar"
              height={180}
            />
          )}
        </div>
      </div>
    </div>
  );
}
