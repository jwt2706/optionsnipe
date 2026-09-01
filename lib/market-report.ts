export type MarketCapFilter = "all" | "10b" | "100b";

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
  status: "fresh" | "partial" | "failed";
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

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function createSeedDailyReport(date = new Date()): DailyReport {
  const timestamp = date.toISOString();

  return {
    date: todayKey(date),
    status: "fresh",
    refreshedAt: timestamp,
    lastFetchedAt: timestamp,
    heroFacts,
    calendarEvents,
    earningsRows,
    gainers,
    losers,
    optionsRows,
    marketCapFilter: "10b",
  };
}
