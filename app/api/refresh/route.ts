import { NextResponse } from "next/server";

import { buildLiveDailyReport } from "@/lib/free-market-api";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refreshCooldownMinutes = 3;

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function resolveRequestedDate(request: Request) {
  try {
    const payload = (await request.json()) as { date?: string } | null;
    const date = payload?.date;

    return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey();
  } catch {
    return todayKey();
  }
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request) {
  const now = new Date();
  const date = await resolveRequestedDate(request);

  const refreshedAt = now.toISOString();
  const lockedUntil = new Date(now.getTime() + refreshCooldownMinutes * 60 * 1000).toISOString();
  const report = await buildLiveDailyReport(new Date(`${date}T12:00:00Z`));

  try {
    const database = await getDatabase();
    const locks = database.collection("refreshLocks");
    const currentLock = await locks.findOne({ date }, { projection: { _id: 0 } });

    if (currentLock?.lockedUntil && new Date(currentLock.lockedUntil) > now) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(currentLock.lockedUntil).getTime() - now.getTime()) / 1000),
      );

      return NextResponse.json(
        { error: "Refresh recently triggered", retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    await Promise.all([
      database.collection("dailyReports").updateOne(
        { date },
        { $set: report },
        { upsert: true },
      ),
      locks.updateOne(
        { date },
        {
          $set: { date, lockedUntil, updatedAt: refreshedAt },
          $setOnInsert: { createdAt: refreshedAt },
        },
        { upsert: true },
      ),
    ]);
  } catch (error) {
    const message = describeError(error);
    console.error(`[api/refresh] database write failed for date=${date}: ${message}`);

    return NextResponse.json(
      {
        report,
        lockedUntil,
        warning: "Database unavailable; report was not persisted.",
        debugError: message,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ report, lockedUntil }, { status: 200 });
}