import { NextResponse } from "next/server";

import { createSeedDailyReport } from "@/lib/market-report";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ date: string }>;
};

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(_request: Request, context: RouteContext) {
  const { date } = await context.params;

  try {
    const database = await getDatabase();
    const report = await database.collection("dailyReports").findOne({ date }, { projection: { _id: 0 } });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    const message = describeError(error);
    console.error(`[api/reports/${date}] database read failed: ${message}`);

    return NextResponse.json(
      {
        ...createSeedDailyReport(new Date(`${date}T12:00:00Z`)),
        status: "failed" as const, // triggers the existing "Market data failed" toast in page.tsx
        debugError: message,
      },
      { status: 200 },
    );
  }
}