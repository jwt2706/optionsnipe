import {
  todayKey,
  type CalendarEvent,
  type DailyReport,
  type EarningsRow,
  type MoverRow,
  type OptionsRow,
} from "@/lib/market-report";

type FmpMover = {
  ticker?: string;
  symbol?: string;
  companyName?: string;
  name?: string;
  marketCap?: number;
  changesPercentage?: number | string;
  change?: number | string;
  price?: number | string;
  volume?: number | string;
};

type FmpEarnings = {
  symbol?: string;
  date?: string;
  time?: string;
  eps?: number | string;
  epsEstimated?: number | string;
  revenue?: number | string;
  revenueEstimated?: number | string;
  revenueBillion?: number | string;
  revenueEstimatedBillion?: number | string;
  reportedEPS?: number | string;
  estimatedEPS?: number | string;
  actualRevenue?: number | string;
  estimatedRevenue?: number | string;
};

type FmpQuote = {
  symbol?: string;
  name?: string;
  marketCap?: number;
};

type FmpEconomicEvent = {
  date?: string;
  time?: string;
  event?: string;
  name?: string;
  country?: string;
  impact?: string | number;
  importance?: string | number;
  actual?: number | string;
  previous?: number | string;
  estimate?: number | string;
  forecast?: number | string;
};

const fmpApiKey = process.env.FMP_API_KEY;
const fmpBaseUrl = process.env.FMP_BASE_URL ?? "https://financialmodelingprep.com/stable";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function formatMoney(value: number | undefined, fractionDigits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `$${value.toFixed(fractionDigits)}`;
}

function formatRevenue(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  return `$${value.toFixed(0)}`;
}

