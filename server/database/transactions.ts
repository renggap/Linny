/**
 * @fileoverview Database transaction support
 * @description Wraps database operations in transactions with rollback support
 * @module transactions
 */

import { DatabaseManager } from '../database.js';

/**
 * Transaction options
 */
export interface TransactionOptions {
    /**
     * Whether to automatically commit on success
     * @default true
     */
    autoCommit?: boolean;

    /**
     * Whether to automatically rollback on error
     * @default true
     */
    autoRollback?: boolean;
}

/**
 * Transaction context
 */
export interface TransactionContext {
    /**
     * Execute SQL within transaction
     */
    run: (sql: string, params?: any[]) => any;

    /**
     * Get single row
     */
    get: (sql: string, params?: any[]) => any;

    /**
     * Get all rows
     */
    all: (sql: string, params?: any[]) => any[];

    /**
     * Commit transaction
     */
    commit: () => Promise<void>;

    /**
     * Rollback transaction
     */
    rollback: () => Promise<void>;
}

/**
 * Transaction error
 */
export class TransactionError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'TransactionError';
    }
}

/**
 * Execute operations within a transaction
 * @param db - Database instance
 * @param operations - Function to execute within transaction
 * @param options - Transaction options
 * @returns Promise with result of operations
 * @throws {TransactionError} If transaction fails
 */
export async function withTransaction<T>(
    db: DatabaseManager,
    operations: (tx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
): Promise<T> {
    const { autoCommit = true, autoRollback = true } = options;

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    // Create transaction context
    const tx: TransactionContext = {
        run: (sql: string, params: any[] = []) => {
            const result = db.run(sql, params);
            if (!result) {
                throw new TransactionError(`Transaction failed: ${sql}`);
            }
            return result;
        },
        get: (sql: string, params: any[] = []) => {
            const result = db.get(sql, params);
            return result;
        },
        all: (sql: string, params: any[] = []) => {
            const result = db.all(sql, params);
            return result;
        },
        commit: async () => {
            await db.run('COMMIT');
        },
        rollback: async () => {
            await db.run('ROLLBACK');
        },
    };

    try {
        // Execute operations
        const result = await operations(tx);

        // Auto-commit if enabled
        if (autoCommit) {
            await tx.commit();
        }

        return result;
    } catch (error) {
        // Auto-rollback if enabled
        if (autoRollback) {
            try {
                await tx.rollback();
            } catch (rollbackError) {
                console.error('Failed to rollback transaction:', rollbackError);
            }
        }

        throw new TransactionError(
            `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : undefined
        );
    }
}

/**
 * Execute multiple operations in a transaction
 * @param db - Database instance
 * @param operations - Array of operations to execute
 * @returns Promise with array of results
 */
export async function withTransactionMultiple<T>(
    db: DatabaseManager,
    operations: Array<(tx: TransactionContext) => Promise<T>>
): Promise<T[]> {
    return withTransaction(db, async (tx) => {
        const results: T[] = [];
        for (const operation of operations) {
            results.push(await operation(tx));
        }
        return results;
    });
}

/**
 * Execute operations with savepoints
 * Allows partial rollback within transaction
 * @param db - Database instance
 * @param operations - Function to execute with savepoint support
 * @returns Promise with result of operations
 */
export async function withSavepoint<T>(
    db: DatabaseManager,
    operations: (tx: TransactionContext & { savepoint: (name: string) => Promise<void>; rollbackTo: (name: string) => Promise<void> }) => Promise<T>
): Promise<T> {
    return withTransaction(db, async (tx) => {
        const txWithSavepoint = {
            ...tx,
            savepoint: async (name: string) => {
                await tx.run(`SAVEPOINT ${name}`);
            },
            rollbackTo: async (name: string) => {
                await tx.run(`ROLLBACK TO SAVEPOINT ${name}`);
            },
        };

        return operations(txWithSavepoint);
    });
}

export default withTransaction;
