import { useEffect, useRef, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import flatpickr from "flatpickr";
import { CalenderIcon } from "../../icons";

const STATS_API =
  "https://v2.jkt48connect.com/api/admin/stats?apikey=JKTCONNECT&username=vzy&password=vzy";

interface DailyStat {
  date: string;
  count: number;
}

interface StatsResponse {
  status: boolean;
  data: {
    dailyStats: DailyStat[];
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

export default function StatisticsChart() {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [filteredStats, setFilteredStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(STATS_API);
        const data: StatsResponse = await res.json();
        if (data.status) {
          const stats = data.data.dailyStats ?? [];
          setDailyStats(stats);
          setFilteredStats(stats);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Filter by date range
  useEffect(() => {
    if (!dateRange || dailyStats.length === 0) {
      setFilteredStats(dailyStats);
      return;
    }
    const [start, end] = dateRange;
    const filtered = dailyStats.filter((d) => {
      const date = new Date(d.date);
      return date >= start && date <= end;
    });
    setFilteredStats(filtered.length > 0 ? filtered : dailyStats);
  }, [dateRange, dailyStats]);

  // Flatpickr
  useEffect(() => {
    if (!datePickerRef.current || dailyStats.length === 0) return;

    const dates = dailyStats.map((d) => new Date(d.date));
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M d",
      defaultDate: [minDate, maxDate],
      minDate,
      maxDate,
      clickOpens: true,
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          setDateRange([selectedDates[0], selectedDates[1]]);
        }
      },
    });

    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
  }, [dailyStats]);

  // Build chart data
  const categories = filteredStats.map((d) => formatDate(d.date));
  const dailyCounts = filteredStats.map((d) => d.count);

  // Cumulative
  const cumulativeCounts = filteredStats.reduce<number[]>((acc, d, i) => {
    acc.push((acc[i - 1] ?? 0) + d.count);
    return acc;
  }, []);

  // Summary
  const totalInRange = dailyCounts.reduce((a, b) => a + b, 0);
  const avgPerDay =
    dailyCounts.length > 0
      ? Math.round(totalInRange / dailyCounts.length)
      : 0;
  const peakDay = filteredStats.reduce(
    (max, d) => (d.count > max.count ? d : max),
    filteredStats[0] ?? { date: "", count: 0 }
  );

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit, sans-serif",
      labels: {
        colors: ["#6B7280"],
      },
    },
    colors: ["#465FFF", "#9CB9FF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: { show: false },
      animations: { enabled: true },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.45,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      shared: true,
      y: {
        formatter: (val: number) => formatNumber(val) + " req",
      },
    },
    xaxis: {
      type: "category",
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        style: { fontSize: "11px", colors: "#6B7280" },
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
        formatter: (val: number) => formatNumber(val),
      },
      title: { text: "", style: { fontSize: "0px" } },
    },
  };

  const series = [
    {
      name: "Daily Requests",
      data: dailyCounts,
    },
    {
      name: "Cumulative",
      data: cumulativeCounts,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Request Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Daily & cumulative API requests
          </p>
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          {/* Date Picker */}
          <div className="relative inline-flex items-center">
            <CalenderIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-3 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 size-5 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
            <input
              ref={datePickerRef}
              className="h-10 w-10 lg:w-40 lg:h-auto lg:pl-10 lg:pr-3 lg:py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-transparent lg:text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:lg:text-gray-300 cursor-pointer"
              placeholder="Select date range"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Summary Pills */}
      {!loading && filteredStats.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="h-2 w-2 rounded-full bg-[#465FFF]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total
            </span>
            <span className="text-xs font-semibold text-gray-800 dark:text-white/90">
              {formatNumber(totalInRange)}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="h-2 w-2 rounded-full bg-[#9CB9FF]" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Rata-rata/hari
            </span>
            <span className="text-xs font-semibold text-gray-800 dark:text-white/90">
              {formatNumber(avgPerDay)}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Peak
            </span>
            <span className="text-xs font-semibold text-gray-800 dark:text-white/90">
              {formatNumber(peakDay?.count ?? 0)}{" "}
              <span className="font-normal text-gray-400">
                ({peakDay ? formatDate(peakDay.date) : "—"})
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {loading ? (
            <div className="flex items-center justify-center h-[310px]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            </div>
          ) : filteredStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[310px] gap-3">
              <div className="text-4xl">📊</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tidak ada data untuk rentang tanggal ini
              </p>
            </div>
          ) : (
            <Chart
              options={options}
              series={series}
              type="area"
              height={310}
            />
          )}
        </div>
      </div>
    </div>
  );
}
