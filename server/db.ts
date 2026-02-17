import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, or, gte, lte, lt, desc, asc, isNotNull, isNull, sql, getTableColumns } from "drizzle-orm";
import {
  InsertUser,
  users,
  vehicles,
  drivers,
  bookings,
  maintenanceRecords,
  alerts,
  transactions,
  vehicleTracking,
  incomeCategories,
  expenseCategories,
  transactionsV2,
  financialSummaries,
  externalPartners,
  partnerTransactions,
  clients,
  receivables,
  payments,
  invoices,
  vehicleLocations,
  expenses,
  otherTransactions,
  Client,
  InsertClient,
  Receivable,
  InsertReceivable,
  Payment,
  InsertPayment,
  Invoice,
  InsertInvoice,
  Expense,
  InsertExpense,
  OtherTransaction,
  InsertOtherTransaction,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { calculateBookingStatus } from "./statusCalculator";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ VEHICLES ============

export async function getVehicles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
}

export async function getVehicleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createVehicle(data: typeof vehicles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vehicles).values(data);
  return result;
}

export async function updateVehicle(id: number, data: Partial<typeof vehicles.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(vehicles).set(data).where(eq(vehicles.id, id));
}

export async function deleteVehicle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(vehicles).where(eq(vehicles.id, id));
}

// ============ DRIVERS ============

export async function getDrivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drivers).orderBy(desc(drivers.createdAt));
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDriver(data: typeof drivers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(drivers).values(data);
}

export async function updateDriver(id: number, data: Partial<typeof drivers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(drivers).set(data).where(eq(drivers.id, id));
}

export async function deleteDriver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(drivers).where(eq(drivers.id, id));
}

// ============ BOOKINGS ============

export async function getBookings() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      ...getTableColumns(bookings),
      clientName: clients.name,
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .orderBy(desc(bookings.pickupDateTime));
  return result;
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTodayBookingsCount() {
  const db = await getDb();
  if (!db) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bookings)
    .where(
      and(
        gte(bookings.pickupDateTime, today),
        lt(bookings.pickupDateTime, tomorrow)
      )
    );

  return result[0]?.count || 0;
}

export async function createBooking(data: typeof bookings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  
  try {
    // تحويل التواريخ بشكل صحيح
    const processedData = {
      ...data,
      clientId: data.clientId || null,
      numberOfPassengers: data.numberOfPassengers || 1,
      pickupDateTime: data.pickupDateTime ? new Date(data.pickupDateTime) : new Date(),
      dropoffDateTime: data.dropoffDateTime ? new Date(data.dropoffDateTime) : null,
      programEndDate: data.programEndDate ? new Date(data.programEndDate) : null,
      fare: data.fare ? String(data.fare) : '0',
    };
    
    const result = await db.insert(bookings).values(processedData as any);
    
    // Get the inserted booking ID from the result
    // Result is an array where result[0] contains the ResultSetHeader with insertId
    let bookingId: number | undefined;
    if (Array.isArray(result) && result.length > 0 && (result[0] as any).insertId) {
      bookingId = (result[0] as any).insertId;
    } else if ((result as any).insertId) {
      bookingId = (result as any).insertId;
    }
    
    console.log('[createBooking] bookingId extracted:', bookingId);
    
    // Create receivable for the booking (with or without client)
    if (data.fare && bookingId) {
      try {
        const fareAmount = Number(data.fare) || 0;
        
        // If no client is assigned, create a default client first
        let clientId = data.clientId;
        if (!clientId) {
          // Create a temporary/default client for this booking
          const defaultClient = await db.insert(clients).values({
            name: data.customerName || "عميل بدون تحديد",
            type: "individual",
            phone: data.customerPhone || undefined,
            email: data.customerEmail || undefined,
            address: data.pickupLocation || undefined,
          });
          
          // Extract the client ID from the result
          if (Array.isArray(defaultClient) && defaultClient.length > 0 && (defaultClient[0] as any).insertId) {
            clientId = (defaultClient[0] as any).insertId;
          } else if ((defaultClient as any).insertId) {
            clientId = (defaultClient as any).insertId;
          }
          
          console.log('[createBooking] Default client created:', clientId);
        }
        
        // Create receivable for the client
        if (clientId) {
          await db.insert(receivables).values({
            clientId: clientId,
            bookingId: bookingId,
            amount: fareAmount.toString(),
            paidAmount: "0",
            remainingAmount: fareAmount.toString(),
            dueDate: processedData.pickupDateTime,
            status: "pending",
            notes: `ذمة من حجز: ${data.bookingNumber}`,
          });
          
          console.log('[createBooking] Receivable created for client:', clientId);
        }
      } catch (receivableError) {
        console.error("خطأ في إنشاء الذمة:", receivableError);
        throw new Error(`فشل إنشاء الذمة للحجز: ${receivableError instanceof Error ? receivableError.message : String(receivableError)}`);
      }
    }
    
    // Register the booking as revenue (only once)
    if (data.fare && bookingId) {
      try {
        const fareAmount = Number(data.fare) || 0;
        
        // Check if transaction already exists for this booking
        const existingTransaction = await db
          .select()
          .from(transactions)
          .where(and(
            eq(transactions.bookingId, bookingId),
            eq(transactions.transactionType, 'revenue'),
            eq(transactions.isFromBooking, true)
          ))
          .limit(1);
        
        if (existingTransaction.length === 0) {
          const insertResult = await db.insert(transactions).values({
            transactionType: "revenue",
            category: "booking",
            amount: fareAmount.toString(),
            description: `Booking: ${data.bookingNumber} - ${data.customerName}`,
            bookingId: bookingId,
            clientId: data.clientId || null,
            isFromBooking: true,
            transactionDate: processedData.pickupDateTime,
          });
          console.log('[createBooking] Transaction registered successfully:', insertResult);
        } else {
          console.log('[createBooking] Transaction already exists for booking:', bookingId);
        }
      } catch (transactionError) {
        console.error("خطأ في تسجيل الدخل:", transactionError);
        throw new Error(`فشل تسجيل الإيرادة للحجز: ${transactionError instanceof Error ? transactionError.message : String(transactionError)}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error("خطأ في إنشاء الحجز:", error);
    
    if (error instanceof Error && error.message.includes('FOREIGN KEY')) {
      throw new Error('العميل المحدد غير موجود');
    }
    
    throw error;
  }
}

export async function updateBooking(id: number, data: Partial<typeof bookings.$inferInsert>) {
  // Prevent updating transactions from bookings - they are read-only
  // Only allow updating booking data, not the transaction
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // 1. جلب الحجز القديم للمقارنة
    const oldBooking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    
    if (oldBooking.length === 0) {
      throw new Error('Booking not found');
    }

    // 2. Process data to convert dates and fare
    const processedData: any = { ...data };
    if (data.pickupDateTime) {
      processedData.pickupDateTime = new Date(data.pickupDateTime);
    }
    if (data.dropoffDateTime) {
      processedData.dropoffDateTime = new Date(data.dropoffDateTime);
    }
    if (data.programEndDate) {
      processedData.programEndDate = new Date(data.programEndDate);
    }
    if (data.fare) {
      processedData.fare = String(data.fare);
    }
    
    // 3. تحديث بيانات الحجز
    await db.update(bookings).set(processedData).where(eq(bookings.id, id));
    
    // 4. التحقق من تغيير السعر
    const oldFare = Number(oldBooking[0].fare) || 0;
    const newFare = Number(data.fare) || 0;
    
    if (data.fare !== undefined && oldFare !== newFare) {
      // 5. تحديث الذمم (Receivables)
      const receivable = await db
        .select()
        .from(receivables)
        .where(eq(receivables.bookingId, id))
        .limit(1);
      
      if (receivable.length > 0) {
        const currentPaid = Number(receivable[0].amount) - Number(receivable[0].remainingAmount);
        const newRemainingAmount = newFare - currentPaid;
        
        await db
          .update(receivables)
          .set({
            amount: String(newFare),
            remainingAmount: String(Math.max(0, newRemainingAmount)),
            status: newRemainingAmount <= 0 ? 'paid' : receivable[0].status
          })
          .where(eq(receivables.id, receivable[0].id));
      } else if (newFare > 0 && oldBooking[0].clientId) {
        // إنشاء ذمة جديدة إذا لم تكن موجودة
        await db.insert(receivables).values({
          clientId: oldBooking[0].clientId,
          bookingId: id,
          amount: String(newFare),
          remainingAmount: String(newFare),
          paidAmount: '0',
          status: 'pending'
        });
      }
      
      // 6. تحديث الفواتير (Invoices)
      const invoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.bookingId, id))
        .limit(1);
      
      if (invoice.length > 0) {
        const currentPaid = Number(invoice[0].totalAmount) - Number(invoice[0].remainingAmount);
        const newRemainingAmount = newFare - currentPaid;
        
        await db
          .update(invoices)
          .set({
            totalAmount: String(newFare),
            remainingAmount: String(Math.max(0, newRemainingAmount)),
            status: newRemainingAmount <= 0 ? 'paid' : invoice[0].status
          })
          .where(eq(invoices.id, invoice[0].id));
      }
      
      // 7. تحديث المعاملات المالية (Transactions)
      const revenueTransaction = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.bookingId, id),
            eq(transactions.transactionType, 'revenue')
          )
        )
        .limit(1);
      
      if (revenueTransaction.length > 0) {
        await db
          .update(transactions)
          .set({ amount: String(newFare) })
          .where(eq(transactions.id, revenueTransaction[0].id));
      } else if (newFare > 0) {
        // إنشاء معاملة جديدة إذا لم تكن موجودة
        await db.insert(transactions).values({
          transactionType: 'revenue',
          category: 'حجز',
          amount: String(newFare),
          description: `Revenue from booking #${id}`,
          bookingId: id,
          isFromBooking: true,
          transactionDate: new Date()
        });
      }
    }
    
    return { success: true, priceChanged: oldFare !== newFare };
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}

