import { NextResponse } from "next/server";

import { buildLiveDailyReport } from "@/lib/free-market-api";
import { createSeedDailyReport, todayKey } from "@/lib/market-report";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const date = todayKey();

  try {
    const database = await getDatabase();
    const existingReport = await database.collection("dailyReports").findOne({ date }, { projection: { _id: 0 } });

    if (existingReport) {
      return NextResponse.json({
        ...existingReport,
        source: existingReport.source ?? "mixed",
      });
    }

    const liveReport = await buildLiveDailyReport();
    await database.collection("dailyReports").insertOne(liveReport);

    return NextResponse.json(liveReport, { status: 201 });
  } catch {
    return NextResponse.json(createSeedDailyReport(), { status: 200 });
  }
}
