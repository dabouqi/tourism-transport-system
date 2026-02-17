// This file contains the new routers for clients, receivables, and payments
// These should be added to the appRouter in routers.ts

import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const clientsRouter = router({
  list: publicProcedure.query(() => db.getClients()),
  
  getAll: publicProcedure.query(() => db.getClients()),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getClientById(input.id)),
  
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["individual", "company"]),
      email: z.string().email().or(z.literal("")).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      taxId: z.string().optional(),
      contactPerson: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createClient(input)),
  
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["individual", "company"]).optional(),
      email: z.string().email().or(z.literal("")).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      taxId: z.string().optional(),
      contactPerson: z.string().optional(),
      status: z.enum(["active", "inactive", "suspended"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateClient(id, data);
    }),
  
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteClient(input.id)),
  
  // ============ CLIENT ACCOUNT STATEMENT ============
  getAccountStatement: publicProcedure
    .input(z.object({
      clientId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(({ input }) => 
      db.getClientAccountStatement(input.clientId, input.startDate, input.endDate)
    ),
  
  getAccountBalance: publicProcedure
    .input(z.object({ 
      clientId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(({ input }) => db.getClientAccountBalance(input.clientId, input.startDate, input.endDate)),
});

export const receivablesRouter = router({
  list: publicProcedure.query(() => db.getReceivables()),
  
  getAll: publicProcedure.query(() => db.getReceivables()),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getReceivableById(input.id)),
  
  getByClientId: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => db.getReceivablesByClientId(input.clientId)),
  
  create: publicProcedure
    .input(z.object({
      clientId: z.number(),
      bookingId: z.number(),
      amount: z.string().or(z.number()),
      dueDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createReceivable({
      ...input,
      amount: String(input.amount),
      remainingAmount: String(input.amount),
    })),
  
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      amount: z.string().optional(),
      remainingAmount: z.string().optional(),
      dueDate: z.date().optional(),
      status: z.enum(["pending", "partial", "paid", "overdue", "cancelled"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateReceivable(id, data);
    }),
  
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteReceivable(input.id)),
  
  getAllWithCustomers: publicProcedure.query(() => db.getReceivablesWithCustomers()),
  
  getStats: publicProcedure.query(() => db.getReceivablesStats()),
  
  getOverdue: publicProcedure
    .input(z.object({ daysOverdue: z.number().optional() }))
    .query(({ input }) => db.getOverdueReceivables(input.daysOverdue)),
  
  getOverdueStats: publicProcedure.query(() => db.getOverdueStats()),
  
  getOverdueByCustomer: publicProcedure
    .input(z.object({ customerId: z.string() }))
    .query(({ input }) => db.getOverdueReceivablesByCustomer(input.customerId)),
});

export const paymentsRouter = router({
  list: publicProcedure.query(() => db.getPayments()),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getPaymentById(input.id)),
  
  getByClientId: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => db.getPaymentsByClientId(input.clientId)),
  
  getByReceivableId: publicProcedure
    .input(z.object({ receivableId: z.number() }))
    .query(({ input }) => db.getPaymentsByReceivableId(input.receivableId)),
  
  create: publicProcedure
    .input(z.object({
      receivableId: z.number(),
      clientId: z.number(),
      amount: z.string().or(z.number()),
      paymentMethod: z.enum(["cash", "card", "transfer", "check", "other"]),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createPayment({
      ...input,
      amount: String(input.amount),
      paymentDate: new Date(),
    })),
  
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deletePayment(input.id)),
  
  createDirectPayment: publicProcedure
    .input(z.object({
      clientId: z.number(),
      amount: z.string().or(z.number()),
      paymentMethod: z.enum(["cash", "card", "transfer", "check", "other"]),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
      paymentDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      // Create a payment without a receivable
      return db.createPayment({
        receivableId: null as any,
        clientId: input.clientId,
        amount: String(input.amount),
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || null,
        notes: input.notes || null,
        paymentDate: input.paymentDate || new Date(),
      });
    }),
  
  smartPayment: publicProcedure
    .input(z.object({
      clientId: z.number(),
      amount: z.string().or(z.number()),
      paymentMethod: z.enum(["cash", "card", "transfer", "check", "other"]),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.processSmartPayment(
      input.clientId,
      Number(input.amount),
      input.paymentMethod,
      input.referenceNumber,
      input.notes
    )),
  
  getPendingByClientId: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => db.getPendingReceivablesByClientId(input.clientId)),
});
