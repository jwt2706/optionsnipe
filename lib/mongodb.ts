import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __mongoDatabasePromise: Promise<Db> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

let indexesPromise: Promise<void> | null = null;

async function ensureIndexes(db: Db) {
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      db.collection("dailyReports").createIndex({ date: 1 }, { unique: true }),
      db.collection("refreshLocks").createIndex({ date: 1 }, { unique: true }),
    ]).then(() => undefined);
  }

  await indexesPromise;
}

export async function getDatabase() {
  if (!globalThis.__mongoDatabasePromise) {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("Missing MONGODB_URI environment variable");
    }

    if (!clientPromise) {
      clientPromise = globalThis.__mongoClientPromise ?? new MongoClient(uri).connect();

      if (process.env.NODE_ENV !== "production") {
        globalThis.__mongoClientPromise = clientPromise;
      }
    }

    globalThis.__mongoDatabasePromise = clientPromise.then(async (connectedClient) => {
      const configuredDatabase = process.env.MONGODB_DB;
      const database = configuredDatabase ? connectedClient.db(configuredDatabase) : connectedClient.db();
      await ensureIndexes(database);
      return database;
    });
  }

  return globalThis.__mongoDatabasePromise;
}
