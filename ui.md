# Market Scout — UI / Design Spec

Purpose: a single-page daily dashboard that feels like a briefing, not a spreadsheet. Fast to scan in 10 seconds, but rewarding to dig into. Dark, dense-but-clean, data-forward. Think terminal-meets-editorial — not another generic SaaS dashboard with cards and pastel gradients.

---

## 1. Design Direction

- **Mood:** minimal, confident, a little "trading terminal" energy but not cluttered. Dark mode as default/primary.
- **Typography does the heavy lifting.** A tight monospace or semi-mono for numbers/tickers (e.g. JetBrains Mono, IBM Plex Mono) paired with a clean grotesk for headers/labels (e.g. Inter, Geist). Numbers in mono make tables actually scannable — this matters more than any color choice.
- **Color is a signal, not decoration.** Base palette near-black background, off-white text, one accent color for interactive elements. Green/red reserved strictly for gains/losses — don't use green/red anywhere else or they lose meaning.
- **No card-soup.** Avoid wrapping everything in identical rounded-corner cards with drop shadows — that's the generic-dashboard look. Use whitespace, thin hairline dividers, and typographic hierarchy to separate sections instead of boxes.
- **Motion is minimal and purposeful:** numbers can subtly flash/fade when data refreshes, tabs slide underline on change, nothing bounces or spins for attention.

---

## 2. Page Layout (top to bottom)

### Header bar (sticky, thin)
- Left: app name/wordmark, small — "Market Scout" or similar, understated, not logo-heavy
- Center or left-adjacent: **today's date** + a small status dot (green = data fresh, amber = partial, red = failed) with the last-fetched timestamp on hover
- Right: **Refresh button** (icon + label, e.g. a small circular-arrow icon) — shows a subtle loading spin state when triggered, disabled/greyed with tooltip if a refresh happened <X minutes ago
- Right-most: link/toggle to **History** view

### Hero strip — "Today at a Glance"
Right under the header, before any tabs. This is the 10-second scan:
- A single horizontal row of 3–5 key stat chips: e.g. "CPI: 8:30 AM · Consensus 3.1%", "FOMC: no meeting today" or countdown to next one, "Top mover: NVDA +6.2%"
- These are the highest-signal facts of the day, pulled to the top so you don't need to click into tabs just to know "is anything big happening today"
- Keep this to one line if possible on desktop; wrap gracefully on mobile

### Section tabs
Four tabs, underline-style (not boxed pill buttons): **Calendar · Earnings · Movers · Options**
- Tab bar should be sticky just below the hero strip when scrolling
- Active tab gets the accent-color underline + brighter text; inactive tabs dimmed

---

## 3. Section-by-Section Content

### Calendar tab
- Vertical timeline layout, chronological by time of day, not a table — this is the one section where a timeline metaphor beats a grid
- Each event as a row: time on the left (mono font), event name + category tag in the middle, consensus/previous/actual as three small aligned figures on the right
- Once "actual" comes in, show the surprise delta with a small up/down arrow colored green/red
- Group by rough time-of-day if there are many events (Pre-market / Market hours / After close)

### Earnings tab
- Table, sortable by market cap (default sort: descending) — this is explicitly requested, make the market cap column prominent
- Columns: Ticker · Company · Market Cap · Report Time (BMO/AMC badge) · EPS Est vs Actual · Rev Est vs Actual
- EPS/Rev "beat or miss" shown as green/red delta, not just raw numbers side by side
- Sticky column header on scroll
- Market cap filter control (dropdown or segmented control: All / >$10B / >$100B) pinned above the table

### Movers tab
- Two side-by-side columns on desktop (Gainers | Losers), stacked on mobile
- Same market cap filter control as Earnings, shared state if user expects consistency across tabs (worth deciding — probably yes, one global filter in the header/hero area rather than per-tab)
- Each row: ticker, company name (small/dim), % change (large, bold, colored), $ change (smaller, secondary), tiny volume bar/sparkline if feasible
- Rank number (1, 2, 3...) to the left of each row — reinforces "biggest first"

### Options tab
- Table: Ticker · Unusual Volume (flagged/highlighted if significant) · IV Rank · Put/Call Ratio
- IV Rank shown as a small horizontal bar/gauge (0–100) rather than a bare number — much faster to read at a glance
- Put/call ratio >1 (bearish tilt) vs <1 (bullish tilt) could get a subtle directional color tint

---

## 4. Global/Cross-Cutting Elements

- **Market cap filter:** make this one persistent control (not duplicated per tab) if it should apply globally — e.g. sits in the hero strip or just above the tab bar, affects Earnings/Movers/Options simultaneously
- **Empty/quiet day states:** if there's no major macro event, don't just leave blank space — show something like "No major macro events today" in a muted, calm way, so absence is legible, not confusing
- **Status banner:** if a data source failed to fetch, show a small non-intrusive banner ("Options data unavailable — retry?") rather than silently showing stale/missing data
- **Loading state:** skeleton rows (thin animated grey bars) matching the shape of the eventual table — never a generic spinner in the middle of the page

---

## 5. Responsive Behavior

- Mobile: tabs remain but hero strip stacks vertically; tables become card-per-row (ticker + key numbers stacked) rather than horizontal scroll tables
- Keep the refresh button and status dot visible at all times, even on mobile — it's a small trust signal ("is this data current")

---

## 6. What to Avoid

- No stock-photo hero images, no illustrated empty-states with cartoon characters
- No more than one accent color — resist adding blue AND purple AND green as "brand colors"
- No heavy card shadows/gradients — keep it flat, let typography and spacing create hierarchy
- Don't over-animate — this is a tool people check daily, it should feel calm and fast, not flashy

---

## 7. Reference Feel (for agents/designers to align on tone)

Closer to: Bloomberg Terminal's density + a modern indie SaaS's typographic restraint (think Linear, Vercel's own dashboard, or Arc browser's calm dark UI) — not a colorful consumer fintech app like Robinhood.