function buildUrl(path: string) {
  const url = new URL(`${fmpBaseUrl}${path}`);
  if (fmpApiKey) {
    url.searchParams.set("apikey", fmpApiKey);
  }
  return url;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!fmpApiKey) {
    return null;
  }

  try {
    const response = await fetch(buildUrl(path), { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function mapMover(row: FmpMover): MoverRow | null {
  const ticker = row.ticker ?? row.symbol;
  if (!ticker) {
    return null;
  }

  const marketCap = toNumber(row.marketCap) ?? 0;
  const company = row.companyName ?? row.name ?? ticker;
  const percentChange = toNumber(row.changesPercentage) ?? 0;
  const dollarChange = toNumber(row.change) ?? 0;
  const volume = toNumber(row.volume) ?? 0;

  return {
    ticker,
    company,
    marketCap,
    percentChange,
    dollarChange,
    volume,
  };
}

function normalizeMoverRows(rows: MoverRow[]) {
  const sorted = [...rows].sort((left, right) => right.marketCap - left.marketCap);
  const maxVolume = Math.max(...sorted.map((row) => row.volume), 1);

  return sorted.map((row) => ({
    ...row,
    volume: Math.max(8, Math.round((row.volume / maxVolume) * 100)),
  }));
}

function mapEconomicEvent(event: FmpEconomicEvent): CalendarEvent | null {
  const name = event.event ?? event.name;
  if (!name) {
    return null;
  }

  const normalizedName = name.toLowerCase();
  const time = deriveEconomicEventTime(normalizedName, event.time);
  const category = deriveEconomicCategory(normalizedName);
  const consensus = toText(event.estimate ?? event.forecast) ?? "—";
  const previous = toText(event.previous) ?? "—";
  const actual = toText(event.actual);

  return {
    time,
    session: deriveSession(time),
    name,
    category,
    consensus,
    previous,
    actual,
  };
}

function deriveEconomicCategory(name: string) {
  if (name.includes("cpi") || name.includes("inflation") || name.includes("ppi")) {
    return "Inflation";
  }

  if (
    name.includes("job") ||
    name.includes("employment") ||
    name.includes("payroll") ||
    name.includes("unemployment")
  ) {
    return "Labor";
  }

  if (name.includes("fed") || name.includes("fomc") || name.includes("interest rate")) {
    return "Fed";
  }

  if (name.includes("gdp") || name.includes("retail sales") || name.includes("consumer confidence")) {
    return "Growth";
  }

  if (name.includes("speech") || name.includes("talk") || name.includes("testimony")) {
    return "Fed Speech";
  }

  return "Macro";
}

function deriveEconomicEventTime(name: string, rawTime?: string) {
  if (rawTime && rawTime !== "") {
    return rawTime;
  }

  if (name.includes("cpi") || name.includes("ppi") || name.includes("employment") || name.includes("jobs")) {
    return "08:30";
  }

  if (name.includes("fomc") || name.includes("interest rate") || name.includes("fed rate")) {
    return "14:00";
  }

  if (name.includes("speech") || name.includes("testimony")) {
    return "13:00";
  }

  if (name.includes("retail sales") || name.includes("consumer confidence")) {
    return "10:00";
  }

  return "All day";
}

function deriveSession(time: string) {
  if (time === "All day") {
    return "All day";
  }

  const hour = Number.parseInt(time.slice(0, 2), 10);
  if (Number.isNaN(hour)) {
    return "Market hours";
  }

  if (hour < 9 || (hour === 9 && Number.parseInt(time.slice(3, 5), 10) < 30)) {
    return "Pre-market";
  }

  if (hour >= 16) {
    return "After close";
  }

  return "Market hours";
}

async function fetchMovers(kind: "gainers" | "losers") {
  const rows = await fetchJson<FmpMover[]>(`/stock_market/${kind}`);
  if (!rows?.length) {
    return null;
  }

  const mapped = rows.map(mapMover).filter((row): row is MoverRow => Boolean(row));
  return mapped.length ? normalizeMoverRows(mapped).slice(0, 8) : null;
}

async function fetchEarnings(date: Date) {
  const dateKey = todayKey(date);
  const rows = await fetchJson<FmpEarnings[]>(`/earning_calendar?from=${dateKey}&to=${dateKey}`);
  if (!rows?.length) {
    return null;
  }

  const symbols = [...new Set(rows.map((row) => row.symbol).filter(Boolean))] as string[];
  const quotes = symbols.length ? await fetchJson<FmpQuote[]>(`/quote/${symbols.join(",")}`) : null;
  const quoteMap = new Map((quotes ?? []).map((quote) => [quote.symbol ?? "", quote]));

  const mapped: EarningsRow[] = rows
    .map((row) => {
      const symbol = row.symbol;
      if (!symbol) {
        return null;
      }

      const quote = quoteMap.get(symbol);
      const epsEstimate = toNumber(row.epsEstimated ?? row.estimatedEPS);
      const epsActual = toNumber(row.eps ?? row.reportedEPS);
      const revenueEstimate = toNumber(row.revenueEstimatedBillion ?? row.estimatedRevenue ?? row.revenueEstimated);
      const revenueActual = toNumber(row.revenueBillion ?? row.actualRevenue ?? row.revenue);

      return {
        ticker: symbol,
        company: quote?.name ?? symbol,
        marketCap: quote?.marketCap ?? 0,
        reportTime: normalizeEarningsTime(row.time),
        epsEstimate: formatMoney(epsEstimate),
        epsActual: formatMoney(epsActual),
        revenueEstimate: formatRevenue(revenueEstimate),
        revenueActual: formatRevenue(revenueActual),
      };
    })
    .filter((row): row is EarningsRow => Boolean(row))
    .sort((left, right) => right.marketCap - left.marketCap)
    .slice(0, 10);

  return mapped.length ? mapped : null;
}

function normalizeEarningsTime(time?: string) {
  if (!time) {
    return "AMC";
  }

  const normalized = time.toLowerCase();

  if (normalized.includes("after")) {
    return "AMC";
  }

  if (normalized.includes("before")) {
    return "BMO";
  }

  return time.toUpperCase();
}

async function fetchEconomicCalendar(date: Date) {
  const dateKey = todayKey(date);
  const rows = await fetchJson<FmpEconomicEvent[]>(`/economic_calendar?from=${dateKey}&to=${dateKey}`);
  if (!rows?.length) {
    return null;
  }

  const mapped = rows
    .filter((row) => !row.country || row.country === "US")
    .map(mapEconomicEvent)
    .filter((row): row is CalendarEvent => Boolean(row))
    .filter((row) => row.category !== "Macro" || row.name.toLowerCase().includes("fed"))
    .slice(0, 8);

  return mapped.length ? mapped : null;
}

/**
 * Unusual-options-activity data isn't available on FMP's free tier, so this
 * always returns null and the Options tab renders an explicit empty state
 * instead of made-up IV ranks / put-call ratios. Wire in a real provider
 * (e.g. an options-flow API) here when you have one.
 */
async function fetchOptionsFlow(): Promise<OptionsRow[] | null> {
  return null;
}

function buildHeroFacts(report: Pick<DailyReport, "calendarEvents" | "gainers" | "earningsRows">) {
  const facts: string[] = [];

  if (report.calendarEvents[0]) {
    facts.push(
      `${report.calendarEvents[0].name} ${report.calendarEvents[0].time} ET · consensus ${report.calendarEvents[0].consensus}`,
    );
  }

  if (report.gainers[0]) {
    const top = report.gainers[0];
    facts.push(`${top.ticker} top mover ${top.percentChange > 0 ? "+" : ""}${top.percentChange.toFixed(1)}%`);
  }

  if (report.earningsRows[0]) {
    facts.push(`Largest earnings watch: ${report.earningsRows[0].ticker} ${report.earningsRows[0].reportTime}`);
  }

  return facts;
}

export async function buildLiveDailyReport(date = new Date()): Promise<DailyReport> {
  const [gainers, losers, earningsRows, calendarEvents, optionsRows] = await Promise.all([
    fetchMovers("gainers"),
    fetchMovers("losers"),
    fetchEarnings(date),
    fetchEconomicCalendar(date),
    fetchOptionsFlow(),
  ]);

  // Options isn't wired to a live provider yet, so only the 4 core sources
  // count toward "fresh vs partial vs failed".
  const coreSources = [gainers, losers, earningsRows, calendarEvents];
  const livePieces = coreSources.filter((piece) => piece !== null).length;

  const report: DailyReport = {
    date: todayKey(date),
    status: livePieces === 0 ? "failed" : livePieces === coreSources.length ? "fresh" : "partial",
    source: livePieces === 0 ? "empty" : livePieces === coreSources.length ? "live" : "mixed",
    refreshedAt: date.toISOString(),
    lastFetchedAt: date.toISOString(),
    heroFacts: [],
    calendarEvents: calendarEvents ?? [],
    earningsRows: earningsRows ?? [],
    gainers: gainers ?? [],
    losers: losers ?? [],
    optionsRows: optionsRows ?? [],
    marketCapFilter: "10b",
  };

  report.heroFacts = buildHeroFacts(report);

  if (!fmpApiKey) {
    report.heroFacts.unshift("FMP_API_KEY is not set — live market data is disabled.");
  }

  return report;
}