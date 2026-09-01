import { NextResponse } from "next/server";

import { buildHistoryEntry, type DailyReport, type DailyReportHistoryEntry } from "@/lib/market-report";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const parsed = value ? Number.parseInt(value, 10) : 5;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }

  return Math.min(parsed, 20);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  const database = await getDatabase();

  const reports = await database
    .collection("dailyReports")
    .find({}, { projection: { _id: 0 } })
    .sort({ refreshedAt: -1, date: -1 })
    .limit(limit)
    .toArray();

  const history: DailyReportHistoryEntry[] = reports.map((report) => buildHistoryEntry(report as unknown as DailyReport));

  return NextResponse.json({ history });
}