export async function deleteBooking(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the booking to check if it's part of a recurring series
  const booking = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  
  if (booking.length === 0) {
    // Booking might already be deleted, return success
    return { success: true };
  }
  
  const bookingNumber = booking[0].bookingNumber;
  
  // Check if this is a recurring booking (e.g., BK-123-D1, BK-123-D2, etc.)
  const isRecurring = /^BK-.*-D\d+$/.test(bookingNumber);
  
  if (isRecurring) {
    // Extract the base booking number (e.g., BK-123 from BK-123-D1)
    const baseNumber = bookingNumber.replace(/-D\d+$/, '');
    
    // Get all bookings in this series
    const seriesBookings = await db
      .select()
      .from(bookings)
      .where(sql`${bookings.bookingNumber} LIKE ${baseNumber + '-D%'}`);
    
    // Delete all related data for each booking in the series (in correct order)
    for (const seriesBooking of seriesBookings) {
      // 1. Get receivables for this booking
      const receivablesForBooking = await db.select().from(receivables).where(eq(receivables.bookingId, seriesBooking.id));
      // 2. Delete payments for these receivables
      for (const receivable of receivablesForBooking) {
        await db.delete(payments).where(eq(payments.receivableId, receivable.id));
      }
      // 3. Delete receivables
      await db.delete(receivables).where(eq(receivables.bookingId, seriesBooking.id));
      // 4. Delete transactions
      await db.delete(transactions).where(eq(transactions.bookingId, seriesBooking.id));
    }
    
    // Delete all bookings in the series
    await db.delete(bookings).where(sql`${bookings.bookingNumber} LIKE ${baseNumber + '-D%'}`);
  } else {
    // Single booking - delete in correct order (dependencies first)
    // 1. Get receivables for this booking
    const receivablesForBooking = await db.select().from(receivables).where(eq(receivables.bookingId, id));
    // 2. Delete payments for these receivables
    for (const receivable of receivablesForBooking) {
      await db.delete(payments).where(eq(payments.receivableId, receivable.id));
    }
    // 3. Delete receivables
    await db.delete(receivables).where(eq(receivables.bookingId, id));
    // 4. Delete transactions
    await db.delete(transactions).where(eq(transactions.bookingId, id));
    // 5. Delete the booking
    await db.delete(bookings).where(eq(bookings.id, id));
  }
  
  return { success: true };
}

// ============ MAINTENANCE RECORDS ============

export async function getMaintenanceRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(maintenanceRecords).orderBy(desc(maintenanceRecords.createdAt));
}

export async function getMaintenanceRecordsByVehicleId(vehicleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.vehicleId, vehicleId))
    .orderBy(desc(maintenanceRecords.createdAt));
}

export async function getMaintenanceRecordById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createMaintenanceRecord(data: typeof maintenanceRecords.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create maintenance record
  const result = await db.insert(maintenanceRecords).values(data);
  
  // Add cost to expenses automatically if cost exists
  if (data.cost && Number(data.cost) > 0) {
    try {
      // تسجيل المصروف في جدول transactions الصحيح
      await db.insert(transactions).values({
        transactionType: "expense",
        category: "صيانة المركبات",
        amount: data.cost,
        description: `Vehicle Maintenance: ${data.maintenanceType}`,
        vehicleId: data.vehicleId,
        transactionDate: new Date(),
        isFromBooking: false,
      });
      console.log(`[Maintenance Expense] Added expense for vehicle ${data.vehicleId}: ${data.cost} د.ا`);
    } catch (error) {
      console.error("Error adding maintenance expense:", error);
    }
  }
  
  return result;
}

export async function updateMaintenanceRecord(
  id: number,
  data: Partial<typeof maintenanceRecords.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(maintenanceRecords).set(data).where(eq(maintenanceRecords.id, id));
}

// ============ ALERTS ============

export async function getAlerts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).orderBy(desc(alerts.createdAt));
}

export async function getUnreadAlerts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(alerts)
    .where(eq(alerts.isRead, false))
    .orderBy(desc(alerts.createdAt));
}

export async function createAlert(data: typeof alerts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(alerts).values(data);
}

export async function markAlertAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
}

// ============ TRANSACTIONS ============

export async function getTransactions(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let whereCondition = undefined;
  if (clientId) {
    whereCondition = eq(transactions.clientId, clientId);
  }
  
  const result = await db
    .select({
      id: transactions.id,
      transactionType: transactions.transactionType,
      category: transactions.category,
      amount: transactions.amount,
      description: transactions.description,
      bookingId: transactions.bookingId,
      clientId: transactions.clientId,
      vehicleId: transactions.vehicleId,
      driverId: transactions.driverId,
      isFromBooking: transactions.isFromBooking,
      transactionDate: transactions.transactionDate,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      bookingDate: sql`COALESCE(${bookings.pickupDateTime}, ${transactions.createdAt})`,
    })
    .from(transactions)
    .leftJoin(bookings, eq(transactions.bookingId, bookings.id))
    .where(whereCondition)
    .orderBy(desc(transactions.transactionDate));
  
  return result;
}

