import { eq, and, gte, lte } from "drizzle-orm";
import { bookings, receivables, payments, clients } from "../drizzle/schema";
import { getDb } from "./db";

// التقرير الشهري العام
export async function getMonthlyReport(year: number, month: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // الحصول على جميع العملاء مع إجمالي الحجوزات والدفعات
  const clientsList = await db.select().from(clients);

  const report = await Promise.all(
    clientsList.map(async (client) => {
      // الحجوزات في الشهر
      const clientBookings = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.clientId, client.id),
            gte(bookings.pickupDateTime, startDate),
            lte(bookings.pickupDateTime, endDate)
          )
        );

      const totalBookingAmount = clientBookings.reduce(
        (sum, b) => sum + (Number(b.fare) || 0),
        0
      );

      // الدفعات في الشهر
      const clientPayments = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.clientId, client.id),
            gte(payments.paymentDate, startDate),
            lte(payments.paymentDate, endDate)
          )
        );

      const totalPaymentAmount = clientPayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );

      // الفرق
      const difference = totalBookingAmount - totalPaymentAmount;

      return {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        totalBookingAmount,
        totalPaymentAmount,
        difference,
        bookingCount: clientBookings.length,
        paymentCount: clientPayments.length,
      };
    })
  );

  return report.filter((r) => r.bookingCount > 0 || r.paymentCount > 0);
}

// التقرير الفردي للعميل
export async function getClientDetailedReport(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // بيانات العميل
  const clientData = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (clientData.length === 0) {
    throw new Error("Client not found");
  }

  const client = clientData[0];

  // جميع حجوزات العميل
  const clientBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.clientId, clientId));

  // جميع ذمم العميل
  const clientReceivables = await db
    .select()
    .from(receivables)
    .where(eq(receivables.clientId, clientId));

  // جميع دفعات العميل
  const clientPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.clientId, clientId));

  // الحسابات الإجمالية
  const totalBookingAmount = clientBookings.reduce(
    (sum, b) => sum + (Number(b.fare) || 0),
    0
  );

  const totalPaidAmount = clientPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const totalReceivableAmount = clientReceivables.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const totalRemainingAmount = clientReceivables.reduce(
    (sum, r) => sum + (Number(r.remainingAmount) || 0),
    0
  );

  return {
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
    },
    bookings: clientBookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      pickupLocation: b.pickupLocation,
      pickupDateTime: b.pickupDateTime,
      fare: Number(b.fare) || 0,
      status: b.status,
    })),
    receivables: clientReceivables.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      amount: Number(r.amount) || 0,
      paidAmount: Number(r.paidAmount) || 0,
      remainingAmount: Number(r.remainingAmount) || 0,
      status: r.status,
      dueDate: r.dueDate,
    })),
    payments: clientPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount) || 0,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      referenceNumber: p.referenceNumber,
    })),
    summary: {
      totalBookingAmount,
      totalPaidAmount,
      totalReceivableAmount,
      totalRemainingAmount,
      balance: totalBookingAmount - totalPaidAmount,
    },
  };
}

// التقرير الشهري لعميل محدد
export async function getClientMonthlyReport(clientId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // بيانات العميل
  const clientData = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (clientData.length === 0) {
    throw new Error("Client not found");
  }

  const client = clientData[0];

  // حجوزات العميل في الشهر
  const monthBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.clientId, clientId),
        gte(bookings.pickupDateTime, startDate),
        lte(bookings.pickupDateTime, endDate)
      )
    );

  // دفعات العميل في الشهر
  const monthPayments = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.clientId, clientId),
        gte(payments.paymentDate, startDate),
        lte(payments.paymentDate, endDate)
      )
    );

  const totalBookingAmount = monthBookings.reduce(
    (sum, b) => sum + (Number(b.fare) || 0),
    0
  );

  const totalPaymentAmount = monthPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  return {
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
    },
    month: `${year}-${String(month).padStart(2, "0")}`,
    bookings: monthBookings.map((b) => ({
      bookingNumber: b.bookingNumber,
      pickupLocation: b.pickupLocation,
      pickupDateTime: b.pickupDateTime,
      fare: Number(b.fare) || 0,
      status: b.status,
    })),
    payments: monthPayments.map((p) => ({
      amount: Number(p.amount) || 0,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
    })),
    summary: {
      totalBookingAmount,
      totalPaymentAmount,
      difference: totalBookingAmount - totalPaymentAmount,
      bookingCount: monthBookings.length,
      paymentCount: monthPayments.length,
    },
  };
}
