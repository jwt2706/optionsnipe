import { NextResponse } from "next/server";

import { createEmptyDailyReport } from "@/lib/market-report";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    date: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { date } = await context.params;
  try {
    const database = await getDatabase();
    const report = await database.collection("dailyReports").findOne({ date }, { projection: { _id: 0 } });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...report,
      source: report.source ?? "mixed",
    });
  } catch {
    return NextResponse.json(
      {
        ...createEmptyDailyReport(new Date(`${date}T12:00:00Z`)),
        warning: "Database unavailable; returning seed fallback data.",
      },
      { status: 200 },
    );
  }
}
