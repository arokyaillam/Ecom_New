// Shared database types for the repository pattern
// Provides a unified type that accepts both the main db instance
// and transaction objects from db.transaction() callbacks.
import { db } from '../../db/index.js';

// Extracts the transaction type from the db.transaction() callback parameter.
// This ensures we always match the exact type that Drizzle expects,
// regardless of which Drizzle version or driver is used.
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// DbOrTx represents either the main database instance or an active transaction.
// Repository methods accept this type as an optional parameter so that
// service-layer code can pass a transaction context when multiple
// operations must be atomic.
export type DbOrTx = typeof db | Transaction;