export async function getTodayRevenue() {
  const db = await getDb();
  if (!db) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select({ total: sql<string>`SUM(amount)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "revenue"),
        gte(transactions.transactionDate, today),
        lte(transactions.transactionDate, tomorrow)
      )
    );

  return parseFloat(result[0]?.total || "0");
}

export async function createTransaction(data: typeof transactions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  console.log("[createTransaction] Creating transaction:", data);
  try {
    const result = await db.insert(transactions).values(data);
    console.log("[createTransaction] Success:", result);
    return result;
  } catch (error) {
    console.error("[createTransaction] Error:", error);
    throw error;
  }
}

// ============ VEHICLE TRACKING ============

export async function getLatestVehicleTracking(vehicleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(vehicleTracking)
    .where(eq(vehicleTracking.vehicleId, vehicleId))
    .orderBy(desc(vehicleTracking.timestamp))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createVehicleTracking(data: typeof vehicleTracking.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(vehicleTracking).values(data);
}

export async function getActiveVehiclesCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(vehicles)
    .where(eq(vehicles.status, "available"));

  return result[0]?.count || 0;
}

export async function getPendingOperationsCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bookings)
    .where(eq(bookings.status, "pending"));

  return result[0]?.count || 0;
}

// ============ UPDATE & DELETE FUNCTIONS ============

export async function updateTransaction(id: number, data: Partial<typeof transactions.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(transactions).set(data).where(eq(transactions.id, id));
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the transaction to check if it has a bookingId
  const transaction = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  
  if (transaction.length > 0 && transaction[0].bookingId) {
    const bookingId = transaction[0].bookingId;
    
    // Delete in correct order (dependencies first)
    // 1. Delete payments for receivables linked to this booking
    const receivablesForBooking = await db.select().from(receivables).where(eq(receivables.bookingId, bookingId));
    for (const receivable of receivablesForBooking) {
      await db.delete(payments).where(eq(payments.receivableId, receivable.id));
    }
    
    // 2. Delete receivables for this booking
    await db.delete(receivables).where(eq(receivables.bookingId, bookingId));
    
    // 3. Delete the booking
    await db.delete(bookings).where(eq(bookings.id, bookingId));
  }
  
  // 4. Delete the transaction
  return db.delete(transactions).where(eq(transactions.id, id));
}

export async function updateAlert(id: number, data: Partial<typeof alerts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(alerts).set(data).where(eq(alerts.id, id));
}

export async function deleteMaintenanceRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get maintenance record to find related expense
  const records = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id));
  const record = records[0];
  
  // Delete related expense from transactionsV2 if cost exists
  if (record && record.cost) {
    try {
      // Delete only the expense related to this specific maintenance
      const expenseDescription = `Vehicle Maintenance: ${record.maintenanceType}`;
      await db.delete(transactions).where(
        and(
          eq(transactions.transactionType, "expense"),
          eq(transactions.vehicleId, record.vehicleId),
          eq(transactions.description, expenseDescription)
        )
      );
    } catch (error) {
      console.error("Error deleting related expense:", error);
    }
  }
  
  // Delete maintenance record
  return db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id));
}

export async function deleteAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(alerts).where(eq(alerts.id, id));
}


// ============ ADVANCED FINANCIAL FUNCTIONS ============

export async function getIncomeCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incomeCategories);
}

export async function getExpenseCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenseCategories);
}

export async function createIncomeCategory(data: typeof incomeCategories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(incomeCategories).values(data);
}

export async function createExpenseCategory(data: typeof expenseCategories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(expenseCategories).values(data);
}

export async function getFinancialSummary(year: number, month?: number) {
  const db = await getDb();
  if (!db) return null;
  
  const where = month 
    ? and(eq(financialSummaries.year, year), eq(financialSummaries.month, month))
    : and(eq(financialSummaries.year, year), eq(financialSummaries.month, 0));
  
  const result = await db.select().from(financialSummaries).where(where).limit(1);
  return result[0] || null;
}

export async function calculateMonthlyFinancialSummary(year: number, month: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  // Get revenue
  const revenueResult = await db
    .select({ total: sql<number>`SUM(amount)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "revenue"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );
  
  // Get expenses
  const expenseResult = await db
    .select({ total: sql<number>`SUM(amount)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "expense"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );
  
  const totalRevenue = revenueResult[0]?.total || 0;
  const totalExpenses = expenseResult[0]?.total || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  return {
    year,
    month,
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
  };
}

export async function getRevenueByCategory(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      categoryId: transactions.category,
      categoryName: incomeCategories.name,
      total: sql<number>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
      color: incomeCategories.color,
    })
    .from(transactions)
    .leftJoin(incomeCategories, eq(transactions.category, incomeCategories.name))
    .where(
      and(
        eq(transactions.transactionType, "revenue"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(transactions.category);
}

export async function getExpensesByCategory(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      categoryId: transactions.category,
      categoryName: expenseCategories.name,
      total: sql<number>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
      color: expenseCategories.color,
    })
    .from(transactions)
    .leftJoin(expenseCategories, eq(transactions.category, expenseCategories.name))
    .where(
      and(
        eq(transactions.transactionType, "expense"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(transactions.category);
}

export async function getExpensesByVehicle(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      vehicleId: transactions.vehicleId,
      vehicleName: vehicles.licensePlate,
      total: sql<number>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .leftJoin(vehicles, eq(transactions.vehicleId, vehicles.id))
    .where(
      and(
        eq(transactions.transactionType, "expense"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
        isNotNull(transactions.vehicleId)
      )
    )
    .groupBy(transactions.vehicleId);
}

export async function getExpensesByDriver(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      driverId: transactions.driverId,
      driverName: drivers.name,
      total: sql<number>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .leftJoin(drivers, eq(transactions.driverId, drivers.id))
    .where(
      and(
        eq(transactions.transactionType, "expense"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
        isNotNull(transactions.driverId)
      )
    )
    .groupBy(transactions.driverId);
}

export async function getMonthlyFinancialTrend(year: number) {
  const db = await getDb();
  if (!db) return [];
  
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const trends = [];
  
  for (const month of months) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const revenueResult = await db
      .select({ total: sql<number>`SUM(amount)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    const expenseResult = await db
      .select({ total: sql<number>`SUM(amount)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    trends.push({
      month,
      revenue: revenueResult[0]?.total || 0,
      expenses: expenseResult[0]?.total || 0,
    });
  }
  
  return trends;
}

export async function getPendingTransactions() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(transactions)
    .where(eq(transactionsV2.status, "pending"))
    .orderBy(desc(transactions.transactionDate));
}

export async function getBookingIncomeStatus(bookingId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactionsV2.bookingId, bookingId),
        eq(transactions.transactionType, "revenue")
      )
    )
    .limit(1);
  
  return result[0] || null;
}

export async function getMonthlyFinancialSummary(year?: number, month?: number) {
  const db = await getDb();
  if (!db) return { totalIncome: 0, totalExpenses: 0, netProfit: 0, incomeByCategory: [], expenseByCategory: [] };
  
  // Use current month if not specified
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;
  
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
  
  // Get total income
  const incomeResult = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "revenue"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );
  
  // Get total expenses
  const expenseResult = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "expense"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );
  
  // Get income by category
  const incomeByCategory = await db
    .select({
      category: transactions.category,
      total: sql<number>`COALESCE(SUM(amount), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "revenue"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(transactions.category);
  
  // Get expenses by category
  const expenseByCategory = await db
    .select({
      category: transactions.category,
      total: sql<number>`COALESCE(SUM(amount), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "expense"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(transactions.category);
  
  const totalIncome = incomeResult[0]?.total || 0;
  const totalExpenses = expenseResult[0]?.total || 0;
  const netProfit = totalIncome - totalExpenses;
  
  return {
    totalIncome,
    totalExpenses,
    netProfit,
    incomeByCategory,
    expenseByCategory,
    month: targetMonth,
    year: targetYear,
  };
}

export async function getFinancialComparison(periods: Array<{ year: number; month: number }>) {
  const db = await getDb();
  if (!db) return [];
  
  const comparisons = [];
  
  for (const period of periods) {
    const startDate = new Date(period.year, period.month - 1, 1);
    const endDate = new Date(period.year, period.month, 0, 23, 59, 59);
    
    // Get total income
    const incomeResult = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    // Get total expenses
    const expenseResult = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    // Get income by category
    const incomeByCategory = await db
      .select({
        category: transactions.category,
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      )
      .groupBy(transactions.category);
    
    // Get expenses by category
    const expenseByCategory = await db
      .select({
        category: transactions.category,
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      )
      .groupBy(transactions.category);
    
    const totalIncome = incomeResult[0]?.total || 0;
    const totalExpenses = expenseResult[0]?.total || 0;
    const netProfit = totalIncome - totalExpenses;
    
    comparisons.push({
      period: `${period.month}/${period.year}`,
      month: period.month,
      year: period.year,
      totalIncome,
      totalExpenses,
      netProfit,
      incomeByCategory,
      expenseByCategory,
    });
  }
  
  return comparisons;
}

export async function getTotalReceivables() {
  try {
    const stats = await getReceivablesStats();
    return stats?.remainingAmount ?? 0;
  } catch (error) {
    console.error('[getTotalReceivables] Error:', error);
    return 0;
  }
}

/**
 * Get split receivables: current (past/present) and future
 * Current: booking start_time <= now
 * Future: booking start_time > now
 */
export async function getSplitReceivables() {
  const db = await getDb();
  if (!db) {
    console.warn('[getSplitReceivables] Database not available');
    return { current: 0, future: 0 };
  }
  
  try {
    const now = new Date();
    
    // Get current receivables (booking start_time <= now OR no booking)
    const currentResult = await db
      .select({
        remainingAmount: sql<number>`SUM(${receivables.remainingAmount})`,
      })
      .from(receivables)
      .leftJoin(bookings, eq(receivables.bookingId, bookings.id))
      .where(
        and(
          or(
            sql`${bookings.pickupDateTime} IS NULL OR ${bookings.pickupDateTime} <= ${now}`,
            isNull(bookings.pickupDateTime)
          ),
          sql`${receivables.status} IN ('pending', 'partial')`
        )
      );
    
    // Get future receivables (booking start_time > now)
    const futureResult = await db
      .select({
        remainingAmount: sql<number>`SUM(${receivables.remainingAmount})`,
      })
      .from(receivables)
      .innerJoin(bookings, eq(receivables.bookingId, bookings.id))
      .where(
        and(
          sql`${bookings.pickupDateTime} IS NOT NULL AND ${bookings.pickupDateTime} > ${now}`,
          sql`${receivables.status} IN ('pending', 'partial')`
        )
      );
    
    const currentAmount = currentResult[0]?.remainingAmount ? Number(currentResult[0].remainingAmount) : 0;
    const futureAmount = futureResult[0]?.remainingAmount ? Number(futureResult[0].remainingAmount) : 0;
    
    return {
      current: currentAmount,
      future: futureAmount,
    };
  } catch (error) {
    console.error('[getSplitReceivables] Error:', error);
    return { current: 0, future: 0 };
  }
}




// ============ EXTERNAL PARTNERS FUNCTIONS ============

export async function getExternalPartners() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(externalPartners);
}

export async function getExternalPartnerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(externalPartners).where(eq(externalPartners.id, id)).limit(1);
  return result[0] || null;
}

export async function getExternalPartnerByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(externalPartners).where(eq(externalPartners.code, code)).limit(1);
  return result[0] || null;
}

export async function createExternalPartner(data: typeof externalPartners.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(externalPartners).values(data);
}

export async function updateExternalPartner(id: number, data: Partial<typeof externalPartners.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(externalPartners).set(data).where(eq(externalPartners.id, id));
}

export async function deleteExternalPartner(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(externalPartners).where(eq(externalPartners.id, id));
}

export async function getPartnerTransactions(partnerId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (partnerId) {
    return db.select().from(partnerTransactions).where(eq(partnerTransactions.partnerId, partnerId));
  }
  return db.select().from(partnerTransactions);
}

export async function createPartnerTransaction(data: typeof partnerTransactions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(partnerTransactions).values(data);
}

export async function getPartnerEarnings(partnerId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      totalAmount: sql<number>`SUM(${partnerTransactions.amount})`,
      totalCommission: sql<number>`SUM(${partnerTransactions.commission})`,
      totalNetAmount: sql<number>`SUM(${partnerTransactions.netAmount})`,
      transactionCount: sql<number>`COUNT(*)`,
    })
    .from(partnerTransactions)
    .where(
      and(
        eq(partnerTransactions.partnerId, partnerId),
        gte(partnerTransactions.transactionDate, startDate),
        lte(partnerTransactions.transactionDate, endDate)
      )
    );
  
  return result[0] || null;
}

export async function getPartnerTransactionsByStatus(partnerId: number, status: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(partnerTransactions)
    .where(
      and(
        eq(partnerTransactions.partnerId, partnerId),
        eq(partnerTransactions.status, status as any)
      )
    );
}

export async function getBookingsBySource(source: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingSource, source as any))
    .orderBy(desc(bookings.pickupDateTime));
}

export async function getBookingsTotals(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { active: 0, completed: 0, total: 0 };
  
  try {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(bookings.pickupDateTime, startDate));
    }
    if (endDate) {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(lt(bookings.pickupDateTime, nextDay));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get active bookings total
    const activeResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${bookings.fare} AS DECIMAL(10, 2))), 0)`,
      })
      .from(bookings)
      .where(whereClause ? and(whereClause, eq(bookings.status, 'in_progress')) : eq(bookings.status, 'in_progress'));
    
    // Get completed bookings total
    const completedResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${bookings.fare} AS DECIMAL(10, 2))), 0)`,
      })
      .from(bookings)
      .where(whereClause ? and(whereClause, eq(bookings.status, 'completed')) : eq(bookings.status, 'completed'));
    
    // Get all bookings total
    const totalResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${bookings.fare} AS DECIMAL(10, 2))), 0)`,
      })
      .from(bookings)
      .where(whereClause);
    
    return {
      active: parseFloat(activeResult[0]?.total?.toString() || '0'),
      completed: parseFloat(completedResult[0]?.total?.toString() || '0'),
      total: parseFloat(totalResult[0]?.total?.toString() || '0'),
    };
  } catch (error) {
    console.error('[getBookingsTotals] Error:', error);
    return { active: 0, completed: 0, total: 0 };
  }
}

export async function getRevenueByPartner(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select({
      partnerId: externalPartners.id,
      partnerName: externalPartners.name,
      partnerCode: externalPartners.code,
      totalAmount: sql<number>`SUM(${partnerTransactions.amount})`,
      totalCommission: sql<number>`SUM(${partnerTransactions.commission})`,
      totalNetAmount: sql<number>`SUM(${partnerTransactions.netAmount})`,
      transactionCount: sql<number>`COUNT(*)`,
    })
    .from(partnerTransactions)
    .leftJoin(externalPartners, eq(partnerTransactions.partnerId, externalPartners.id))
    .where(
      and(
        gte(partnerTransactions.transactionDate, startDate),
        lte(partnerTransactions.transactionDate, endDate)
      )
    )
    .groupBy(partnerTransactions.partnerId);
}

export async function getTotalRevenueWithPartners(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { internalRevenue: 0, partnerRevenue: 0, totalRevenue: 0 };
  
  // Internal bookings revenue
  const internalResult = await db
    .select({ total: sql<number>`SUM(${bookings.fare})` })
    .from(bookings)
    .where(
      and(
        eq(bookings.bookingSource, "internal"),
        gte(bookings.pickupDateTime, startDate),
        lte(bookings.pickupDateTime, endDate)
      )
    );
  
  // Partner revenue
  const partnerResult = await db
    .select({ total: sql<number>`SUM(${partnerTransactions.netAmount})` })
    .from(partnerTransactions)
    .where(
      and(
        gte(partnerTransactions.transactionDate, startDate),
        lte(partnerTransactions.transactionDate, endDate)
      )
    );
  
  const internalRevenue = internalResult[0]?.total || 0;
  const partnerRevenue = partnerResult[0]?.total || 0;
  
  return {
    internalRevenue,
    partnerRevenue,
    totalRevenue: internalRevenue + partnerRevenue,
  };
}


