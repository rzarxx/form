import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

// Prevent multiple connections in development due to hot-reloading
const globalForDb = global as unknown as {
  sql: postgres.Sql | undefined;
};

const getSqlClient = () => {
  if (!connectionString) {
    console.warn(
      "WARNING: DATABASE_URL or POSTGRES_URL is not set. Database queries will fail."
    );
    // Return a mock function that throws a descriptive error when called
    const mockSql = (() => {
      throw new Error(
        "Database connection string is missing. Please set DATABASE_URL or POSTGRES_URL in your environment variables."
      );
    }) as unknown as postgres.Sql;
    return mockSql;
  }

  // Use SSL for remote databases (like Vercel Postgres, Supabase, Neon)
  // Disable rejectUnauthorized to prevent certificate validation errors on serverless databases
  const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  const options: postgres.Options<{}> = {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  };

  if (!isLocalhost) {
    options.ssl = { rejectUnauthorized: false };
  }

  return postgres(connectionString, options);
};

export const sql = globalForDb.sql ?? getSqlClient();

if (process.env.NODE_ENV !== "production" && connectionString) {
  globalForDb.sql = sql;
}
