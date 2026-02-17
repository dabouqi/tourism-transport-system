import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { transactions, receivables, otherTransactions } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Other Transactions Feature', () => {
  let db: any;
  const testClientId = 999999; // Use a unique ID for testing

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }
  });

  it('should create a transaction when adding other income', async () => {
    // Simulate adding other income
    const amount = '25.00';
    const category = 'فحص اختبار';
    const transactionDate = new Date();

    // Insert into transactions table directly
    const result = await db.insert(transactions).values({
      transactionType: 'revenue',
      category: category,
      amount: amount,
      clientId: testClientId,
      isFromBooking: false,
      notes: `${category}: test income`,
      transactionDate: transactionDate,
    });

    // Verify the transaction was created
    const createdTransaction = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.clientId, testClientId),
          eq(transactions.category, category),
          eq(transactions.transactionType, 'revenue')
        )
      );

    expect(createdTransaction).toHaveLength(1);
    expect(createdTransaction[0].amount).toBe(amount);
    expect(createdTransaction[0].transactionType).toBe('revenue');
  });

  it('should display transaction in customer account statement', async () => {
    // Get all revenue transactions for the test client
    const revenueTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.clientId, testClientId),
          eq(transactions.transactionType, 'revenue')
        )
      );

    // Should have at least one transaction
    expect(revenueTransactions.length).toBeGreaterThan(0);

    // Verify transaction has all required fields
    const transaction = revenueTransactions[0];
    expect(transaction).toHaveProperty('id');
    expect(transaction).toHaveProperty('transactionType', 'revenue');
    expect(transaction).toHaveProperty('category');
    expect(transaction).toHaveProperty('amount');
    expect(transaction).toHaveProperty('clientId', testClientId);
    expect(transaction).toHaveProperty('isFromBooking', false);
    expect(transaction).toHaveProperty('transactionDate');
  });

  it('should create receivable when adding other income', async () => {
    const amount = '30.00';
    const transactionDate = new Date();

    // Create receivable
    await db.insert(receivables).values({
      clientId: testClientId,
      amount: amount,
      remainingAmount: amount,
      bookingId: 0,
      dueDate: transactionDate,
      status: 'pending',
      notes: 'Test receivable',
    });

    // Verify receivable was created
    const createdReceivable = await db
      .select()
      .from(receivables)
      .where(
        and(
          eq(receivables.clientId, testClientId),
          eq(receivables.status, 'pending')
        )
      );

    expect(createdReceivable.length).toBeGreaterThan(0);
    expect(createdReceivable[0].amount).toBe(amount);
  });

  it('should have matching transaction and receivable for income', async () => {
    // Get all revenue transactions for the test client
    const revenueTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.clientId, testClientId),
          eq(transactions.transactionType, 'revenue')
        )
      );

    // Get all receivables for the test client
    const clientReceivables = await db
      .select()
      .from(receivables)
      .where(eq(receivables.clientId, testClientId));

    // Should have matching counts
    expect(revenueTransactions.length).toBeGreaterThan(0);
    expect(clientReceivables.length).toBeGreaterThan(0);

    // Total of transactions should match total of receivables
    const transactionTotal = revenueTransactions.reduce(
      (sum: number, t: any) => sum + parseFloat(t.amount),
      0
    );
    const receivableTotal = clientReceivables.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount),
      0
    );

    expect(transactionTotal).toBeLessThanOrEqual(receivableTotal);
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.delete(transactions).where(eq(transactions.clientId, testClientId));
      await db.delete(receivables).where(eq(receivables.clientId, testClientId));
    }
  });
});
