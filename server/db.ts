/**
 * Database connection for server-side usage.
 * This project is a frontend-only React SPA that communicates with
 * Supabase Edge Functions for all backend operations.
 * This file provides a Postgres connection if server-side scripts are needed.
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
