/**
 * Backup and Restore utilities for data export/import
 */

import { getDb } from "./db";
import { bookings, transactions, receivables, payments, clients } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    bookings: any[];
    transactions: any[];
    receivables: any[];
    payments: any[];
  };
}

/**
 * Export all data (except clients) to JSON format
 */
export async function exportData(): Promise<BackupData> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [bookingsData, transactionsData, receivablesData, paymentsData] = await Promise.all([
    db.select().from(bookings),
    db.select().from(transactions),
    db.select().from(receivables),
    db.select().from(payments),
  ]);

  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    data: {
      bookings: bookingsData,
      transactions: transactionsData,
      receivables: receivablesData,
      payments: paymentsData,
    },
  };
}

/**
 * Import data from JSON format (clears existing data first)
 */
export async function importData(backupData: BackupData): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    // Clear existing data
    await db.delete(bookings);
    await db.delete(transactions);
    await db.delete(receivables);
    await db.delete(payments);

    // Helper function to convert date strings to Date objects
    const convertDatesToObjects = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(convertDatesToObjects);
      }
      if (obj !== null && typeof obj === 'object') {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            // This is an ISO date string, convert to Date object
            converted[key] = new Date(value);
          } else if (typeof value === 'object') {
            converted[key] = convertDatesToObjects(value);
          } else {
            converted[key] = value;
          }
        }
        return converted;
      }
      return obj;
    };

    // Import new data
    if (backupData.data.bookings.length > 0) {
      const bookingsData = convertDatesToObjects(backupData.data.bookings);
      await db.insert(bookings).values(bookingsData);
    }

    if (backupData.data.transactions.length > 0) {
      const transactionsData = convertDatesToObjects(backupData.data.transactions);
      await db.insert(transactions).values(transactionsData);
    }

    if (backupData.data.receivables.length > 0) {
      const receivablesData = convertDatesToObjects(backupData.data.receivables);
      await db.insert(receivables).values(receivablesData);
    }

    if (backupData.data.payments.length > 0) {
      const paymentsData = convertDatesToObjects(backupData.data.payments);
      await db.insert(payments).values(paymentsData);
    }

    return {
      success: true,
      message: `تم استيراد البيانات بنجاح: ${backupData.data.bookings.length} حجز، ${backupData.data.transactions.length} حركة`,
    };
  } catch (error) {
    console.error("Import error:", error);
    return {
      success: false,
      message: `خطأ في استيراد البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
    };
  }
}
