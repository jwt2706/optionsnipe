import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import { buildLiveDailyReport } from "@/lib/free-market-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const database = await getDatabase();
  const date = todayKey();
  const existingReport = await database.collection("dailyReports").findOne({ date }, { projection: { _id: 0 } });

  if (existingReport) {
    return NextResponse.json(existingReport);
  }

  const liveReport = await buildLiveDailyReport();
  await database.collection("dailyReports").insertOne(liveReport);

  return NextResponse.json(liveReport, { status: 201 });
}