// ============================================================================
// CLIENTS (العملاء) - Helper Functions
// ============================================================================

export async function createClient(data: InsertClient): Promise<Client | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create client: database not available");
    return null;
  }

  try {
    await db.insert(clients).values(data);
    
    // Get the last inserted client
    const result = await db.select().from(clients).orderBy(desc(clients.createdAt)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create client:", error);
    throw error;
  }
}

export async function getClients(): Promise<Client[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get clients: database not available");
    return [];
  }

  try {
    const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
    
    // Calculate totalBalance and totalPaid for each client
    const clientsWithBalances = await Promise.all(
      allClients.map(async (client) => {
        // Get all bookings for this client
        const clientBookings = await db
          .select()
          .from(bookings)
          .where(eq(bookings.clientId, client.id));
        
        // Calculate total balance from bookings
        const totalBalance = clientBookings.reduce((sum, booking) => {
          const fare = parseFloat(booking.fare || "0");
          return sum + fare;
        }, 0);
        
        // Get all payments for this client
        const clientPayments = await db
          .select()
          .from(payments)
          .where(eq(payments.clientId, client.id));
        
        // Calculate total paid
        const totalPaid = clientPayments.reduce((sum, payment) => {
          const amount = parseFloat(payment.amount || "0");
          return sum + amount;
        }, 0);
        
        return {
          ...client,
          totalBalance: totalBalance.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
        };
      })
    );
    
    return clientsWithBalances;
  } catch (error) {
    console.error("[Database] Failed to get clients:", error);
    return [];
  }
}

export async function getClientById(id: number): Promise<Client | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get client: database not available");
    return null;
  }

  try {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get client:", error);
    return null;
  }
}

export async function updateClient(id: number, data: Partial<InsertClient>): Promise<Client | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update client: database not available");
    return null;
  }

  try {
    await db.update(clients).set(data).where(eq(clients.id, id));
    return await getClientById(id);
  } catch (error) {
    console.error("[Database] Failed to update client:", error);
    throw error;
  }
}

export async function deleteClient(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete client: database not available");
    return false;
  }

  try {
    await db.delete(clients).where(eq(clients.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete client:", error);
    return false;
  }
}

// ============================================================================
// RECEIVABLES (الذمم) - Helper Functions
// ============================================================================

export async function createReceivable(data: InsertReceivable): Promise<Receivable | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create receivable: database not available");
    return null;
  }

  try {
    await db.insert(receivables).values(data);
    
    // Get the last inserted receivable
    const result = await db.select().from(receivables).orderBy(desc(receivables.createdAt)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create receivable:", error);
    throw error;
  }
}

export async function getReceivables(): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get receivables: database not available");
    return [];
  }

  try {
    return await db
      .select({
        id: receivables.id,
        clientId: receivables.clientId,
        bookingId: receivables.bookingId,
        bookingNumber: bookings.bookingNumber,
        amount: receivables.amount,
        remainingAmount: receivables.remainingAmount,
        status: receivables.status,
        dueDate: receivables.dueDate,
        createdAt: receivables.createdAt,
        notes: receivables.notes,
      })
      .from(receivables)
      .leftJoin(bookings, eq(receivables.bookingId, bookings.id))
      .orderBy(desc(receivables.dueDate));
  } catch (error) {
    console.error("[Database] Failed to get receivables:", error);
    return [];
  }
}

export async function getReceivablesByClientId(clientId: number): Promise<Receivable[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get receivables: database not available");
    return [];
  }

  try {
    return await db.select().from(receivables).where(eq(receivables.clientId, clientId));
  } catch (error) {
    console.error("[Database] Failed to get receivables by client:", error);
    return [];
  }
}

export async function getReceivableById(id: number): Promise<Receivable | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get receivable: database not available");
    return null;
  }

  try {
    const result = await db.select().from(receivables).where(eq(receivables.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get receivable:", error);
    return null;
  }
}

export async function updateReceivable(id: number, data: Partial<InsertReceivable>): Promise<Receivable | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update receivable: database not available");
    return null;
  }

  try {
    const updateData: any = {};
    
    if (data.remainingAmount !== undefined) {
      updateData.remainingAmount = typeof data.remainingAmount === 'string' ? parseFloat(data.remainingAmount) : data.remainingAmount;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    
    console.log("[Database] Updating receivable:", id, updateData);
    
    const result = await db.update(receivables).set(updateData).where(eq(receivables.id, id));
    
    console.log("[Database] Update result:", result);
    
    return await getReceivableById(id);
  } catch (error) {
    console.error("[Database] Failed to update receivable:", error);
    throw error;
  }
}

export async function getReceivablesWithCustomers(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db
      .select({
        id: receivables.id,
        clientId: receivables.clientId,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        bookingId: receivables.bookingId,
        bookingNumber: bookings.bookingNumber,
        amount: receivables.amount,
        remainingAmount: receivables.remainingAmount,
        status: receivables.status,
        dueDate: receivables.dueDate,
        createdAt: receivables.createdAt,
        notes: receivables.notes,
      })
      .from(receivables)
      .leftJoin(clients, eq(receivables.clientId, clients.id))
      .leftJoin(bookings, eq(receivables.bookingId, bookings.id))
      .orderBy(desc(receivables.dueDate));
  } catch (error) {
    console.error("[Database] Failed to get receivables with customers:", error);
    return [];
  }
}

/**
 * Get receivables list split by current and future
 */
export async function getReceivablesList(type: 'current' | 'future' = 'current') {
  const db = await getDb();
  if (!db) {
    console.warn('[getReceivablesList] Database not available');
    return [];
  }
  
  try {
    const now = new Date();
    
    const query = db
      .select({
        id: receivables.id,
        clientId: receivables.clientId,
        bookingId: receivables.bookingId,
        amount: receivables.amount,
        paidAmount: receivables.paidAmount,
        remainingAmount: receivables.remainingAmount,
        dueDate: receivables.dueDate,
        status: receivables.status,
        notes: receivables.notes,
        createdAt: receivables.createdAt,
        updatedAt: receivables.updatedAt,
        clientName: clients.name,
        pickupDateTime: bookings.pickupDateTime,
      })
      .from(receivables)
      .innerJoin(clients, eq(receivables.clientId, clients.id))
      .leftJoin(bookings, eq(receivables.bookingId, bookings.id));
    
    if (type === 'current') {
      // Current: booking start_time <= now OR receivable has no booking (bookingId = 0)
      query.where(
        and(
          or(
            lte(bookings.pickupDateTime, now),
            eq(receivables.bookingId, 0)
          ),
          sql`${receivables.status} IN ('pending', 'partial')`
        )
      );
    } else {
      // Future: booking start_time > now
      query.where(
        and(
          sql`${bookings.pickupDateTime} > ${now}`,
          sql`${receivables.status} IN ('pending', 'partial')`
        )
      );
    }
    
    return await query.orderBy(desc(sql`COALESCE(${bookings.pickupDateTime}, ${receivables.dueDate})`));
  } catch (error) {
    console.error('[getReceivablesList] Error:', error);
    return [];
  }
}

export async function getReceivablesStats(): Promise<any> {
  const db = await getDb();
  if (!db) {
    console.warn('[getReceivablesStats] Database not available');
    return { total: 0, pending: 0, partial: 0, paid: 0, totalAmount: 0, remainingAmount: 0 };
  }
  
  try {
    const result = await db
      .select({
        status: receivables.status,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(${receivables.amount})`,
        remainingAmount: sql<number>`SUM(${receivables.remainingAmount})`,
      })
      .from(receivables)
      .groupBy(receivables.status);
    
    if (!result || !Array.isArray(result)) {
      console.warn('[getReceivablesStats] Invalid result from database');
      return { total: 0, pending: 0, partial: 0, paid: 0, totalAmount: 0, remainingAmount: 0 };
    }
    
    const stats = {
      total: 0,
      pending: 0,
      partial: 0,
      paid: 0,
      totalAmount: 0,
      remainingAmount: 0,
    };
    
    result.forEach((row: any) => {
      if (!row) return;
      const count = Number(row.count) || 0;
      const totalAmount = Number(row.totalAmount) || 0;
      const remainingAmount = Number(row.remainingAmount) || 0;
      
      stats.total += count;
      stats.totalAmount += totalAmount;
      
      if (row.status === 'pending' || row.status === 'partial') {
        stats.remainingAmount += remainingAmount;
      }
      
      if (row.status === 'pending') stats.pending = count;
      else if (row.status === 'partial') stats.partial = count;
      else if (row.status === 'paid') stats.paid = count;
    });
    
    return stats;
  } catch (error) {
    console.error("[Database] Failed to get receivables stats:", error);
    return { total: 0, pending: 0, partial: 0, paid: 0, totalAmount: 0, remainingAmount: 0 };
  }
}

// ============================================================================
// PAYMENTS (الدفعات) - Helper Functions
// ============================================================================

export async function createPayment(data: InsertPayment): Promise<Payment | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create payment: database not available");
    return null;
  }

  try {
    // إدراج الدفعة
    await db.insert(payments).values(data);
    
    // تحديث جدول receivables بالمبلغ المدفوع
    if (data.receivableId) {
      const receivable = await db.select().from(receivables).where(eq(receivables.id, data.receivableId)).limit(1);
      if (receivable.length > 0) {
        const r = receivable[0];
        const newPaidAmount = (Number(r.paidAmount) || 0) + Number(data.amount);
        const newRemainingAmount = Math.max(0, Number(r.amount) - newPaidAmount);
        
        await db.update(receivables).set({
          paidAmount: newPaidAmount.toString(),
          remainingAmount: newRemainingAmount.toString(),
        }).where(eq(receivables.id, data.receivableId));
      }
    }
    
    // Get the last inserted payment
    const result = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create payment:", error);
    throw error;
  }
}

export async function getPayments(): Promise<Payment[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get payments: database not available");
    return [];
  }

  try {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get payments:", error);
    return [];
  }
}

export async function getPaymentsByClientId(clientId: number): Promise<Payment[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get payments: database not available");
    return [];
  }

  try {
    return await db.select().from(payments).where(eq(payments.clientId, clientId));
  } catch (error) {
    console.error("[Database] Failed to get payments by client:", error);
    return [];
  }
}

export async function getPaymentsByReceivableId(receivableId: number): Promise<Payment[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get payments: database not available");
    return [];
  }

  try {
    return await db.select().from(payments).where(eq(payments.receivableId, receivableId));
  } catch (error) {
    console.error("[Database] Failed to get payments by receivable:", error);
    return [];
  }
}

export async function getPaymentById(id: number): Promise<Payment | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get payment: database not available");
    return null;
  }

  try {
    const result = await db.select().from(payments).where(eq(payments.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get payment:", error);
    return null;
  }
}

/**
 * Get total paid amount for a booking through its receivables
 */
export async function getTotalPaidForBooking(bookingId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    // Get all receivables for this booking
    const bookingReceivables = await db
      .select({ id: receivables.id })
      .from(receivables)
      .where(eq(receivables.bookingId, bookingId));

    if (bookingReceivables.length === 0) return 0;

    const receivableIds = bookingReceivables.map((r) => r.id);

    // Sum all payments for these receivables
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0)` })
      .from(payments)
      .where(
        or(
          ...receivableIds.map((id) => eq(payments.receivableId, id))
        )
      );

    return result[0]?.total || 0;
  } catch (error) {
    console.error("[Database] Failed to get total paid for booking:", error);
    return 0;
  }
}


