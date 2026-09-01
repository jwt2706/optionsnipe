import { NextResponse } from "next/server";

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
  const database = await getDatabase();
  const report = await database.collection("dailyReports").findOne({ date }, { projection: { _id: 0 } });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
