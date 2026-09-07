import {
  deriveEconomicCategory,
  deriveEconomicEventTime,
  deriveSession,
  todayKey,
  type CalendarEvent,
  type DailyReport,
  type EarningsRow,
  type MoverRow,
  type OptionsRow,
} from "@/lib/market-report";
import { fetchFinnhubEarnings, fetchFinnhubEconomicCalendar } from "@/lib/finnhub-api";

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

function buildUrl(path: string) {
  const url = new URL(`${fmpBaseUrl}${path}`);
  if (fmpApiKey) {
    url.searchParams.set("apikey", fmpApiKey);
  }
  return url;
}

function redact(url: URL) {
  return url.toString().replace(/apikey=[^&]+/, "apikey=REDACTED");
}

function isErrorPayload(data: unknown): data is { "Error Message": string } {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    "Error Message" in (data as Record<string, unknown>)
  );
}

/**
 * Fetches a JSON payload from FMP. Every failure path (missing key, network
 * error, non-2xx response, or a 200 that actually carries an FMP error
 * payload) is logged via console.error so it shows up in the same Vercel
 * function logs as the calling API route — nothing fails silently here.
 */
async function fetchJson<T>(path: string): Promise<T | null> {
  if (!fmpApiKey) {
    console.error(`[fmp] FMP_API_KEY is not set; skipping fetch for ${path}`);
    return null;
  }

  const url = buildUrl(path);
  const redactedUrl = redact(url);

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    console.error(
      `[fmp] network error fetching ${redactedUrl}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "<unreadable body>");
    console.error(
      `[fmp] ${response.status} ${response.statusText} for ${redactedUrl} :: ${bodyText.slice(0, 500)}`,
    );
    return null;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error(
      `[fmp] failed to parse JSON from ${redactedUrl}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  if (isErrorPayload(data)) {
    console.error(`[fmp] API error payload from ${redactedUrl} :: ${data["Error Message"]}`);
    return null;
  }

  return data as T;
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

async function fetchMovers(kind: "gainers" | "losers") {
  const endpoint = kind === "gainers" ? "biggest-gainers" : "biggest-losers";
  const rows = await fetchJson<FmpMover[]>(`/${endpoint}`);
  if (!rows?.length) {
    return null;
  }

  const mapped = rows.map(mapMover).filter((row): row is MoverRow => Boolean(row));
  return mapped.length ? normalizeMoverRows(mapped).slice(0, 8) : null;
}

/**
 * Unusual-options-activity data isn't available on any free tier we've
 * found (FMP, Finnhub, etc. all gate this behind paid plans), so this
 * always returns null and the Options tab renders an explicit empty state
 * instead of made-up IV ranks / put-call ratios. Wire in a real provider
 * here if you decide to pay for one.
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
    fetchFinnhubEarnings(date),
    fetchFinnhubEconomicCalendar(date),
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
    report.heroFacts.unshift("FMP_API_KEY is not set — live movers data is disabled.");
  }

  return report;
}