// ============================================================================
// INVOICES (الفواتير) - Helper Functions
// ============================================================================

export async function createInvoice(data: InsertInvoice): Promise<Invoice | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create invoice: database not available");
    return null;
  }

  try {
    await db.insert(invoices).values(data);
    
    // Get the last inserted invoice
    const result = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create invoice:", error);
    throw error;
  }
}

export async function getInvoices(): Promise<Invoice[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get invoices: database not available");
    return [];
  }

  try {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get invoices:", error);
    return [];
  }
}

export async function getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get invoices: database not available");
    return [];
  }

  try {
    return await db.select().from(invoices).where(eq(invoices.clientId, clientId));
  } catch (error) {
    console.error("[Database] Failed to get invoices by client:", error);
    return [];
  }
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get invoice: database not available");
    return null;
  }

  try {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get invoice:", error);
    return null;
  }
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update invoice: database not available");
    return null;
  }

  try {
    await db.update(invoices).set(data).where(eq(invoices.id, id));
    return await getInvoiceById(id);
  } catch (error) {
    console.error("[Database] Failed to update invoice:", error);
    throw error;
  }
}

export async function deleteInvoice(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete invoice: database not available");
    return false;
  }

  try {
    await db.delete(invoices).where(eq(invoices.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete invoice:", error);
    return false;
  }
}

export async function getInvoicesByStatus(status: string): Promise<Invoice[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get invoices: database not available");
    return [];
  }

  try {
    return await db.select().from(invoices).where(eq(invoices.status, status as any));
  } catch (error) {
    console.error("[Database] Failed to get invoices by status:", error);
    return [];
  }
}


// Delete Receivable
export async function deleteReceivable(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete receivable: database not available");
    return false;
  }

  try {
    // Get the receivable to find related data
    const receivable = await db.select().from(receivables).where(eq(receivables.id, id)).limit(1);
    if (receivable.length === 0) {
      console.warn("[Database] Receivable not found:", id);
      return true;
    }

    // 1. Delete payments for this receivable first
    await db.delete(payments).where(eq(payments.receivableId, id));
    
    // 2. Delete the receivable
    await db.delete(receivables).where(eq(receivables.id, id));
    
    console.log('[deleteReceivable] Receivable deleted successfully:', id);
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete receivable:", error);
    return false;
  }
}

// Delete Payment
export async function deletePayment(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete payment: database not available");
    return false;
  }

  try {
    // Get the payment first
    const paymentResult = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    const paymentToDelete = paymentResult.length > 0 ? paymentResult[0] : null;

    if (paymentToDelete && paymentToDelete.receivableId) {
      // Get the receivable
      const receivableResult = await db.select().from(receivables).where(eq(receivables.id, paymentToDelete.receivableId)).limit(1);
      const receivable = receivableResult.length > 0 ? receivableResult[0] : null;

      if (receivable) {
        // Update remaining amount by adding back the payment amount
        const newRemainingAmount = (Number(receivable.remainingAmount) + Number(paymentToDelete.amount)).toString();
        await db.update(receivables)
          .set({ remainingAmount: newRemainingAmount })
          .where(eq(receivables.id, paymentToDelete.receivableId));
      }
    }

    // Delete the payment
    await db.delete(payments).where(eq(payments.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete payment:", error);
    return false;
  }
}


// ============================================================================
// SMART PAYMENTS (الدفعات الذكية) - Helper Functions
// ============================================================================

/**
 * Process a smart payment that automatically allocates payment to oldest receivables first
 * @param clientId - Client ID
 * @param amount - Payment amount
 * @param paymentMethod - Payment method (cash, card, transfer, check, other)
 * @param referenceNumber - Optional reference number (for checks or transfers)
 * @param notes - Optional notes
 * @returns Array of created payments
 */
export async function processSmartPayment(
  clientId: number,
  amount: number,
  paymentMethod: "cash" | "card" | "transfer" | "check" | "other",
  referenceNumber?: string,
  notes?: string
): Promise<Payment[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot process smart payment: database not available");
    return [];
  }

  try {
    // Get all pending/partial receivables for this client, ordered by creation date (oldest first)
    const clientReceivables = await db
      .select()
      .from(receivables)
      .where(
        and(
          eq(receivables.clientId, clientId),
          sql`status IN ('pending', 'partial')`
        )
      )
      .orderBy(receivables.createdAt);

    const createdPayments: Payment[] = [];
    let remainingAmount = amount;

    // Allocate payment to each receivable starting from the oldest
    for (const receivable of clientReceivables) {
      if (remainingAmount <= 0) break;

      const receivableRemaining = Number(receivable.remainingAmount);
      const paymentForThisReceivable = Math.min(remainingAmount, receivableRemaining);

      // Create payment record
      const paymentData: InsertPayment = {
        receivableId: receivable.id,
        clientId: clientId,
        amount: paymentForThisReceivable.toString() as any,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        paymentDate: new Date(),
      };

      const payment = await createPayment(paymentData);
      if (payment) {
        createdPayments.push(payment);
      }

      // Update receivable
      const newPaidAmount = Number(receivable.paidAmount) + paymentForThisReceivable;
      const newRemainingAmount = receivableRemaining - paymentForThisReceivable;
      const newStatus =
        newRemainingAmount <= 0
          ? "paid"
          : newPaidAmount > 0
            ? "partial"
            : "pending";

      await updateReceivable(receivable.id, {
        paidAmount: newPaidAmount as any,
        remainingAmount: Math.max(0, newRemainingAmount) as any,
        status: newStatus as any,
      });

      remainingAmount -= paymentForThisReceivable;
    }

    return createdPayments;
  } catch (error) {
    console.error("[Database] Failed to process smart payment:", error);
    throw error;
  }
}

/**
 * Get pending/partial receivables for a client (oldest first)
 */
export async function getPendingReceivablesByClientId(clientId: number): Promise<Receivable[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get pending receivables: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(receivables)
      .where(
        and(
          eq(receivables.clientId, clientId),
          sql`status IN ('pending', 'partial', 'paid')`
        )
      )
      .orderBy(receivables.createdAt);
  } catch (error) {
    console.error("[Database] Failed to get pending receivables:", error);
    return [];
  }
}

// ============================================================================
// CLIENT ACCOUNT STATEMENT (حركة حساب العميل) - Helper Functions
// ============================================================================

export interface ClientAccountTransaction {
  id: string;
  type: "booking" | "payment" | "expense" | "income";
  description: string;
  amount: number;
  date: Date;
  status: string;
  reference?: string;
}

export async function getClientAccountStatement(
  clientId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ClientAccountTransaction[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get client account statement: database not available");
    return [];
  }

  try {
    const accountTransactions: ClientAccountTransaction[] = [];

    // 1. Get payments (سدادات)
    const paymentQuery = db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        referenceNumber: payments.referenceNumber,
      })
      .from(payments)
      .where(eq(payments.clientId, clientId));

    const paymentResults = await paymentQuery;
    
    paymentResults.forEach((payment: any) => {
      const paymentDate = new Date(payment.paymentDate);
      if ((!startDate || paymentDate >= startDate) && (!endDate || paymentDate <= endDate)) {
        accountTransactions.push({
          id: `payment-${payment.id}`,
          type: "payment",
          description: `سداد - ${payment.paymentMethod}`,
          amount: -Number(payment.amount), // Negative for payments
          date: paymentDate,
          status: "paid",
          reference: payment.referenceNumber,
        });
      }
    });

    // 2. Get income/expenses linked to this client
    const transactionQuery = db
      .select({
        id: transactions.id,
        transactionType: transactions.transactionType,
        category: transactions.category,
        amount: transactions.amount,
        description: transactions.description,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(and(eq(transactions.clientId, clientId), isNotNull(transactions.clientId)));

    const transactionResults = await transactionQuery;
    
    transactionResults.forEach((trans: any) => {
      const transDate = new Date(trans.transactionDate);
      if ((!startDate || transDate >= startDate) && (!endDate || transDate <= endDate)) {
        const amount = trans.transactionType === "revenue" ? Number(trans.amount) : -Number(trans.amount);
        accountTransactions.push({
          id: `transaction-${trans.id}`,
          type: trans.transactionType === "revenue" ? "income" : "expense",
          description: `${trans.transactionType === "revenue" ? "دخل" : "مصروف"} - ${trans.category}${trans.description ? " (" + trans.description + ")" : ""}`,
          amount: amount,
          date: transDate,
          status: "confirmed",
          reference: trans.category,
        });
      }
    });
    
    console.log(`[Database] Client ${clientId} account statement: ${accountTransactions.length} transactions found`);

    // Sort by date (newest first)
    accountTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    return accountTransactions;
  } catch (error) {
    console.error("[Database] Failed to get client account statement:", error);
    return [];
  }
}

