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
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose: MongooseCache | undefined;
};

let cached = globalWithMongoose.mongoose;

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null };
}

async function connectToDatabase(): Promise<Mongoose> {
  // Check if cached exists (satisfies TS narrowing)
  if (!cached) {
    cached = globalWithMongoose.mongoose = { conn: null, promise: null };
  }

  const currentCache = cached;

  // 1. If we have an existing connection, return it immediately
  if (currentCache.conn) {
    return currentCache.conn;
  }

  // 2. If we don't have a connection promise, create one
  if (!currentCache.promise) {
    const opts = {
      bufferCommands: false,
      dbName: "Resumy"
    };

    currentCache.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("MongoDB Connected Successfully");
        return m;
      })
      .catch((error) => {
        // If connection fails, clear the promise so the next attempt can try again
        currentCache.promise = null;
        console.error("MongoDB Connection Error:", error);
        throw error;
      });
  }

  // 3. Await the promise and cache the connection
  try {
    currentCache.conn = await currentCache.promise;
  } catch (e) {
    currentCache.promise = null;
    throw e;
  }

  return currentCache.conn;
}

export default connectToDatabase;