import mongoose, { type Mongoose } from "mongoose";
import "server-only";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/resumy-ai";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
  dbName: string | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose: MongooseCache | undefined;
};

let cached = globalWithMongoose.mongoose;

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null, dbName: null };
}

function resolveDbName(explicit?: string): string {
  if (explicit) return explicit;
  // Test-only override. Ignored in production so a stray variable on the
  // hosting platform can never redirect production traffic.
  if (process.env.NODE_ENV !== "production") {
    const testName = (process.env.TEST_MONGODB_DB_NAME ?? "").trim();
    if (testName) return testName;
  }
  return "Resumy";
}

async function connectToDatabase(dbName?: string): Promise<Mongoose> {
  // Check if cached exists (satisfies TS narrowing)
  if (!cached) {
    cached = globalWithMongoose.mongoose = { conn: null, promise: null, dbName: null };
  }

  const currentCache = cached;
  const wanted = resolveDbName(dbName);

  // A cached connection to a different database must not be reused.
  // Production uses a single database per process, so this path only
  // triggers in tests that switch databases.
  if (currentCache.conn && currentCache.dbName !== wanted) {
    await mongoose.disconnect();
    currentCache.conn = null;
    currentCache.promise = null;
    currentCache.dbName = null;
  }

  // 1. If we have an existing connection to the wanted database, return it.
  if (currentCache.conn && currentCache.dbName === wanted) {
    return currentCache.conn;
  }

  // 2. If we don't have a connection promise, create one
  if (!currentCache.promise) {
    const opts = {
      bufferCommands: false,
      dbName: wanted
    };

    currentCache.dbName = wanted;
    currentCache.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("MongoDB Connected Successfully");
        return m;
      })
      .catch((error) => {
        // If connection fails, clear the promise so the next attempt can try again
        currentCache.promise = null;
        currentCache.dbName = null;
        console.error("MongoDB Connection Error:", error);
        throw error;
      });
  }

  // 3. Await the promise and cache the connection
  try {
    currentCache.conn = await currentCache.promise;
  } catch (e) {
    currentCache.promise = null;
    currentCache.dbName = null;
    throw e;
  }

  return currentCache.conn;
}

export default connectToDatabase;
