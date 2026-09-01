import { NextResponse } from "next/server";

import { buildLiveDailyReport } from "@/lib/free-market-api";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refreshCooldownMinutes = 3;

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function POST() {
  const database = await getDatabase();
  const now = new Date();
  const date = todayKey(now);
  const locks = database.collection("refreshLocks");
  const currentLock = await locks.findOne({ date }, { projection: { _id: 0 } });

  if (currentLock?.lockedUntil && new Date(currentLock.lockedUntil) > now) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(currentLock.lockedUntil).getTime() - now.getTime()) / 1000),
    );

    return NextResponse.json(
      {
        error: "Refresh recently triggered",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  const refreshedAt = now.toISOString();
  const lockedUntil = new Date(now.getTime() + refreshCooldownMinutes * 60 * 1000).toISOString();
  const report = await buildLiveDailyReport(now);

  await Promise.all([
    database.collection("dailyReports").updateOne(
      { date },
      {
        $set: report,
        $setOnInsert: {
          date,
        },
      },
      { upsert: true },
    ),
    locks.updateOne(
      { date },
      {
        $set: {
          date,
          lockedUntil,
          updatedAt: refreshedAt,
        },
        $setOnInsert: {
          createdAt: refreshedAt,
        },
      },
      { upsert: true },
    ),
  ]);

  return NextResponse.json(
    {
      report,
      lockedUntil,
    },
    { status: 200 },
  );
}
