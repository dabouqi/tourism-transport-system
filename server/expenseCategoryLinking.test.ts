import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { transactions, expenseCategories } from "../drizzle/schema";

describe("Expense Category Linking", () => {
  let dbInstance: any;
  let categoryId: number;

  beforeAll(async () => {
    dbInstance = await db.getDb();
    expect(dbInstance).toBeDefined();

    // Get first expense category
    const categories = await dbInstance.select().from(expenseCategories).limit(1);
    if (categories.length > 0) {
      categoryId = categories[0].id;
    }
  });

  it("should create a transaction with expenseCategoryId", async () => {
    if (!dbInstance || !categoryId) {
      console.log("Skipping test - no database or category");
      return;
    }

    const result = await dbInstance
      .insert(transactions)
      .values({
        transactionType: "expense",
        category: "وقود",
        expenseCategoryId: categoryId,
        amount: "150.00",
        description: "وقود السيارة",
        transactionDate: new Date(),
        isFromBooking: false,
      })
      .returning();

    expect(result).toBeDefined();
    expect(result[0]).toBeDefined();
    expect(result[0].expenseCategoryId).toBe(categoryId);
    expect(result[0].transactionType).toBe("expense");
  });

  it("should update transaction with expenseCategoryId", async () => {
    if (!dbInstance || !categoryId) {
      console.log("Skipping test - no database or category");
      return;
    }

    // Create a transaction first
    const created = await dbInstance
      .insert(transactions)
      .values({
        transactionType: "expense",
        category: "صيانة",
        amount: "500.00",
        description: "صيانة المحرك",
        transactionDate: new Date(),
        isFromBooking: false,
      })
      .returning();

    const transactionId = created[0].id;

    // Update with expenseCategoryId
    const updated = await dbInstance
      .update(transactions)
      .set({ expenseCategoryId: categoryId })
      .where(transactions.id === transactionId)
      .returning();

    expect(updated[0].expenseCategoryId).toBe(categoryId);
  });

  it("should retrieve transaction with expenseCategoryId", async () => {
    if (!dbInstance || !categoryId) {
      console.log("Skipping test - no database or category");
      return;
    }

    // Create a transaction
    const created = await dbInstance
      .insert(transactions)
      .values({
        transactionType: "expense",
        category: "غسيل",
        expenseCategoryId: categoryId,
        amount: "75.00",
        description: "غسيل السيارة",
        transactionDate: new Date(),
        isFromBooking: false,
      })
      .returning();

    const transactionId = created[0].id;

    // Retrieve the transaction
    const retrieved = await dbInstance
      .select()
      .from(transactions)
      .where(transactions.id === transactionId)
      .limit(1);

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].expenseCategoryId).toBe(categoryId);
    expect(retrieved[0].category).toBe("غسيل");
  });

  it("should handle null expenseCategoryId", async () => {
    if (!dbInstance) {
      console.log("Skipping test - no database");
      return;
    }

    const result = await dbInstance
      .insert(transactions)
      .values({
        transactionType: "expense",
        category: "أخرى",
        expenseCategoryId: null,
        amount: "100.00",
        description: "مصروف متنوع",
        transactionDate: new Date(),
        isFromBooking: false,
      })
      .returning();

    expect(result[0].expenseCategoryId).toBeNull();
  });

  it("should filter transactions by expenseCategoryId", async () => {
    if (!dbInstance || !categoryId) {
      console.log("Skipping test - no database or category");
      return;
    }

    // Create multiple transactions with different categories
    await dbInstance
      .insert(transactions)
      .values({
        transactionType: "expense",
        category: "وقود",
        expenseCategoryId: categoryId,
        amount: "200.00",
        description: "وقود",
        transactionDate: new Date(),
        isFromBooking: false,
      });

    // Query transactions by expenseCategoryId
    const filtered = await dbInstance
      .select()
      .from(transactions)
      .where(transactions.expenseCategoryId === categoryId)
      .limit(10);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((t: any) => t.expenseCategoryId === categoryId)).toBe(true);
  });
});
