import { sql } from "./db";

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;

  try {
    // Check connection first, then create tables
    console.log("Initializing database tables if not exist...");

    // Create forms table
    // Using gen_random_uuid() for PostgreSQL 13+
    await sql`
      CREATE TABLE IF NOT EXISTS forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        fields JSONB NOT NULL
      );
    `;

    // Create form_responses table
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS banner_url TEXT;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS max_responses INT DEFAULT 0;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS form_responses (
        id SERIAL PRIMARY KEY,
        form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        answers JSONB NOT NULL
      );
    `;
    await sql`
      ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS custom_success_message TEXT;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS redirect_url TEXT;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS notify_email VARCHAR(255);
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS limit_one_per_ip BOOLEAN DEFAULT FALSE;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS max_total_responses INT DEFAULT 0;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS access_password VARCHAR(255);
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS webhook_url TEXT;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS enable_turnstile BOOLEAN DEFAULT FALSE;
    `;

    // Create settings table
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    isInitialized = true;
    console.log("Database initialization check completed successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    // Don't flip isInitialized to true so it retries on next call
    throw error;
  }
}