export async function getClientAccountBalance(clientId: number, startDate?: Date, endDate?: Date): Promise<{
  totalIncome: number;
  totalPayments: number;
  totalExpenses: number;
  balance: number;
}> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get client balance: database not available");
    return { totalIncome: 0, totalPayments: 0, totalExpenses: 0, balance: 0 };
  }

  try {
    // Build conditions for date filtering
    const bookingConditions = [eq(bookings.clientId, clientId)];
    if (startDate) {
      bookingConditions.push(gte(bookings.createdAt, startDate));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      bookingConditions.push(lte(bookings.createdAt, endOfDay));
    }
    
    // Get total bookings (income)
    const bookingResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${bookings.fare}), 0)` })
      .from(bookings)
      .where(and(...bookingConditions));
    
    const totalIncome = Number(bookingResult[0]?.total || 0);

    // Get total revenue transactions (additional income)
    const revenueConditions = [eq(transactions.transactionType, "revenue"), eq(transactions.clientId, clientId)];
    if (startDate) {
      revenueConditions.push(gte(transactions.createdAt, startDate));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      revenueConditions.push(lte(transactions.createdAt, endOfDay));
    }
    
    const revenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(...revenueConditions));
    
    const totalRevenue = Number(revenueResult[0]?.total || 0);
    const totalIncomeWithRevenue = totalIncome + totalRevenue;

    // Get total payments
    const paymentConditions = [eq(payments.clientId, clientId)];
    if (startDate) {
      paymentConditions.push(gte(payments.createdAt, startDate));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      paymentConditions.push(lte(payments.createdAt, endOfDay));
    }
    
    const paymentResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(and(...paymentConditions));
    
    const totalPayments = Number(paymentResult[0]?.total || 0);

    // Get total expenses (if any)
    const expenseConditions = [eq(transactions.transactionType, "expense")];
    if (startDate) {
      expenseConditions.push(gte(transactions.createdAt, startDate));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      expenseConditions.push(lte(transactions.createdAt, endOfDay));
    }
    
    const expenseResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(...expenseConditions));
    
    const totalExpenses = Number(expenseResult[0]?.total || 0);

    const balance = totalIncomeWithRevenue - totalPayments - totalExpenses;

    return {
      totalIncome: totalIncomeWithRevenue,
      totalPayments,
      totalExpenses,
      balance,
    };
  } catch (error) {
    console.error("[Database] Failed to get client balance:", error);
    return { totalIncome: 0, totalPayments: 0, totalExpenses: 0, balance: 0 };
  }
}

// Overdue Receivables Functions
export async function getOverdueReceivables(daysOverdue: number = 0) {
  try {
    const db = await getDb();
    if (!db) return [];

    const today = new Date();
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - daysOverdue);

    const result = await db
      .select({
        id: receivables.id,
        clientId: receivables.clientId,
        customerName: clients.name,
        customerPhone: clients.phone,
        customerEmail: clients.email,
        bookingId: receivables.bookingId,
        amount: receivables.amount,
        remainingAmount: receivables.remainingAmount,
        dueDate: receivables.dueDate,
        status: receivables.status,
        notes: receivables.notes,
        createdAt: receivables.createdAt,
        daysOverdue: sql<number>`CAST(DATEDIFF(CURDATE(), ${receivables.dueDate}) AS SIGNED)`,
      })
      .from(receivables)
      .leftJoin(clients, eq(receivables.clientId, clients.id))
      .where(
        and(
          lt(receivables.dueDate, overdueDate),
          eq(receivables.status, "pending")
        )
      )
      .orderBy(desc(sql<number>`DATEDIFF(CURDATE(), ${receivables.dueDate})`))

    return result;
  } catch (error) {
    console.error("[Database] Failed to get overdue receivables:", error);
    return [];
  }
}

export async function getOverdueStats() {
  try {
    const db = await getDb();
    if (!db) return { totalOverdue: 0, count: 0, averageOverdue: 0 };

    const result = await db
      .select({
        totalOverdue: sql<number>`COALESCE(SUM(${receivables.remainingAmount}), 0)`,
        count: sql<number>`COUNT(${receivables.id})`,
        averageOverdue: sql<number>`COALESCE(AVG(DATEDIFF(CURDATE(), ${receivables.dueDate})), 0)`,
      })
      .from(receivables)
      .where(
        and(
          lt(receivables.dueDate, new Date()),
          eq(receivables.status, "pending")
        )
      );

    const stats = result[0];
    return {
      totalOverdue: Number(stats.totalOverdue) || 0,
      count: Number(stats.count) || 0,
      averageOverdue: Math.round(Number(stats.averageOverdue) || 0),
    };
  } catch (error) {
    console.error("[Database] Failed to get overdue stats:", error);
    return { totalOverdue: 0, count: 0, averageOverdue: 0 };
  }
}

export async function getOverdueReceivablesByCustomer(customerId: string) {
  try {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        id: receivables.id,
        clientId: receivables.clientId,
        customerName: clients.name,
        amount: receivables.amount,
        remainingAmount: receivables.remainingAmount,
        dueDate: receivables.dueDate,
        status: receivables.status,
        daysOverdue: sql<number>`CAST(DATEDIFF(CURDATE(), ${receivables.dueDate}) AS SIGNED)`,
      })
      .from(receivables)
      .leftJoin(clients, eq(receivables.clientId, clients.id))
      .where(
        and(
          eq(receivables.clientId, parseInt(customerId)),
          lt(receivables.dueDate, new Date()),
          eq(receivables.status, "pending")
        )
      )
      .orderBy(desc(receivables.dueDate));

    return result;
  } catch (error) {
    console.error("[Database] Failed to get overdue receivables by customer:", error);
    return [];
  }
}


/**
 * Get the latest vehicle location for tracking
 */
export async function getLatestVehicleLocation(vehicleId: number) {
  try {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(vehicleLocations)
      .where(eq(vehicleLocations.vehicleId, vehicleId))
      .orderBy(desc(vehicleLocations.timestamp))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get latest vehicle location:", error);
    return null;
  }
}


// ============================================
// Expense Category Management Functions
// ============================================

export async function getExpenseByCategoryId(categoryId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const category = await db.select().from(expenseCategories).where(eq(expenseCategories.id, categoryId)).limit(1);
  if (!category[0]) return [];
  
  const categoryName = category[0].name;
  
  return db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      vehicleId: transactions.vehicleId,
      driverId: transactions.driverId,
      transactionDate: transactions.transactionDate,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.transactionType, "expense"),
        eq(transactions.category, categoryName),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .orderBy(desc(transactions.transactionDate));
}

export async function getTotalExpenseByCategory(categoryId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return 0;
  
  const category = await db.select().from(expenseCategories).where(eq(expenseCategories.id, categoryId)).limit(1);
  if (!category[0]) return 0;
  
  const categoryName = category[0].name;
  
  const conditions = [
    eq(transactions.transactionType, "expense"),
    eq(transactions.category, categoryName),
  ];
  
  if (startDate) {
    conditions.push(gte(transactions.transactionDate, startDate));
  }
  
  if (endDate) {
    conditions.push(lte(transactions.transactionDate, endDate));
  }
  
  const result = await db
    .select({ total: sql<number>`SUM(${transactions.amount})` })
    .from(transactions)
    .where(and(...conditions));
  
  return result[0]?.total || 0;
}

export async function updateExpenseCategory(categoryId: number, data: Partial<typeof expenseCategories.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(expenseCategories).set(data).where(eq(expenseCategories.id, categoryId));
}

export async function deleteExpenseCategory(categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(expenseCategories).where(eq(expenseCategories.id, categoryId));
}

export async function seedExpenseCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const predefinedCategories = [
    {
      name: "بنزين",
      description: "تكاليف الوقود والبنزين",
      color: "#f59e0b",
      icon: "Fuel",
    },
    {
      name: "غسيل",
      description: "تكاليف غسيل وتنظيف المركبات",
      color: "#3b82f6",
      icon: "Droplets",
    },
    {
      name: "زيت",
      description: "تكاليف الزيت والسوائل",
      color: "#8b5cf6",
      icon: "Droplet",
    },
    {
      name: "قطع غيار",
      description: "تكاليف قطع الغيار والملحقات",
      color: "#ec4899",
      icon: "Wrench",
    },
    {
      name: "بدل مبيت",
      description: "بدل المبيت والسكن للسائقين",
      color: "#06b6d4",
      icon: "Home",
    },
    {
      name: "بدل مواقف",
      description: "رسوم المواقف والجراج",
      color: "#14b8a6",
      icon: "ParkingCircle",
    },
    {
      name: "طباعة ورق",
      description: "تكاليف الطباعة والورق والمستندات",
      color: "#6366f1",
      icon: "FileText",
    },
    {
      name: "إيجار الباص",
      description: "تكاليف إيجار المركبات",
      color: "#f97316",
      icon: "Truck",
    },
  ];
  
  // Check if categories already exist
  const existing = await db.select().from(expenseCategories);
  if (existing.length > 0) {
    console.log("[Database] Expense categories already seeded");
    return;
  }
  
  // Insert predefined categories
  for (const category of predefinedCategories) {
    await db.insert(expenseCategories).values(category);
  }
  
  console.log("[Database] Expense categories seeded successfully");
}


// Get monthly receivables breakdown
export async function getMonthlyReceivablesBreakdown(year: number, month: number) {
  const db = await getDb();
  if (!db) return { current: 0, future: 0, total: 0 };
  
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  
  try {
    const result = await db
      .select({
        type: sql<string>`CASE WHEN ${bookings.pickupDateTime} <= NOW() THEN 'current' ELSE 'future' END`,
        total: sql<number>`SUM(CAST(${receivables.amount} AS DECIMAL(10, 2)))`,
      })
      .from(receivables)
      .leftJoin(bookings, eq(receivables.bookingId, bookings.id))
      .where(
        and(
          or(eq(receivables.status, "pending"), eq(receivables.status, "partial")),
          gte(bookings.pickupDateTime, startOfMonth),
          lte(bookings.pickupDateTime, endOfMonth)
        )
      )
      .groupBy(sql`CASE WHEN ${bookings.pickupDateTime} <= NOW() THEN 'current' ELSE 'future' END`);
    
    let current = 0;
    let future = 0;
    
    for (const row of result) {
      if (row.type === "current") {
        current = parseFloat(row.total?.toString() || "0");
      } else if (row.type === "future") {
        future = parseFloat(row.total?.toString() || "0");
      }
    }
    
    return {
      current,
      future,
      total: current + future,
    };
  } catch (error) {
    console.error("[getMonthlyReceivablesBreakdown] Error:", error);
    return { current: 0, future: 0, total: 0 };
  }
}


// ============ COMPREHENSIVE FINANCIAL DASHBOARD ============

/**
 * Get daily financial summary (today's revenue, expenses, and net profit)
 */
export async function getDailyFinancialSummary() {
  const db = await getDb();
  if (!db) return { revenue: 0, expenses: 0, netProfit: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  try {
    // Get daily revenue
    const revenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, today),
          lt(transactions.transactionDate, tomorrow)
        )
      );
    
    // Get daily expenses
    const expenseResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, today),
          lt(transactions.transactionDate, tomorrow)
        )
      );
    
    const revenue = parseFloat(revenueResult[0]?.total?.toString() || "0");
    const expenses = parseFloat(expenseResult[0]?.total?.toString() || "0");
    const netProfit = revenue - expenses;
    
    return { revenue, expenses, netProfit };
  } catch (error) {
    console.error("[getDailyFinancialSummary] Error:", error);
    return { revenue: 0, expenses: 0, netProfit: 0 };
  }
}

/**
 * Get year-to-date financial summary
 */
export async function getYearToDateFinancialSummary() {
  const db = await getDb();
  if (!db) return { revenue: 0, expenses: 0, netProfit: 0, monthlyBreakdown: [] };
  
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  
  try {
    // Get YTD revenue
    const revenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, startOfYear),
          lte(transactions.transactionDate, now)
        )
      );
    
    // Get YTD expenses
    const expenseResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, startOfYear),
          lte(transactions.transactionDate, now)
        )
      );
    
    // Get monthly breakdown - use a simpler approach to avoid GROUP BY issues
    const monthlyBreakdown: Array<{ month: number; revenue: number; expenses: number; netProfit: number }> = [];
    
    // Get data for each month
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(now.getFullYear(), month - 1, 1);
      const monthEnd = new Date(now.getFullYear(), month, 0, 23, 59, 59);
      
      // Only process months up to current month
      if (monthStart > now) break;
      
      const monthRevenueResult = await db
        .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.transactionType, "revenue"),
            gte(transactions.transactionDate, monthStart),
            lte(transactions.transactionDate, monthEnd)
          )
        );
      
      const monthExpenseResult = await db
        .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.transactionType, "expense"),
            gte(transactions.transactionDate, monthStart),
            lte(transactions.transactionDate, monthEnd)
          )
        );
      
      const monthRevenue = parseFloat(monthRevenueResult[0]?.total?.toString() || "0");
      const monthExpenses = parseFloat(monthExpenseResult[0]?.total?.toString() || "0");
      
      monthlyBreakdown.push({
        month,
        revenue: monthRevenue,
        expenses: monthExpenses,
        netProfit: monthRevenue - monthExpenses,
      });
    }
    
    const revenue = parseFloat(revenueResult[0]?.total?.toString() || "0");
    const expenses = parseFloat(expenseResult[0]?.total?.toString() || "0");
    const netProfit = revenue - expenses;
    
    const breakdown = monthlyBreakdown;
    
    return { revenue, expenses, netProfit, monthlyBreakdown: breakdown };
  } catch (error) {
    console.error("[getYearToDateFinancialSummary] Error:", error);
    return { revenue: 0, expenses: 0, netProfit: 0, monthlyBreakdown: [] };
  }
}

/**
 * Get booking profit analysis (completed vs pending)
 */
export async function getBookingProfitAnalysis() {
  const db = await getDb();
  if (!db) return { completedCount: 0, completedProfit: 0, pendingCount: 0, expectedProfit: 0 };
  
  const now = new Date();
  
  try {
    // Get completed bookings (past bookings)
    const completedResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
        profit: sql<number>`COALESCE(SUM(CAST(${bookings.fare} AS DECIMAL(10, 2))), 0)`,
      })
      .from(bookings)
      .where(lt(bookings.pickupDateTime, now));
    
    // Get pending bookings (future bookings)
    const pendingResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
        profit: sql<number>`COALESCE(SUM(CAST(${bookings.fare} AS DECIMAL(10, 2))), 0)`,
      })
      .from(bookings)
      .where(gte(bookings.pickupDateTime, now));
    
    const completedCount = completedResult[0]?.count || 0;
    const completedProfit = parseFloat(completedResult[0]?.profit?.toString() || "0");
    const pendingCount = pendingResult[0]?.count || 0;
    const expectedProfit = parseFloat(pendingResult[0]?.profit?.toString() || "0");
    
    return { completedCount, completedProfit, pendingCount, expectedProfit };
  } catch (error) {
    console.error("[getBookingProfitAnalysis] Error:", error);
    return { completedCount: 0, completedProfit: 0, pendingCount: 0, expectedProfit: 0 };
  }
}

/**
 * Get comprehensive financial overview for dashboard
 */
export async function getComprehensiveFinancialOverview() {
  try {
    const [daily, ytd, bookingAnalysis, receivables] = await Promise.all([
      getDailyFinancialSummary(),
      getYearToDateFinancialSummary(),
      getBookingProfitAnalysis(),
      getSplitReceivables(),
    ]);
    
    return {
      daily,
      ytd,
      bookingAnalysis,
      receivables,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("[getComprehensiveFinancialOverview] Error:", error);
    return {
      daily: { revenue: 0, expenses: 0, netProfit: 0 },
      ytd: { revenue: 0, expenses: 0, netProfit: 0, monthlyBreakdown: [] },
      bookingAnalysis: { completedCount: 0, completedProfit: 0, pendingCount: 0, expectedProfit: 0 },
      receivables: { current: 0, future: 0 },
      timestamp: new Date(),
    };
  }
}

/**
 * Get financial summary by date range
 */
export async function getFinancialSummaryByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { revenue: 0, expenses: 0, netProfit: 0, byCategory: [] };
  
  try {
    // Get revenue
    const revenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    // Get expenses
    const expenseResult = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    // Get by category
    const byCategory = await db
      .select({
        category: transactions.category,
        type: transactions.transactionType,
        total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)`,
      })
      .from(transactions)
      .where(
        and(
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      )
      .groupBy(transactions.category, transactions.transactionType);
    
    const revenue = parseFloat(revenueResult[0]?.total?.toString() || "0");
    const expenses = parseFloat(expenseResult[0]?.total?.toString() || "0");
    const netProfit = revenue - expenses;
    
    return { revenue, expenses, netProfit, byCategory };
  } catch (error) {
    console.error("[getFinancialSummaryByDateRange] Error:", error);
    return { revenue: 0, expenses: 0, netProfit: 0, byCategory: [] };
  }
}

