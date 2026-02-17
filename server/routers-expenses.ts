import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { expenses, drivers, expensePayments, financialSummaries, expenseCategories, transactions } from "../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export const expensesRouter = router({
  // Create a new expense
  create: protectedProcedure
    .input(
      z.object({
        driverId: z.string(),
        amount: z.number().positive(),
        expenseType: z.enum(["fuel", "parking", "toll", "maintenance", "other"]),
        description: z.string().optional(),
        bookingId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(expenses).values({
        driverId: input.driverId,
        amount: input.amount.toString(),
        expenseType: input.expenseType,
        description: input.description,
        bookingId: input.bookingId,
      });

      return { success: true };
    }),

  // Get all expenses with filtering
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "paid"]).optional(),
        driverId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(expenses);
      const conditions = [];

      if (input.status) {
        conditions.push(eq(expenses.status, input.status));
      }
      if (input.driverId) {
        conditions.push(eq(expenses.driverId, input.driverId));
      }
      if (input.startDate) {
        conditions.push(gte(expenses.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(expenses.createdAt, input.endDate));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query.orderBy(desc(expenses.createdAt));

      return result.map((expense) => ({
        ...expense,
        amount: parseFloat(expense.amount),
      }));
    }),

  // Get expenses by status
  getByStatus: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected", "paid"]) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(expenses)
        .where(eq(expenses.status, input.status))
        .orderBy(desc(expenses.createdAt));

      return result.map((expense) => ({
        ...expense,
        amount: parseFloat(expense.amount),
      }));
    }),

  // Approve an expense
  approve: protectedProcedure
    .input(
      z.object({
        expenseId: z.string(),
        paymentMethod: z.enum(["cash", "salary_deduction", "bank_transfer"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(expenses)
        .set({
          status: "approved",
          paymentMethod: input.paymentMethod,
          approvedBy: ctx.user?.id?.toString(),
          approvedAt: new Date(),
        })
        .where(eq(expenses.id, input.expenseId));

      return { success: true };
    }),

  // Reject an expense
  reject: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(expenses)
        .set({ status: "rejected" })
        .where(eq(expenses.id, input.expenseId));

      return { success: true };
    }),

  // Mark as paid (deprecated - use recordPayment instead)
  markAsPaid: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(expenses)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(expenses.id, input.expenseId));

      return { success: true };
    }),

  // Update an expense
  update: protectedProcedure
    .input(
      z.object({
        expenseId: z.string(),
        amount: z.number().positive().optional(),
        expenseType: z.enum(["fuel", "parking", "toll", "maintenance", "other"]).optional(),
        description: z.string().optional(),
        bookingId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};
      if (input.amount !== undefined) updateData.amount = input.amount.toString();
      if (input.expenseType) updateData.expenseType = input.expenseType;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.bookingId !== undefined) updateData.bookingId = input.bookingId;

      await db
        .update(expenses)
        .set(updateData)
        .where(eq(expenses.id, input.expenseId));

      return { success: true };
    }),

  // Delete an expense
  delete: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(expenses).where(eq(expenses.id, input.expenseId));

      return { success: true };
    }),

  // Record payment for an expense
  recordPayment: protectedProcedure
    .input(
      z.object({
        expenseId: z.string(),
        paymentDate: z.date(),
        paymentMethod: z.enum(["cash", "salary_deduction", "bank_transfer"]),
        amount: z.number().positive(),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the expense to get its details
      const expense = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, input.expenseId))
        .limit(1);

      if (!expense || expense.length === 0) {
        throw new Error("Expense not found");
      }

      const expenseData = expense[0];

      // Insert payment record
      await db.insert(expensePayments).values({
        expenseId: input.expenseId,
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod,
        amount: input.amount.toString(),
        referenceNumber: input.referenceNumber,
        notes: input.notes,
        recordedBy: ctx.user?.id?.toString() || "unknown",
      });

      // Create transaction record in المصاريف والدخل
      await db.insert(transactions).values({
        transactionType: "expense",
        category: expenseData.expenseType,
        amount: input.amount.toString(),
        description: input.notes || `Payment for ${expenseData.expenseType}`,
        transactionDate: input.paymentDate,
      });

      // Update expense status to paid
      await db
        .update(expenses)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(expenses.id, input.expenseId));

      return { success: true };
    }),

  getPayments: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(expensePayments)
        .where(eq(expensePayments.expenseId, input.expenseId))
        .orderBy(desc(expensePayments.createdAt));

      return result.map((payment) => ({
        ...payment,
        amount: parseFloat(payment.amount),
      }));
    }),

  getCategories: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db
        .select()
        .from(expenseCategories)
        .orderBy(expenseCategories.name);

      return result;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }),

  getByDriver: protectedProcedure
    .input(z.object({ driverId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(expenses)
        .where(eq(expenses.driverId, input.driverId))
        .orderBy(desc(expenses.createdAt));

      return result.map((expense) => ({
        ...expense,
        amount: parseFloat(expense.amount),
      }));
    }),

  getSummary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const result = await db
      .select()
      .from(financialSummaries)
      .where(and(
        eq(financialSummaries.year, year),
        eq(financialSummaries.month, month)
      ))
      .limit(1);

    return result[0] || { totalExpenses: "0", netProfit: "0", totalRevenue: "0" };
  }),
});
