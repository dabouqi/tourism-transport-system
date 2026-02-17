import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Clients, Receivables, and Payments", () => {
  let clientId: number;
  let receivableId: number;
  let paymentId: number;

  describe("Clients", () => {
    it("should create a new client", async () => {
      const client = await db.createClient({
        name: "أحمد محمد",
        type: "individual",
        email: "ahmed@example.com",
        phone: "+962791234567",
        address: "عمّان، الأردن",
        notes: "عميل جديد",
      });

      expect(client).toBeDefined();
      expect(client?.name).toBe("أحمد محمد");
      expect(client?.type).toBe("individual");
      expect(client?.status).toBe("active");
      
      if (client) {
        clientId = client.id;
      }
    });

    it("should get all clients", async () => {
      const clients = await db.getClients();
      expect(Array.isArray(clients)).toBe(true);
      expect(clients.length).toBeGreaterThan(0);
    });

    it("should get client by ID", async () => {
      const client = await db.getClientById(clientId);
      expect(client).toBeDefined();
      expect(client?.id).toBe(clientId);
      expect(client?.name).toBe("أحمد محمد");
    });

    it("should update client", async () => {
      const updated = await db.updateClient(clientId, {
        phone: "+962799999999",
        notes: "تم التحديث",
      });

      expect(updated).toBeDefined();
      expect(updated?.phone).toBe("+962799999999");
      expect(updated?.notes).toBe("تم التحديث");
    });
  });

  describe("Receivables", () => {
    it("should create a new receivable", async () => {
      const receivable = await db.createReceivable({
        clientId,
        bookingId: 1,
        amount: "500",
        remainingAmount: "500",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: "ذمة جديدة",
      });

      expect(receivable).toBeDefined();
      expect(receivable?.clientId).toBe(clientId);
      expect(receivable?.amount).toMatch(/^500/);
      expect(receivable?.status).toBe("pending");

      if (receivable) {
        receivableId = receivable.id;
      }
    });

    it("should get all receivables", async () => {
      const receivables = await db.getReceivables();
      expect(Array.isArray(receivables)).toBe(true);
      expect(receivables.length).toBeGreaterThan(0);
    });

    it("should get receivables by client ID", async () => {
      const receivables = await db.getReceivablesByClientId(clientId);
      expect(Array.isArray(receivables)).toBe(true);
      expect(receivables.length).toBeGreaterThan(0);
      expect(receivables[0]?.clientId).toBe(clientId);
    });

    it("should get receivable by ID", async () => {
      const receivable = await db.getReceivableById(receivableId);
      expect(receivable).toBeDefined();
      expect(receivable?.id).toBe(receivableId);
      expect(receivable?.clientId).toBe(clientId);
    });

    it("should update receivable status", async () => {
      const updated = await db.updateReceivable(receivableId, {
        status: "partial",
        notes: "تم الدفع جزئياً",
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe("partial");
      expect(updated?.notes).toBe("تم الدفع جزئياً");
    });
  });

  describe("Payments", () => {
    it("should create a new payment", async () => {
      const payment = await db.createPayment({
        receivableId,
        clientId,
        amount: "200",
        paymentMethod: "cash",
        referenceNumber: "PAY001",
        notes: "دفعة نقدية",
        paymentDate: new Date(),
      });

      expect(payment).toBeDefined();
      expect(payment?.receivableId).toBe(receivableId);
      expect(payment?.clientId).toBe(clientId);
      expect(payment?.amount).toMatch(/^200/);
      expect(payment?.paymentMethod).toBe("cash");

      if (payment) {
        paymentId = payment.id;
      }
    });

    it("should get all payments", async () => {
      const payments = await db.getPayments();
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThan(0);
    });

    it("should get payments by client ID", async () => {
      const payments = await db.getPaymentsByClientId(clientId);
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0]?.clientId).toBe(clientId);
    });

    it("should get payments by receivable ID", async () => {
      const payments = await db.getPaymentsByReceivableId(receivableId);
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0]?.receivableId).toBe(receivableId);
    });

    it("should get payment by ID", async () => {
      const payment = await db.getPaymentById(paymentId);
      expect(payment).toBeDefined();
      expect(payment?.id).toBe(paymentId);
      expect(payment?.amount).toMatch(/^200/);
    });
  });

  describe("Smart Payment Tests", () => {
    it("should process smart payment and allocate to oldest receivable first", async () => {
      // Create a new client for smart payment test
      const smartPaymentClient = await db.createClient({
        name: "عميل الدفع الذكي",
        type: "individual",
        status: "active",
      });

      expect(smartPaymentClient).toBeDefined();
      if (!smartPaymentClient) return;

      // Create two receivables
      const receivable1 = await db.createReceivable({
        clientId: smartPaymentClient.id,
        bookingId: 10,
        amount: "100",
        paidAmount: "0",
        remainingAmount: "100",
        status: "pending",
      });

      const receivable2 = await db.createReceivable({
        clientId: smartPaymentClient.id,
        bookingId: 11,
        amount: "50",
        paidAmount: "0",
        remainingAmount: "50",
        status: "pending",
      });

      expect(receivable1).toBeDefined();
      expect(receivable2).toBeDefined();

      if (!receivable1 || !receivable2) return;

      // Process smart payment of 120 (should pay first receivable fully, and 20 of second)
      const payments = await db.processSmartPayment(
        smartPaymentClient.id,
        120,
        "cash",
        undefined,
        "اختبار الدفع الذكي"
      );

      expect(payments).toBeDefined();
      expect(payments.length).toBe(2);

      // Check first receivable (should be fully paid)
      const updatedRec1 = await db.getReceivableById(receivable1.id);
      expect(updatedRec1?.status).toBe("paid");
      expect(Number(updatedRec1?.remainingAmount)).toBe(0);

      // Check second receivable (should be fully paid since we paid 120 total)
      // First receivable: 100 (fully paid)
      // Second receivable: 20 out of 50 (partially paid)
      const updatedRec2 = await db.getReceivableById(receivable2.id);
      expect(updatedRec2?.status).toBe("partial");
      expect(Number(updatedRec2?.remainingAmount)).toBe(30); // 50 - 20 = 30
    });

    it("should get pending receivables for a client in order", async () => {
      // Create a new client
      const pendingClient = await db.createClient({
        name: "عميل الذمم المعلقة",
        type: "individual",
        status: "active",
      });

      expect(pendingClient).toBeDefined();
      if (!pendingClient) return;

      // Create multiple receivables
      await db.createReceivable({
        clientId: pendingClient.id,
        bookingId: 20,
        amount: "100",
        remainingAmount: "100",
        status: "pending",
      });

      await db.createReceivable({
        clientId: pendingClient.id,
        bookingId: 21,
        amount: "50",
        remainingAmount: "50",
        status: "pending",
      });

      // Get pending receivables
      const pending = await db.getPendingReceivablesByClientId(pendingClient.id);

      expect(pending).toBeDefined();
      expect(pending.length).toBeGreaterThanOrEqual(2);
      expect(pending[0].status).toBe("pending");
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete payment flow", async () => {
      // Create a new client
      const newClient = await db.createClient({
        name: "شركة النقل الذهبي",
        type: "company",
        email: "info@goldtransport.com",
        taxId: "123456789",
      });

      expect(newClient).toBeDefined();

      if (!newClient) return;

      // Create a receivable for the client
      const receivable = await db.createReceivable({
        clientId: newClient.id,
        bookingId: 2,
        amount: "1000",
        remainingAmount: "1000",
        notes: "فاتورة حجز",
      });

      expect(receivable).toBeDefined();
      expect(receivable?.status).toBe("pending");

      if (!receivable) return;

      // Create a payment for the receivable
      const payment = await db.createPayment({
        receivableId: receivable.id,
        clientId: newClient.id,
        amount: "500",
        paymentMethod: "transfer",
        referenceNumber: "TRF12345",
        notes: "تحويل بنكي",
        paymentDate: new Date(),
      });

      expect(payment).toBeDefined();
      expect(payment?.amount).toMatch(/^500/);

      // Update receivable status to partial
      const updatedReceivable = await db.updateReceivable(receivable.id, {
        status: "partial",
      });

      expect(updatedReceivable?.status).toBe("partial");

      // Verify the payment is recorded
      const payments = await db.getPaymentsByReceivableId(receivable.id);
      expect(payments.length).toBe(1);
      expect(payments[0]?.amount).toMatch(/^500/);
    });
  });
});