/**
 * Get accounts summary (what you owe and what you're owed)
 */
export async function getAccountsSummary() {
  const db = await getDb();
  if (!db) return { receivables: 0, payables: 0, netPosition: 0 };
  
  try {
    // Get total receivables from bookings (actual revenue from bookings)
    const receivablesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${bookings.fare} AS DECIMAL(10, 2))), 0)`,
      })
      .from(bookings);
    
    // Get total payables (what we owe to suppliers/partners)
    // This would come from expenses marked as payable or from a payables table if it exists
    const payablesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          isNotNull(transactions.notes)
          // You might want to add a specific marker for payables
        )
      );
    
    const receivablesAmount = parseFloat(receivablesResult[0]?.total?.toString() || "0");
    
    console.log("[getAccountsSummary] Receivables from bookings:", receivablesAmount);
    const payablesAmount = parseFloat(payablesResult[0]?.total?.toString() || "0");
    const netPosition = receivablesAmount - payablesAmount;
    
    console.log("[getAccountsSummary] Summary - Receivables:", receivablesAmount, "Payables:", payablesAmount, "NetPosition:", netPosition);
    
    return {
      receivables: receivablesAmount,
      payables: payablesAmount,
      netPosition: netPosition,
    };
  } catch (error) {
    console.error("[getAccountsSummary] Error:", error);
    return { receivables: 0, payables: 0, netPosition: 0 };
  }
}


/**
 * Get current month revenue (all income: cash + receivables)
 */
export async function getMonthlyRevenue() {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, startOfMonth),
          lte(transactions.transactionDate, endOfMonth)
        )
      );
    
    return parseFloat((result[0]?.total || 0).toString());
  } catch (error) {
    console.error("[getMonthlyRevenue] Error:", error);
    return 0;
  }
}

/**
 * Get current month expenses
 */
export async function getMonthlyExpenses() {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, startOfMonth),
          lte(transactions.transactionDate, endOfMonth)
        )
      );
    
    return parseFloat((result[0]?.total || 0).toString());
  } catch (error) {
    console.error("[getMonthlyExpenses] Error:", error);
    return 0;
  }
}

/**
 * Get all pending and future operations from today onwards
 */
export async function getFutureOperations() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        customerName: bookings.customerName,
        pickupDateTime: bookings.pickupDateTime,
        dropoffLocation: bookings.dropoffLocation,
        fare: bookings.fare,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          or(
            eq(bookings.status, "pending"),
            eq(bookings.status, "confirmed"),
            eq(bookings.status, "in_progress")
          ),
          gte(bookings.pickupDateTime, today)
        )
      )
      .orderBy(desc(bookings.pickupDateTime));
    
    return result;
  } catch (error) {
    console.error("[getFutureOperations] Error:", error);
    return [];
  }
}


// ==================== Monthly Profits Functions ====================

/**
 * Get monthly profits for all months
 * Returns profit for each month (revenue - expenses)
 */
export async function getMonthlyProfits() {
  const database = await getDb();
  if (!database) return [];
  
  try {
    // Get all transactions grouped by month
    const monthlyData = await database
      .select({
        month: sql<string>`DATE_TRUNC('month', ${transactions.transactionDate})`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${eq(transactions.transactionType, 'revenue')} THEN CAST(${transactions.amount} AS DECIMAL(10, 2)) ELSE 0 END), 0)`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${eq(transactions.transactionType, 'expense')} THEN CAST(${transactions.amount} AS DECIMAL(10, 2)) ELSE 0 END), 0)`,
      })
      .from(transactions)
      .groupBy(sql`DATE_TRUNC('month', ${transactions.transactionDate})`)
      .orderBy(sql`DATE_TRUNC('month', ${transactions.transactionDate}) DESC`);

    // Format the results
    return monthlyData.map((item: any) => {
      const revenue = Number(item.revenue) || 0;
      const expenses = Number(item.expenses) || 0;
      const profit = revenue - expenses;
      
      return {
        month: item.month ? new Date(item.month).toLocaleDateString('ar-JO', { year: 'numeric', month: 'long' }) : 'Unknown',
        monthDate: item.month || new Date().toISOString(),
        revenue: parseFloat(revenue.toFixed(2)),
        expenses: parseFloat(expenses.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
      };
    });
  } catch (error) {
    console.error('[getMonthlyProfits] Error:', error);
    return [];
  }
}

/**
 * Get actual profit by date range (only completed transactions)
 * @param startDate - Start date
 * @param endDate - End date
 */
export async function getActualProfitByDateRange(startDate: Date, endDate: Date) {
  const database = await getDb();
  if (!database) return {
    startDate,
    endDate,
    revenue: 0,
    expenses: 0,
    profit: 0,
  };
  
  try {
    const result = await database
      .select({
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${eq(transactions.transactionType, 'revenue')} THEN CAST(${transactions.amount} AS DECIMAL(10, 2)) ELSE 0 END), 0)`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${eq(transactions.transactionType, 'expense')} THEN CAST(${transactions.amount} AS DECIMAL(10, 2)) ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );

    const data = result[0] || { revenue: 0, expenses: 0 };
    const revenue = Number(data.revenue) || 0;
    const expenses = Number(data.expenses) || 0;
    const profit = revenue - expenses;

    return {
      startDate,
      endDate,
      revenue: parseFloat(revenue.toFixed(2)),
      expenses: parseFloat(expenses.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
    };
  } catch (error) {
    console.error('[getActualProfitByDateRange] Error:', error);
    return {
      startDate,
      endDate,
      revenue: 0,
      expenses: 0,
      profit: 0,
    };
  }
}


