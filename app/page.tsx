"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSeedDailyReport, type DailyReport, type DailyReportHistoryEntry } from "@/lib/market-report";

type Tab = "Calendar" | "Earnings" | "Movers" | "Options";
type MarketCapFilter = "all" | "10b" | "100b";

type CalendarEvent = {
  time: string;
  session: string;
  name: string;
  category: string;
  consensus: string;
  previous: string;
  actual?: string;
  surprise?: string;
};

type EarningsRow = {
  ticker: string;
  company: string;
  marketCap: number;
  reportTime: string;
  epsEstimate: string;
  epsActual: string;
  revenueEstimate: string;
  revenueActual: string;
};

type MoverRow = {
  ticker: string;
  company: string;
  marketCap: number;
  percentChange: number;
  dollarChange: number;
  volume: number;
};

type OptionsRow = {
  ticker: string;
  company: string;
  marketCap: number;
  unusualVolume: string;
  ivRank: number;
  putCallRatio: number;
};

const tabs: Tab[] = ["Calendar", "Earnings", "Movers", "Options"];
const marketCapOptions: Array<{ value: MarketCapFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "10b", label: ">$10B" },
  { value: "100b", label: ">$100B" },
];

const heroFacts = [
  "CPI 8:30 AM ET · consensus 3.1%",
  "FOMC: no meeting today",
  "NVDA top mover +6.2%",
  "Options flow: elevated call activity in semis",
];

const calendarEvents: CalendarEvent[] = [
  {
    time: "08:30",
    session: "Pre-market",
    name: "Core CPI",
    category: "Macro",
    consensus: "3.1%",
    previous: "3.2%",
    actual: "3.0%",
    surprise: "-0.1",
  },
  {
    time: "10:00",
    session: "Market hours",
    name: "Consumer Sentiment",
    category: "Survey",
    consensus: "68.4",
    previous: "67.1",
  },
  {
    time: "16:05",
    session: "After close",
    name: "AAPL earnings",
    category: "Earnings",
    consensus: "$1.41 EPS",
    previous: "$1.29 EPS",
  },
];

const earningsRows: EarningsRow[] = [
  {
    ticker: "NVDA",
    company: "NVIDIA",
    marketCap: 3_400_000_000_000,
    reportTime: "AMC",
    epsEstimate: "$1.10",
    epsActual: "$1.18",
    revenueEstimate: "$28.7B",
    revenueActual: "$29.8B",
  },
  {
    ticker: "AAPL",
    company: "Apple",
    marketCap: 3_050_000_000_000,
    reportTime: "AMC",
    epsEstimate: "$1.41",
    epsActual: "$1.44",
    revenueEstimate: "$89.6B",
    revenueActual: "$90.2B",
  },
  {
    ticker: "META",
    company: "Meta Platforms",
    marketCap: 1_330_000_000_000,
    reportTime: "BMO",
    epsEstimate: "$4.72",
    epsActual: "$4.61",
    revenueEstimate: "$39.1B",
    revenueActual: "$38.6B",
  },
  {
    ticker: "AMD",
    company: "Advanced Micro Devices",
    marketCap: 285_000_000_000,
    reportTime: "AMC",
    epsEstimate: "$0.68",
    epsActual: "$0.74",
    revenueEstimate: "$6.8B",
    revenueActual: "$7.1B",
  },
];

const gainers: MoverRow[] = [
  {
    ticker: "NVDA",
    company: "NVIDIA",
    marketCap: 3_400_000_000_000,
    percentChange: 6.2,
    dollarChange: 81.43,
    volume: 92,
  },
  {
    ticker: "AMD",
    company: "Advanced Micro Devices",
    marketCap: 285_000_000_000,
    percentChange: 4.1,
    dollarChange: 6.73,
    volume: 67,
  },
  {
    ticker: "MU",
    company: "Micron",
    marketCap: 145_000_000_000,
    percentChange: 3.5,
    dollarChange: 5.18,
    volume: 54,
  },
];

