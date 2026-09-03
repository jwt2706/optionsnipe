export type MarketCapFilter = "all" | "10b" | "100b";
export type ReportStatus = "fresh" | "partial" | "failed";
export type ReportSource = "live" | "mixed" | "empty";

export type CalendarEvent = {
  time: string;
  session: string;
  name: string;
  category: string;
  consensus: string;
  previous: string;
  actual?: string;
  surprise?: string;
};

export type EarningsRow = {
  ticker: string;
  company: string;
  marketCap: number;
  reportTime: string;
  epsEstimate: string;
  epsActual: string;
  revenueEstimate: string;
  revenueActual: string;
};

export type MoverRow = {
  ticker: string;
  company: string;
  marketCap: number;
  percentChange: number;
  dollarChange: number;
  volume: number;
};

export type OptionsRow = {
  ticker: string;
  company: string;
  marketCap: number;
  unusualVolume: string;
  ivRank: number;
  putCallRatio: number;
};

export type DailyReport = {
  date: string;
  status: ReportStatus;
  source: ReportSource;
  refreshedAt: string;
  lastFetchedAt: string;
  heroFacts: string[];
  calendarEvents: CalendarEvent[];
  earningsRows: EarningsRow[];
  gainers: MoverRow[];
  losers: MoverRow[];
  optionsRows: OptionsRow[];
  marketCapFilter: MarketCapFilter;
};

export type DailyReportHistoryEntry = {
  date: string;
  status: DailyReport["status"];
  source: DailyReport["source"];
  refreshedAt: string;
  headline: string;
  topMover: string;
  topEvent: string;
  marketCapFilter: MarketCapFilter;
};

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * A structurally-valid DailyReport with every array empty. This is NOT
 * sample data — it's what the API returns when neither MongoDB nor any
 * live market source produced anything for a date. The UI is expected to
 * render explicit "no data" states around it.
 */
export function createSeedDailyReport(date = new Date()): DailyReport {
  const timestamp = date.toISOString();

  return {
    date: todayKey(date),
    status: "failed",
    source: "empty",
    refreshedAt: timestamp,
    lastFetchedAt: timestamp,
    heroFacts: [],
    calendarEvents: [],
    earningsRows: [],
    gainers: [],
    losers: [],
    optionsRows: [],
    marketCapFilter: "10b",
  };
}

export function buildHistoryEntry(report: DailyReport): DailyReportHistoryEntry {
  return {
    date: report.date,
    status: report.status,
    source: report.source,
    refreshedAt: report.refreshedAt,
    headline: report.heroFacts[0] ?? "No brief generated",
    topMover: report.gainers[0]
      ? `${report.gainers[0].ticker} +${report.gainers[0].percentChange.toFixed(1)}%`
      : "No mover data",
    topEvent: report.calendarEvents[0]
      ? `${report.calendarEvents[0].time} ${report.calendarEvents[0].name}`
      : "No calendar event",
    marketCapFilter: report.marketCapFilter,
  };
}