// ============ EXPENSE MANAGEMENT ============

export async function createExpense(data: {
  driverId: string;
  bookingId?: string;
  amount: number;
  expenseType: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db.insert(expenses).values({
      driverId: data.driverId,
      bookingId: data.bookingId,
      amount: data.amount.toString(),
      expenseType: data.expenseType,
      description: data.description,
      status: 'pending',
    });
    return { success: true, id: (result as any).insertId };
  } catch (error) {
    console.error('[createExpense] Error:', error);
    throw error;
  }
}

export async function getPendingExpenses() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db
      .select()
      .from(expenses)
      .where(eq(expenses.status, 'pending'))
      .orderBy(desc(expenses.createdAt));
    return result;
  } catch (error) {
    console.error('[getPendingExpenses] Error:', error);
    return [];
  }
}

export async function getExpensesByDriverId(driverId: string) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db
      .select()
      .from(expenses)
      .where(eq(expenses.driverId, driverId))
      .orderBy(desc(expenses.createdAt));
    return result;
  } catch (error) {
    console.error('[getExpensesByDriverId] Error:', error);
    return [];
  }
}

export async function approveExpense(expenseId: string, approvedBy: string, paymentMethod: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db
      .update(expenses)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        paymentMethod,
      })
      .where(eq(expenses.id, expenseId));
    return { success: true };
  } catch (error) {
    console.error('[approveExpense] Error:', error);
    throw error;
  }
}

export async function rejectExpense(expenseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db
      .update(expenses)
      .set({
        status: 'rejected',
      })
      .where(eq(expenses.id, expenseId));
    return { success: true };
  } catch (error) {
    console.error('[rejectExpense] Error:', error);
    throw error;
  }
}

export async function markExpenseAsPaid(expenseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db
      .update(expenses)
      .set({
        status: 'paid',
        paidAt: new Date(),
      })
      .where(eq(expenses.id, expenseId));
    return { success: true };
  } catch (error) {
    console.error('[markExpenseAsPaid] Error:', error);
    throw error;
  }
}

export async function getMonthlyExpensesByDriver(driverId: string, year: number, month: number) {
  const db = await getDb();
  if (!db) return { total: 0, count: 0 };
  
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL(10, 2))), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.driverId, driverId),
          gte(expenses.createdAt, startDate),
          lte(expenses.createdAt, endDate),
          eq(expenses.status, 'approved')
        )
      );

    const data = result[0] || { total: 0, count: 0 };
    return {
      total: parseFloat(Number(data.total).toFixed(2)),
      count: Number(data.count),
    };
  } catch (error) {
    console.error('[getMonthlyExpensesByDriver] Error:', error);
    return { total: 0, count: 0 };
  }
}

export async function getExpensesSummary() {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, paid: 0 };
  
  try {
    const pending = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(expenses)
      .where(eq(expenses.status, 'pending'));

    const approved = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(expenses)
      .where(eq(expenses.status, 'approved'));

    const paid = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(expenses)
      .where(eq(expenses.status, 'paid'));

    return {
      pending: Number(pending[0]?.count || 0),
      approved: Number(approved[0]?.count || 0),
      paid: Number(paid[0]?.count || 0),
    };
  } catch (error) {
    console.error('[getExpensesSummary] Error:', error);
    return { pending: 0, approved: 0, paid: 0 };
  }
}


/**
 * Get revenue for a date range
 */
export async function getRevenueByDateRange(fromDate: Date, toDate: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "revenue"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    return parseFloat((result[0]?.total || 0).toString());
  } catch (error) {
    console.error("[getRevenueByDateRange] Error:", error);
    return 0;
  }
}

/**
 * Get expenses for a date range
 */
export async function getExpensesByDateRange(fromDate: Date, toDate: Date): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(10, 2))), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionType, "expense"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );
    
    return parseFloat((result[0]?.total || 0).toString());
  } catch (error) {
    console.error("[getExpensesByDateRange] Error:", error);
    return 0;
  }
}


/**
 * Get all cancelled bookings
 */
export async function getCancelledBookings() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      ...getTableColumns(bookings),
      clientName: clients.name,
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .where(eq(bookings.status, "cancelled"))
    .orderBy(desc(bookings.pickupDateTime));
  return result;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(bookingId: number, status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
  return result;
}


/**
 * Get all other transactions
 */
export async function getOtherTransactions() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(otherTransactions)
    .orderBy(desc(otherTransactions.transactionDate));
  return result;
}

/**
 * Get other transactions by type (income or expense)
 */
export async function getOtherTransactionsByType(transactionType: "income" | "expense") {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(otherTransactions)
    .where(eq(otherTransactions.transactionType, transactionType))
    .orderBy(desc(otherTransactions.transactionDate));
  return result;
}

/**
 * Create a new other transaction
 */
export async function createOtherTransaction(data: InsertOtherTransaction) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(otherTransactions)
    .values(data);
  return result;
}

/**
 * Update an other transaction
 */
export async function updateOtherTransaction(id: number, data: Partial<InsertOtherTransaction>) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .update(otherTransactions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(otherTransactions.id, id));
  return result;
}

/**
 * Delete an other transaction with cascading deletes
 * Deletes from: other_transactions, transactions, receivables
 */
export async function deleteOtherTransaction(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  try {
    // Get the other transaction first to get details
    const otherTx = await db
      .select()
      .from(otherTransactions)
      .where(eq(otherTransactions.id, id))
      .limit(1);
    
    if (!otherTx || otherTx.length === 0) {
      return undefined;
    }
    
    const tx = otherTx[0];
    
    // Delete from receivables if this is income
    if (tx.transactionType === "income" && tx.clientId) {
      await db
        .delete(receivables)
        .where(
          and(
            eq(receivables.clientId, tx.clientId),
            eq(receivables.bookingId, 0), // Other transactions have bookingId = 0
            // Match by amount and date to be safe
            eq(receivables.amount, tx.amount)
          )
        );
    }
    
    // Delete from transactions table (non-booking transactions)
    if (tx.clientId) {
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.clientId, tx.clientId),
            eq(transactions.isFromBooking, false),
            eq(transactions.amount, tx.amount),
            eq(transactions.category, tx.type)
          )
        );
    } else if (tx.driverId) {
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.driverId, tx.driverId),
            eq(transactions.isFromBooking, false),
            eq(transactions.amount, tx.amount),
            eq(transactions.category, tx.type)
          )
        );
    }
    
    // Finally delete from other_transactions
    const result = await db
      .delete(otherTransactions)
      .where(eq(otherTransactions.id, id));
    
    console.log(`[Database] Deleted other transaction ${id} with cascading deletes`);
    return result;
  } catch (error) {
    console.error(`[Database] Error deleting other transaction ${id}:`, error);
    throw error;
  }
}

/**
 * Get other transactions for a specific client
 */
export async function getOtherTransactionsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(otherTransactions)
    .where(eq(otherTransactions.clientId, clientId))
    .orderBy(desc(otherTransactions.transactionDate));
  return result;
}

/**
 * Get other transactions for a specific driver
 */
export async function getOtherTransactionsByDriver(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(otherTransactions)
    .where(eq(otherTransactions.driverId, driverId))
    .orderBy(desc(otherTransactions.transactionDate));
  return result;
}

/**
 * Get other income transactions
 */
export async function getOtherIncome() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(otherTransactions)
    .where(eq(otherTransactions.transactionType, "income"))
    .orderBy(desc(otherTransactions.transactionDate));
  return result;
}

/**
 * Get other expenses transactions
 */
export async function getOtherExpenses() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(otherTransactions)
    .where(eq(otherTransactions.transactionType, "expense"))
    .orderBy(desc(otherTransactions.transactionDate));
  return result;
}

/**
 * Get total other income
 */
export async function getTotalOtherIncome() {
  const db = await getDb();
  if (!db) return "0";
  const result = await db
    .select({ total: sql<string>`SUM(amount)` })
    .from(otherTransactions)
    .where(eq(otherTransactions.transactionType, "income"));
  return result[0]?.total || "0";
}

/**
 * Get total other expenses
 */
export async function getTotalOtherExpenses() {
  const db = await getDb();
  if (!db) return "0";
  const result = await db
    .select({ total: sql<string>`SUM(amount)` })
    .from(otherTransactions)
    .where(eq(otherTransactions.transactionType, "expense"));
  return result[0]?.total || "0";
}