const losers: MoverRow[] = [
  {
    ticker: "TSLA",
    company: "Tesla",
    marketCap: 700_000_000_000,
    percentChange: -4.4,
    dollarChange: -12.87,
    volume: 88,
  },
  {
    ticker: "SNAP",
    company: "Snap",
    marketCap: 18_000_000_000,
    percentChange: -3.1,
    dollarChange: -0.52,
    volume: 41,
  },
  {
    ticker: "UBER",
    company: "Uber Technologies",
    marketCap: 165_000_000_000,
    percentChange: -2.7,
    dollarChange: -2.18,
    volume: 58,
  },
];

const optionsRows: OptionsRow[] = [
  {
    ticker: "NVDA",
    company: "NVIDIA",
    marketCap: 3_400_000_000_000,
    unusualVolume: "12.4x avg",
    ivRank: 61,
    putCallRatio: 0.71,
  },
  {
    ticker: "AAPL",
    company: "Apple",
    marketCap: 3_050_000_000_000,
    unusualVolume: "5.8x avg",
    ivRank: 38,
    putCallRatio: 0.94,
  },
  {
    ticker: "TSLA",
    company: "Tesla",
    marketCap: 700_000_000_000,
    unusualVolume: "9.1x avg",
    ivRank: 74,
    putCallRatio: 1.18,
  },
  {
    ticker: "AMD",
    company: "Advanced Micro Devices",
    marketCap: 285_000_000_000,
    unusualVolume: "7.3x avg",
    ivRank: 52,
    putCallRatio: 0.86,
  },
];

function formatMarketCap(value: number) {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
  }

  return `$${(value / 1_000_000_000).toFixed(0)}B`;
}

function formatChange(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatDollarChange(value: number) {
  return `${value > 0 ? "+" : ""}$${Math.abs(value).toFixed(2)}`;
}

function matchesMarketCap(value: number, filter: MarketCapFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "10b") {
    return value >= 10_000_000_000;
  }

  return value >= 100_000_000_000;
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[12px] ${
        positive ? "text-emerald-400" : "text-rose-400"
      }`}
    >
      <span>{positive ? "^" : "v"}</span>
      <span>{positive ? "+" : ""}{value.toFixed(1)}</span>
    </span>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-medium uppercase tracking-[0.28em] text-zinc-400">
        {title}
      </h2>
    </div>
  );
}

function SparkBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-20 overflow-hidden border border-white/10 bg-white/[0.03]">
      <div
        className="h-full bg-cyan-400/80"
        style={{ width: `${Math.max(8, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function normalizeTab(value: string | null): Tab {
  return value === "Earnings" || value === "Movers" || value === "Options" ? value : "Calendar";
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatSelectedDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function isFutureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return value > todayKey();
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(value: string) {
  const [yearPart, monthPart] = value.split("-");
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return new Date();
  }

  return new Date(year, month - 1, 1);
}

function isSameMonth(left: string, right: string) {
  return left.slice(0, 7) === right.slice(0, 7);
}

function buildMonthDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDay = firstOfMonth.getDay();
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + index);
    return current;
  });
}

