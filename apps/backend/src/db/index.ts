// Database connection using Drizzle ORM + postgres.js
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { env } from '../config/env.js';

// Create postgres.js client
const client = postgres(env.DATABASE_URL, {
  max: env.isProduction ? 20 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle instance with full schema
export const db = drizzle(client, { schema });

// Export client for graceful shutdown
export { client };