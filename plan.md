# optionsnipe — Project Plan

## 1. Overview

A daily-refresh market intelligence dashboard for a small group of friends. Aggregates macro events (Fed speeches, rate decisions, CPI, jobs data), earnings calendar, and daily market movers (gainers/losers filtered by market cap), plus an options-activity layer. Data is fetched once per day via cron, cached in MongoDB, and served to all users from cache — no per-user API calls.

**Stack:** Next.js (React) on Vercel, MongoDB (Atlas), Vercel Cron for scheduling.

---

## 2. Core Features

### A. Macro Event Calendar
- FOMC meetings / rate decisions, Fed speeches
- CPI, PPI, jobs reports (NFP, unemployment claims), PMI, GDP
- Fields per event: name, date/time, consensus estimate, previous value, actual (post-release), surprise delta

### B. Earnings Calendar
- Ticker, company name, report date/time (BMO/AMC), EPS est vs actual, revenue est vs actual
- Filtered/sortable by market cap

### C. Market Movers
- Daily gainers/losers, % and $ change
- Filterable by market cap tier (e.g. >$10B, >$100B)
- Sortable by market cap descending (to surface signal over noise)
- Optional: volume spike flag

### D. Options Layer
- Unusual options volume / OI changes
- IV rank / IV percentile
- Put/call ratio for top movers

---

## 3. Architecture

### Daily-Cache Pattern
- **Primary trigger:** Vercel Cron job runs on a schedule (e.g. pre-market and post-market) → fetches all data sources → assembles one "daily report" document → writes to MongoDB
- **Fallback trigger:** If today's report doc doesn't exist when a user loads the app, the app triggers a fetch on-demand (with a lock flag to prevent duplicate concurrent fetches)
- **Manual refresh:** An authenticated "Refresh Today's Data" button/endpoint any user (or admin-only, TBD) can trigger to force a re-fetch, bypassing cache for that day

### Data Flow
1. Cron/manual trigger hits an API route (e.g. `/api/refresh`)
2. Route fetches from each external data source in parallel
3. Normalizes results into the daily report shape
4. Upserts into MongoDB `dailyReports` collection keyed by date
5. Frontend reads from `/api/report/[date]` which just queries Mongo — never calls external APIs directly

---

## 4. MongoDB Schema (conceptual)

**Collection: `dailyReports`**
```
{
  date: "2026-08-30",           // YYYY-MM-DD, unique index
  fetchedAt: ISODate,
  status: "complete" | "partial" | "failed",
  sources: {
    macro: { status, error? },
    earnings: { status, error? },
    movers: { status, error? },
    options: { status, error? }
  },
  macroEvents: [
    { name, category, dateTime, consensus, previous, actual, surprise }
  ],
  earnings: [
    { ticker, company, marketCap, reportTime, epsEst, epsActual, revEst, revActual }
  ],
  movers: {
    gainers: [ { ticker, company, marketCap, pctChange, dollarChange, volume } ],
    losers: [ { ticker, company, marketCap, pctChange, dollarChange, volume } ]
  },
  optionsActivity: [
    { ticker, unusualVolume, ivRank, putCallRatio }
  ]
}
```

**Collection: `refreshLocks`** (prevents duplicate concurrent fetches)
```
{ date: "2026-08-30", lockedAt: ISODate, expiresAt: ISODate }
```

---

## 5. Project Structure

```
market-scout/
├── app/
│   ├── page.tsx                    # Main dashboard (tabs: Calendar / Movers / Earnings / Options)
│   ├── layout.tsx
│   ├── history/
│   │   └── [date]/page.tsx         # Browse past daily reports
│   ├── api/
│   │   ├── refresh/route.ts        # Manual + cron-triggered refresh endpoint
│   │   ├── report/[date]/route.ts  # Fetch a day's cached report from Mongo
│   │   └── cron/route.ts           # Vercel Cron entry point (calls refresh logic)
│   └── globals.css
├── components/
│   ├── MacroCalendar.tsx
│   ├── EarningsTable.tsx
│   ├── MoversTable.tsx
│   ├── OptionsTable.tsx
│   ├── MarketCapFilter.tsx
│   ├── RefreshButton.tsx
│   └── StatusBanner.tsx            # Shows fetch status/errors per source
├── lib/
│   ├── mongodb.ts                  # DB connection helper
│   ├── dataSources/
│   │   ├── macro.ts                # Macro calendar fetcher
│   │   ├── earnings.ts             # Earnings fetcher
│   │   ├── movers.ts               # Gainers/losers fetcher
│   │   └── options.ts              # Options activity fetcher
│   ├── buildDailyReport.ts         # Orchestrates all fetchers, normalizes, upserts to Mongo
│   └── types.ts                    # Shared TS types for report shape
├── vercel.json                     # Cron schedule config
├── .env.local.example
└── README.md
```

---

## 6. API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/cron` | GET | Called by Vercel Cron on schedule; triggers `buildDailyReport()` |
| `/api/refresh` | POST | Manual refresh trigger; same logic, callable from UI button |
| `/api/report/[date]` | GET | Returns cached report for a given date from Mongo |

`vercel.json` cron config example (schedule TBD — e.g. once pre-market, once post-market):
```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "0 11 * * 1-5" },
    { "path": "/api/cron", "schedule": "0 21 * * 1-5" }
  ]
}
```

---

## 7. Data Sources (to finalize/evaluate during build)

- **Movers / market cap:** Polygon.io, Finnhub, or Alpha Vantage
- **Earnings calendar:** Finnhub or Nasdaq earnings API
- **Macro calendar:** FRED (actuals) + a scheduled-events source (Trading Economics or similar)
- **Options data:** Tradier, ORATS, or Polygon options add-on

Agents should confirm current pricing/rate limits before locking in a provider, since this can change.

---

## 8. Build Phases

1. **Skeleton:** Next.js app on Vercel, Mongo connection, basic layout with tabs
2. **Cron + one data source:** Get macro calendar working end-to-end (fetch → normalize → store → display) before adding others
3. **Add movers + earnings** into the same daily report pipeline
4. **Add options layer**
5. **Manual refresh button** wired to `/api/refresh`
6. **Fallback lazy-fetch:** if no report exists for today when a user loads the app, trigger fetch with lock
7. **Polish:** status banner (shows which sources succeeded/failed today), historical view via `/history/[date]`

---

## 9. Non-Goals / Deferred

- Auth/bot prevention — deferred for now, revisit later if needed
- Real-time/intraday updates — daily snapshot only for v1
- Per-user customization/preferences — single shared view for all friends in v1

---

## 10. Open Items for Build Agents to Flag Back

- Final choice of data providers + API keys needed
- Exact cron schedule (pre-market / post-market times, timezone handling)
- Whether manual refresh is open to all users or restricted
- Mongo Atlas connection string / env var setup