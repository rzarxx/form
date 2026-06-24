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

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        openrouter_api_key TEXT,
        openrouter_model TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `;

    // Add user_id to forms
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `;

    // Add premium status columns to users
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'openrouter';
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_model TEXT;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_model TEXT;
    `;

    // Add paid form columns to forms
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS is_paid_form BOOLEAN DEFAULT FALSE;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS form_price INT DEFAULT 0;
    `;
    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS form_payment_description TEXT;
    `;

    // Create transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
        reference VARCHAR(100) UNIQUE NOT NULL,
        tripay_reference VARCHAR(100),
        payment_method VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(50) DEFAULT 'unpaid',
        type VARCHAR(50) NOT NULL,
        payer_name VARCHAR(255),
        payer_email VARCHAR(255),
        ip_address VARCHAR(45),
        form_response_answers JSONB,
        form_response_id INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
    `;

    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS ai_insights TEXT;
    `;

    await sql`
      ALTER TABLE forms ADD COLUMN IF NOT EXISTS ai_insights_updated_at TIMESTAMP WITH TIME ZONE;
    `;

    // MIGRATION: Creator Balance & Withdrawal System
    await sql`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform_commission INT DEFAULT 0;
    `;
    await sql`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS creator_amount INT DEFAULT 0;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS balances (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance INT DEFAULT 0,
        total_earned INT DEFAULT 0,
        total_withdrawn INT DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount INT NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `;

    await sql`
      INSERT INTO settings (key, value)
      VALUES ('platform_commission_percent', '5')
      ON CONFLICT (key) DO NOTHING;
    `;

    isInitialized = true;
    console.log("Database initialization check completed successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    // Don't flip isInitialized to true so it retries on next call
    throw error;
  }
}
