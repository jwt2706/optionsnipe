import { NextResponse } from "next/server";

import { buildLiveDailyReport } from "@/lib/free-market-api";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET() {
  const date = todayKey();

  try {
    const database = await getDatabase();
    const existingReport = await database.collection("dailyReports").findOne({ date }, { projection: { _id: 0 } });

    if (existingReport) {
      return NextResponse.json(existingReport);
    }

    const liveReport = await buildLiveDailyReport();
    await database.collection("dailyReports").insertOne(liveReport);

    return NextResponse.json(liveReport, { status: 201 });
  } catch {
    const liveReport = await buildLiveDailyReport().catch(() => null);

    if (liveReport) {
      return NextResponse.json(liveReport, { status: 200 });
    }

    return NextResponse.json({ error: "Live market data and database are both unavailable" }, { status: 503 });
  }
}