export default function Home() {
  const [report, setReport] = useState<DailyReport>(() => createSeedDailyReport());
  const [reportDates, setReportDates] = useState<string[]>([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Calendar");
  const [marketCapFilter, setMarketCapFilter] = useState<MarketCapFilter>("10b");
  const [refreshing, setRefreshing] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayKey());
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);
  const datePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isFutureDate(selectedDate)) {
      setSelectedDate(todayKey());
    }
  }, [selectedDate]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        datePickerOpen &&
        datePopoverRef.current &&
        !datePopoverRef.current.contains(target) &&
        dateButtonRef.current &&
        !dateButtonRef.current.contains(target)
      ) {
        setDatePickerOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [datePickerOpen]);

  useEffect(() => {
    setActiveTab(normalizeTab(window.location.hash.replace(/^#/, "")));

    const handleHashChange = () => {
      setActiveTab(normalizeTab(window.location.hash.replace(/^#/, "")));
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      setLoadingReport(true);

      try {
        const [reportResponse, historyResponse] = await Promise.all([
          fetch(`/api/reports/${selectedDate}`, { cache: "no-store" }),
          fetch("/api/reports/history?limit=180", { cache: "no-store" }),
        ]);

        if (historyResponse.ok) {
          const historyPayload = (await historyResponse.json()) as { history?: DailyReportHistoryEntry[] };
          setReportDates((historyPayload.history ?? []).map((entry) => entry.date));
        }

        if (reportResponse.ok) {
          const payload = (await reportResponse.json()) as DailyReport;

          if (!cancelled) {
            setReport(payload);
            setLoadError(null);
          }

          return;
        }

        const refreshResponse = await fetch("/api/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ date: selectedDate }),
        });

        if (!refreshResponse.ok) {
          throw new Error("Failed to load report");
        }

        const payload = (await refreshResponse.json()) as { report?: DailyReport };

        if (!cancelled && payload.report) {
          setReport(payload.report);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Live market data is unavailable right now; showing cached fallback data.");
        }
      } finally {
        if (!cancelled) {
          setLoadingReport(false);
        }
      }
    };

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const lastRefresh = Date.parse(report.lastFetchedAt);
  const minutesSinceRefresh = Number.isFinite(lastRefresh)
    ? Math.max(0, Math.floor((Date.now() - lastRefresh) / 60000))
    : 0;
  const refreshLocked = minutesSinceRefresh < 3 || refreshing;

  const statusTone =
    report.status === "fresh"
      ? "bg-emerald-400"
      : report.status === "partial"
        ? "bg-amber-400"
        : "bg-rose-400";
  const statusLabel =
    report.status === "fresh" ? "Live data fresh" : report.status === "partial" ? "Partial data" : "Data error";

  const filteredEarnings = useMemo(
    () => report.earningsRows.filter((row) => matchesMarketCap(row.marketCap, marketCapFilter)),
    [marketCapFilter, report.earningsRows],
  );

  const filteredGainers = useMemo(
    () => report.gainers.filter((row) => matchesMarketCap(row.marketCap, marketCapFilter)),
    [marketCapFilter, report.gainers],
  );

  const filteredLosers = useMemo(
    () => report.losers.filter((row) => matchesMarketCap(row.marketCap, marketCapFilter)),
    [marketCapFilter, report.losers],
  );

  const filteredOptions = useMemo(
    () => report.optionsRows.filter((row) => matchesMarketCap(row.marketCap, marketCapFilter)),
    [marketCapFilter, report.optionsRows],
  );

  const handleRefresh = async () => {
    if (refreshLocked) {
      return;
    }

    setRefreshing(true);

    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      const payload = (await response.json()) as { report?: DailyReport };

      if (response.ok && payload.report) {
        setReport(payload.report);
        setLoadError(null);
      }
    } catch {
      setLoadError("Refresh failed. Showing the last known report.");
    } finally {
      setRefreshing(false);
    }
  };

  const setTab = (tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };

  const openDatePicker = () => {
    setCalendarMonth(getMonthKey(new Date(`${selectedDate}T00:00:00`)));
    setDatePickerOpen((currentOpen) => !currentOpen);
  };

  const monthDate = parseMonthKey(calendarMonth);
  const monthDays = buildMonthDays(monthDate);
  const currentMonthKey = getMonthKey(new Date());
  const reportDateSet = useMemo(() => new Set(reportDates), [reportDates]);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(monthDate);

  const moveMonth = (offset: number) => {
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    const nextKey = getMonthKey(nextMonth);

    if (nextKey > currentMonthKey) {
      return;
    }

    setCalendarMonth(nextKey);
  };

  const selectDate = (date: string) => {
    if (isFutureDate(date)) {
      return;
    }

    setSelectedDate(date);
    setCalendarMonth(getMonthKey(new Date(`${date}T00:00:00`)));
    setDatePickerOpen(false);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(255,255,255,0.04),_transparent_20%),linear-gradient(to_bottom,_rgba(255,255,255,0.02),_transparent_20%)]" />

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050608]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex items-center gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-300">
                  Optionsnipe
                </div>
              </div>

              <button
                ref={dateButtonRef}
                type="button"
                onClick={openDatePicker}
                className="border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-zinc-200 transition hover:border-white/16 hover:bg-white/[0.05]"
              >
                {formatSelectedDate(selectedDate)}
              </button>

              {datePickerOpen ? (
                <div
                  ref={datePopoverRef}
                  className="absolute left-0 top-[48px] z-50 w-[320px] border border-white/10 bg-[#0a0c10] p-4 shadow-2xl shadow-black/40 sm:left-auto sm:right-0"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => moveMonth(-1)}
                      className="border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      Prev
                    </button>
                    <div className="text-sm font-medium tracking-wide text-zinc-200">{monthLabel}</div>
                    <button
                      type="button"
                      onClick={() => moveMonth(1)}
                      disabled={isSameMonth(calendarMonth, currentMonthKey)}
                      className="border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:border-white/6 disabled:text-zinc-600"
                    >
                      Next
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="py-1 text-center">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {monthDays.map((day) => {
                      const key = day.toISOString().slice(0, 10);
                      const inCurrentMonth = isSameMonth(key, calendarMonth);
                      const hasReport = reportDateSet.has(key);
                      const isSelected = key === selectedDate;
                      const isBlocked = isFutureDate(key);

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectDate(key)}
                          disabled={!inCurrentMonth || isBlocked}
                          className={`relative flex h-10 items-center justify-center border text-sm transition ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                              : inCurrentMonth
                                ? "border-white/6 bg-white/[0.02] text-zinc-200 hover:border-white/16 hover:bg-white/[0.04]"
                                : "border-transparent bg-transparent text-zinc-700"
                          } ${isBlocked ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          <span className="relative z-10">{day.getDate()}</span>
                          {hasReport ? (
                            <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshLocked}
                className="inline-flex items-center gap-2 border border-cyan-400/40 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-zinc-500"
                title={refreshLocked ? "Refreshed recently" : "Refresh market data"}
              >
                <svg
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M13 8a5 5 0 1 1-1.4-3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.5 2.75v2.5h-2.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Refresh</span>
              </button>

            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-white/8 bg-[#080b10] px-4 py-2 text-xs text-zinc-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusTone}`} />
            <span>{loadError ?? statusLabel}</span>
          </div>
          <div className="font-mono text-zinc-500">
            {loadingReport ? "Loading report..." : `${formatSelectedDate(selectedDate)} · updated ${minutesSinceRefresh}m ago`}
          </div>
        </div>
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 pb-10 sm:px-6 lg:px-8">
        <section className="border border-white/8 bg-white/[0.02] px-4 py-4 backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {report.heroFacts.map((fact) => (
                <div
                  key={fact}
                  className="border border-white/8 bg-black/30 px-3 py-2 text-sm text-zinc-200"
                >
                  {fact}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                Market cap filter
              </span>
              <div className="flex overflow-hidden border border-white/8">
                {marketCapOptions.map((option) => {
                  const active = marketCapFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMarketCapFilter(option.value)}
                      className={`px-3 py-2 text-xs font-medium transition ${
                        active
                          ? "bg-cyan-400/15 text-cyan-300"
                          : "bg-transparent text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-white/8 pt-4 text-xs text-zinc-500">
            Market breadth, earnings, and macro events update from live sources when available.
          </div>
        </section>

        <section className="sticky top-[92px] z-30 border-b border-white/8 bg-[#050608]/95 backdrop-blur-xl">
          <div className="flex gap-6 overflow-x-auto px-1 py-2 text-sm" role="tablist" aria-label="Dashboard sections">
            {tabs.map((tab) => {
              const active = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTab(tab)}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${tab.toLowerCase()}`}
                  className={`relative whitespace-nowrap pb-2 transition ${
                    active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`absolute inset-x-0 bottom-0 h-px transition ${
                      active ? "bg-cyan-400" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        <section className="border border-white/8 bg-white/[0.02] px-4 py-5 sm:px-5">
          {activeTab === "Calendar" ? (
            <div id="panel-calendar" role="tabpanel" className="space-y-5 outline-none">
              <SectionHeading title="Calendar" />

              <div className="space-y-3">
                {report.calendarEvents.map((event) => (
                  <article
                    key={`${event.time}-${event.name}`}
                    className="grid gap-3 border-b border-white/6 py-4 last:border-b-0 md:grid-cols-[96px_minmax(0,1fr)_240px] md:items-center"
                  >
                    <div className="font-mono text-lg text-zinc-100">{event.time}</div>

                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-medium text-zinc-100">{event.name}</h3>
                        <span className="border border-white/8 px-2 py-0.5 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                          {event.category}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-500">{event.session}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-right text-xs text-zinc-400 md:text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Consensus</div>
                        <div className="font-mono text-zinc-200">{event.consensus}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Previous</div>
                        <div className="font-mono text-zinc-200">{event.previous}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Actual</div>
                        <div className="font-mono text-zinc-200">
                          {event.actual ?? "—"}
                          {event.surprise ? (
                            <span className="ml-2 align-middle">
                              <Delta value={Number(event.surprise)} />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "Earnings" ? (
            <div id="panel-earnings" role="tabpanel" className="space-y-5 outline-none">
              <SectionHeading title="Earnings" />

              <div className="hidden overflow-hidden border border-white/8 md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-[124px] z-10 bg-[#0a0c10] text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <tr className="border-b border-white/8">
                      <th className="px-4 py-3">Ticker</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Market Cap</th>
                      <th className="px-4 py-3">Report Time</th>
                      <th className="px-4 py-3">EPS Est vs Actual</th>
                      <th className="px-4 py-3">Rev Est vs Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEarnings.map((row) => {
                      const epsDelta = parseFloat(row.epsActual.replace("$", "")) - parseFloat(row.epsEstimate.replace("$", ""));
                      const revDelta =
                        parseFloat(row.revenueActual.replace("$", "").replace("B", "")) -
                        parseFloat(row.revenueEstimate.replace("$", "").replace("B", ""));

                      return (
                        <tr key={row.ticker} className="border-b border-white/6 last:border-b-0">
                          <td className="px-4 py-4 font-mono text-base text-zinc-100">{row.ticker}</td>
                          <td className="px-4 py-4 text-zinc-200">{row.company}</td>
                          <td className="px-4 py-4 font-mono text-zinc-300">{formatMarketCap(row.marketCap)}</td>
                          <td className="px-4 py-4">
                            <span className="border border-white/8 px-2 py-1 text-xs uppercase tracking-[0.22em] text-zinc-300">
                              {row.reportTime}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-zinc-300">
                            <span className="text-zinc-500">{row.epsEstimate}</span>
                            <span className="mx-2 text-zinc-600">vs</span>
                            <span className={epsDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              {row.epsActual}
                            </span>
                            <span className={`ml-2 ${epsDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {formatChange(epsDelta)}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-zinc-300">
                            <span className="text-zinc-500">{row.revenueEstimate}</span>
                            <span className="mx-2 text-zinc-600">vs</span>
                            <span className={revDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              {row.revenueActual}
                            </span>
                            <span className={`ml-2 ${revDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {formatChange(revDelta)}B
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredEarnings.map((row) => {
                  const epsDelta = parseFloat(row.epsActual.replace("$", "")) - parseFloat(row.epsEstimate.replace("$", ""));
                  const revDelta =
                    parseFloat(row.revenueActual.replace("$", "").replace("B", "")) -
                    parseFloat(row.revenueEstimate.replace("$", "").replace("B", ""));

                  return (
                    <article key={row.ticker} className="border border-white/8 bg-black/20 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-lg text-zinc-100">{row.ticker}</div>
                          <div className="text-sm text-zinc-400">{row.company}</div>
                        </div>
                        <span className="border border-white/8 px-2 py-1 text-xs uppercase tracking-[0.22em] text-zinc-300">
                          {row.reportTime}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Market cap</div>
                          <div className="font-mono text-zinc-200">{formatMarketCap(row.marketCap)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">EPS</div>
                          <div className={`font-mono ${epsDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {row.epsEstimate} vs {row.epsActual}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Revenue</div>
                          <div className={`font-mono ${revDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {row.revenueEstimate} vs {row.revenueActual}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Beat / miss</div>
                          <div className={`font-mono ${epsDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {formatChange(epsDelta)} EPS
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "Movers" ? (
            <div id="panel-movers" role="tabpanel" className="space-y-5 outline-none">
              <SectionHeading title="Movers" />

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border border-white/8">
                  <div className="border-b border-white/8 px-4 py-3 text-xs uppercase tracking-[0.22em] text-emerald-400">
                    Gainers
                  </div>
                  <div className="divide-y divide-white/6">
                    {filteredGainers.map((row, index) => (
                      <article key={row.ticker} className="grid grid-cols-[32px_minmax(0,1fr)_72px] gap-3 px-4 py-4">
                        <div className="font-mono text-sm text-zinc-500">{index + 1}</div>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <div className="font-mono text-base text-zinc-100">{row.ticker}</div>
                            <div className="truncate text-sm text-zinc-500">{row.company}</div>
                          </div>
                          <div className="mt-2 h-1.5 bg-white/[0.04]">
                            <div className="h-full bg-emerald-400/70" style={{ width: `${row.volume}%` }} />
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-lg text-emerald-400">{formatChange(row.percentChange)}%</div>
                          <div className="text-xs text-zinc-400">{formatDollarChange(row.dollarChange)}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="border border-white/8">
                  <div className="border-b border-white/8 px-4 py-3 text-xs uppercase tracking-[0.22em] text-rose-400">
                    Losers
                  </div>
                  <div className="divide-y divide-white/6">
                    {filteredLosers.map((row, index) => (
                      <article key={row.ticker} className="grid grid-cols-[32px_minmax(0,1fr)_72px] gap-3 px-4 py-4">
                        <div className="font-mono text-sm text-zinc-500">{index + 1}</div>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <div className="font-mono text-base text-zinc-100">{row.ticker}</div>
                            <div className="truncate text-sm text-zinc-500">{row.company}</div>
                          </div>
                          <div className="mt-2 h-1.5 bg-white/[0.04]">
                            <div className="h-full bg-rose-400/70" style={{ width: `${row.volume}%` }} />
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-lg text-rose-400">{formatChange(row.percentChange)}%</div>
                          <div className="text-xs text-zinc-400">{formatDollarChange(row.dollarChange)}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "Options" ? (
            <div id="panel-options" role="tabpanel" className="space-y-5 outline-none">
              <SectionHeading title="Options" />

              <div className="hidden overflow-hidden border border-white/8 md:block">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-[124px] z-10 bg-[#0a0c10] text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <tr className="border-b border-white/8">
                      <th className="px-4 py-3">Ticker</th>
                      <th className="px-4 py-3">Unusual Volume</th>
                      <th className="px-4 py-3">IV Rank</th>
                      <th className="px-4 py-3">Put/Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOptions.map((row) => (
                      <tr key={row.ticker} className="border-b border-white/6 last:border-b-0">
                        <td className="px-4 py-4">
                          <div className="font-mono text-base text-zinc-100">{row.ticker}</div>
                          <div className="text-sm text-zinc-500">{row.company}</div>
                        </td>
                        <td className="px-4 py-4 font-mono text-zinc-200">{row.unusualVolume}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <SparkBar value={row.ivRank} />
                            <span className="font-mono text-zinc-300">{row.ivRank}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono">
                          <span className={row.putCallRatio > 1 ? "text-rose-400" : "text-emerald-400"}>
                            {row.putCallRatio.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredOptions.map((row) => (
                  <article key={row.ticker} className="border border-white/8 bg-black/20 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-lg text-zinc-100">{row.ticker}</div>
                        <div className="text-sm text-zinc-500">{row.company}</div>
                      </div>
                      <div className="font-mono text-sm text-zinc-200">{row.unusualVolume}</div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">IV rank</div>
                        <div className="mt-2 flex items-center gap-3">
                          <SparkBar value={row.ivRank} />
                          <span className="font-mono text-zinc-300">{row.ivRank}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Put/Call</div>
                        <div className={`mt-2 font-mono ${row.putCallRatio > 1 ? "text-rose-400" : "text-emerald-400"}`}>
                          {row.putCallRatio.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
