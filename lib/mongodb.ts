import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __mongoDatabasePromise: Promise<Db> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;
let indexesPromise: Promise<void> | null = null;

const clientOptions: MongoClientOptions = {
  tls: true,
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
};

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// Logs the host/db only, never the credentials in the URI.
function redactUri(uri: string) {
  try {
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "https://"));
    return `mongodb${uri.startsWith("mongodb+srv") ? "+srv" : ""}://${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "<unparseable MONGODB_URI>";
  }
}

function logMongoError(context: string, error: unknown) {
  console.error(`[mongodb] ${context}: ${describeError(error)}`);
}

async function ensureIndexes(db: Db) {
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      db.collection("dailyReports").createIndex({ date: 1 }, { unique: true }),
      db.collection("refreshLocks").createIndex({ date: 1 }, { unique: true }),
    ])
      .then(() => undefined)
      .catch((error) => {
        logMongoError("failed to create indexes", error);
        indexesPromise = null; // allow retry on next call
        throw error;
      });
  }

  await indexesPromise;
}

export async function getDatabase() {
  if (!globalThis.__mongoDatabasePromise) {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      const error = new Error(
        "Missing MONGODB_URI environment variable. Set it in Vercel → Project → Settings → Environment Variables " +
          "for the environment you're testing (Production/Preview/Development), then redeploy.",
      );
      logMongoError("configuration error", error);
      throw error;
    }

    console.log(`[mongodb] connecting to ${redactUri(uri)}`);

    if (!clientPromise) {
      const connectionPromise = (globalThis.__mongoClientPromise ?? new MongoClient(uri, clientOptions).connect()).catch(
        (error: unknown) => {
          logMongoError("connection failed (check Atlas Network Access + credentials)", error);
          throw error;
        },
      );

      clientPromise = connectionPromise.catch((error) => {
        // Clear the cache on failure so the NEXT request retries instead of reusing a dead promise.
        clientPromise = undefined;
        globalThis.__mongoClientPromise = undefined;
        throw error;
      });

      globalThis.__mongoClientPromise = clientPromise;
    }

    globalThis.__mongoDatabasePromise = clientPromise
      .then(async (connectedClient) => {
        const configuredDatabase = process.env.MONGODB_DB;
        const database = configuredDatabase ? connectedClient.db(configuredDatabase) : connectedClient.db();
        await ensureIndexes(database);
        console.log("[mongodb] connected and indexes ready");
        return database;
      })
      .catch((error) => {
        // Critical: clear this too, or every future call replays the same dead promise forever.
        globalThis.__mongoDatabasePromise = undefined;
        logMongoError("failed to resolve database", error);
        throw error;
      });
  }

  return globalThis.__mongoDatabasePromise;
}