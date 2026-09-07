import {
  deriveEconomicCategory,
  deriveEconomicEventTime,
  deriveSession,
  todayKey,
  type CalendarEvent,
  type EarningsRow,
} from "@/lib/market-report";

type FinnhubEarningsRelease = {
  symbol?: string;
  date?: string;
  hour?: string; // "bmo" | "amc" | "dmh"
  epsEstimate?: number | null;
  epsActual?: number | null;
  revenueEstimate?: number | null;
  revenueActual?: number | null;
};

type FinnhubEarningsCalendarResponse = {
  earningsCalendar?: FinnhubEarningsRelease[];
};

type FinnhubEconomicEvent = {
  event?: string;
  country?: string;
  time?: string;
  actual?: number | null;
  estimate?: number | null;
  prev?: number | null;
  impact?: string;
  unit?: string;
};

type FinnhubEconomicCalendarResponse = {
  economicCalendar?: FinnhubEconomicEvent[];
};

type FinnhubProfile = {
  name?: string;
  marketCapitalization?: number; // reported in millions of USD
};

type FinnhubErrorPayload = {
  error?: string;
};

const finnhubApiKey = process.env.FINNHUB_API_KEY;
const finnhubBaseUrl = process.env.FINNHUB_BASE_URL ?? "https://finnhub.io/api/v1";

function buildUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${finnhubBaseUrl}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  if (finnhubApiKey) {
    url.searchParams.set("token", finnhubApiKey);
  }

  return url;
}

function redact(url: URL) {
  return url.toString().replace(/token=[^&]+/, "token=REDACTED");
}

function isErrorPayload(data: unknown): data is FinnhubErrorPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    "error" in (data as Record<string, unknown>)
  );
}

/**
 * Fetches JSON from Finnhub. Mirrors the logging discipline in
 * lib/free-market-api.ts: every failure path (missing key, network error,
 * non-2xx status, unparsable body, or a 200 that's actually an error
 * payload) is logged via console.error so it shows up in the same Vercel
 * function logs as the calling API route — nothing fails silently.
 */
async function fetchJson<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!finnhubApiKey) {
    console.error(`[finnhub] FINNHUB_API_KEY is not set; skipping fetch for ${path}`);
    return null;
  }

  const url = buildUrl(path, params);
  const redactedUrl = redact(url);

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    console.error(
      `[finnhub] network error fetching ${redactedUrl}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "<unreadable body>");
    console.error(
      `[finnhub] ${response.status} ${response.statusText} for ${redactedUrl} :: ${bodyText.slice(0, 500)}`,
    );
    return null;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error(
      `[finnhub] failed to parse JSON from ${redactedUrl}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }

  // Finnhub sometimes returns 200 OK with an { "error": "..." } body
  // instead of the expected shape — e.g. a premium-only endpoint hit with
  // a free-tier key, or a malformed request.
  if (isErrorPayload(data)) {
    console.error(`[finnhub] API error payload from ${redactedUrl} :: ${data.error}`);
    return null;
  }

  return data as T;
}

function normalizeEarningsTime(hour?: string) {
  const normalized = hour?.toLowerCase();

  if (normalized === "bmo") {
    return "BMO";
  }

  if (normalized === "dmh") {
    return "DMH";
  }

  return "AMC";
}

function formatMoney(value: number | null | undefined, fractionDigits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `$${value.toFixed(fractionDigits)}`;
}

function formatRevenue(value: number | null | undefined) {
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

function fetchProfile(symbol: string) {
  return fetchJson<FinnhubProfile>("/stock/profile2", { symbol });
}

export async function fetchFinnhubEarnings(date: Date): Promise<EarningsRow[] | null> {
  const dateKey = todayKey(date);
  const payload = await fetchJson<FinnhubEarningsCalendarResponse>("/calendar/earnings", {
    from: dateKey,
    to: dateKey,
  });

  const releases = payload?.earningsCalendar;
  if (!releases?.length) {
    return null;
  }

  const symbols = [
    ...new Set(releases.map((release) => release.symbol).filter((symbol): symbol is string => Boolean(symbol))),
  ];

  // Finnhub's free tier only accepts one symbol per profile lookup (no
  // comma-batching like FMP's /quote), so fetch them in parallel instead.
  const profileEntries = await Promise.all(
    symbols.map(async (symbol) => [symbol, await fetchProfile(symbol)] as const),
  );
  const profileBySymbol = new Map(profileEntries);

  const mapped: EarningsRow[] = releases
    .map((release) => {
      const symbol = release.symbol;
      if (!symbol) {
        return null;
      }

      const profile = profileBySymbol.get(symbol);
      // Finnhub reports market cap in millions of USD; scale to raw
      // dollars so it lines up with the rest of the app's convention.
      const marketCap =
        typeof profile?.marketCapitalization === "number" ? profile.marketCapitalization * 1_000_000 : 0;

      return {
        ticker: symbol,
        company: profile?.name ?? symbol,
        marketCap,
        reportTime: normalizeEarningsTime(release.hour),
        epsEstimate: formatMoney(release.epsEstimate),
        epsActual: formatMoney(release.epsActual),
        revenueEstimate: formatRevenue(release.revenueEstimate),
        revenueActual: formatRevenue(release.revenueActual),
      };
    })
    .filter((row): row is EarningsRow => Boolean(row))
    .sort((left, right) => right.marketCap - left.marketCap)
    .slice(0, 10);

  return mapped.length ? mapped : null;
}

function normalizeEventTime(rawTime: string | undefined, normalizedName: string) {
  if (!rawTime) {
    return deriveEconomicEventTime(normalizedName, undefined);
  }

  // Finnhub occasionally returns a full "YYYY-MM-DD HH:MM:SS" string
  // instead of a bare clock time — keep only the time portion if so.
  const timePart = rawTime.includes(" ") ? rawTime.split(" ").at(-1) : rawTime;
  return deriveEconomicEventTime(normalizedName, timePart);
}

export async function fetchFinnhubEconomicCalendar(date: Date): Promise<CalendarEvent[] | null> {
  const dateKey = todayKey(date);
  const payload = await fetchJson<FinnhubEconomicCalendarResponse>("/calendar/economic", {
    from: dateKey,
    to: dateKey,
  });

  const events = payload?.economicCalendar;
  if (!events?.length) {
    return null;
  }

  const mapped = events
    .filter((event) => !event.country || event.country === "US")
    .map((event): CalendarEvent | null => {
      const name = event.event;
      if (!name) {
        return null;
      }

      const normalizedName = name.toLowerCase();
      const time = normalizeEventTime(event.time, normalizedName);

      return {
        time,
        session: deriveSession(time),
        name,
        category: deriveEconomicCategory(normalizedName),
        consensus: typeof event.estimate === "number" ? String(event.estimate) : "—",
        previous: typeof event.prev === "number" ? String(event.prev) : "—",
        actual: typeof event.actual === "number" ? String(event.actual) : undefined,
      };
    })
    .filter((event): event is CalendarEvent => Boolean(event))
    .filter((event) => event.category !== "Macro" || event.name.toLowerCase().includes("fed"))
    .slice(0, 8);

  return mapped.length ? mapped : null;
}