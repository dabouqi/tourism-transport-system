import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  datetime,
  boolean,
} from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";

/**
 * Core user table backing auth flow with role-based access control.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "operations_manager", "booking_clerk"]).default("booking_clerk").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Vehicles table for fleet management
 */
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  licensePlate: varchar("licensePlate", { length: 50 }).notNull().unique(),
  vehicleType: varchar("vehicleType", { length: 100 }).notNull(), // e.g., "سيارة سيدان", "حافلة"
  model: varchar("model", { length: 100 }).notNull(),
  year: int("year").notNull(),
  capacity: int("capacity").notNull(), // Number of passengers
  status: mysqlEnum("status", ["available", "in_trip", "maintenance", "inactive"]).default("available").notNull(),
  fuelLevel: decimal("fuelLevel", { precision: 5, scale: 2 }).default("100"), // Percentage
  lastMaintenanceDate: datetime("lastMaintenanceDate"),
  nextMaintenanceDate: datetime("nextMaintenanceDate"),
  mileage: int("mileage").default(0),
  purchaseDate: datetime("purchaseDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

/**
 * Drivers table for driver management
 */
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  licenseNumber: varchar("licenseNumber", { length: 50 }).notNull().unique(),
  licenseExpiry: datetime("licenseExpiry").notNull(),
  status: mysqlEnum("status", ["available", "on_trip", "on_leave", "inactive"]).default("available").notNull(),
  joinDate: datetime("joinDate").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

/**
 * Bookings table for booking management
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull().unique(),
  clientId: int("clientId"), // ربط بالعميل
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  pickupLocation: text("pickupLocation").notNull(),
  dropoffLocation: text("dropoffLocation").notNull(),
  pickupDateTime: datetime("pickupDateTime").notNull(),
  dropoffDateTime: datetime("dropoffDateTime"),
  numberOfPassengers: int("numberOfPassengers").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  vehicleId: int("vehicleId"),
  driverId: int("driverId"),
  fare: decimal("fare", { precision: 10, scale: 2 }).notNull(),
  flightNumber: varchar("flightNumber", { length: 50 }),
  bookingSource: mysqlEnum("bookingSource", ["internal", "talixo", "get_transfer", "transfeero", "other"]).default("internal").notNull(),
  externalPartnerBookingId: varchar("externalPartnerBookingId", { length: 100 }),
  notes: text("notes"),
  programDays: int("programDays"), // عدد أيام البرنامج
  programEndDate: datetime("programEndDate"), // تاريخ انتهاء البرنامج
  transferType: varchar("transferType", { length: 50 }), // نوع النقل (ARRIVAL, DEPARTURE)
  hotelName: varchar("hotelName", { length: 255 }), // اسم الفندق
  carrierName: varchar("carrierName", { length: 255 }), // اسم شركة النقل
  repName: varchar("repName", { length: 255 }), // اسم الممثل
  repPhone: varchar("repPhone", { length: 20 }), // رقم هاتف الممثل
  agencyName: varchar("agencyName", { length: 255 }), // اسم الوكالة
  sendWhatsApp: boolean("sendWhatsApp").default(false).notNull(), // إرسال رسالة WhatsApp
  passengerCount: int("passengerCount"), // عدد الركاب (اختياري)
  passengerNames: text("passengerNames"), // أسماء الركاب مفصولة بفواصل (اختياري)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Maintenance records table
 */
export const maintenanceRecords = mysqlTable("maintenanceRecords", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  maintenanceType: varchar("maintenanceType", { length: 100 }).notNull(), // e.g., "صيانة دورية", "إصلاح"
  description: text("description").notNull(),
  scheduledDate: datetime("scheduledDate").notNull(),
  completedDate: datetime("completedDate"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = typeof maintenanceRecords.$inferInsert;

/**
 * Alerts and notifications table
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  alertType: mysqlEnum("alertType", ["maintenance_due", "no_driver_assigned", "low_fuel", "booking_created", "urgent_maintenance"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedBookingId: int("relatedBookingId"),
  relatedVehicleId: int("relatedVehicleId"),
  relatedDriverId: int("relatedDriverId"),
  isRead: boolean("isRead").default(false),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Financial transactions table for tracking revenue and expenses
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionType: mysqlEnum("transactionType", ["revenue", "expense"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "حجز", "صيانة", "وقود"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  clientId: int("clientId"), // ربط الحركة بالعميل
  bookingId: int("bookingId"),
  vehicleId: int("vehicleId"),
  driverId: int("driverId"),
  expenseCategoryId: int("expenseCategoryId"), // ربط المصروف بفئة المصاريف
  isFromBooking: boolean("isFromBooking").default(false).notNull(), // تمييز معاملات الحجوزات
  notes: text("notes"), // ملاحظات توضيحية عن مصدر المعاملة
  transactionDate: datetime("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("clientId_idx").on(table.clientId),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Relations will be defined at the end of the file after all tables are defined

// Type for read-only booking transactions
export type BookingTransaction = Transaction & { isFromBooking: true };

/**
 * Vehicle tracking table for real-time location tracking
 */
export const vehicleTracking = mysqlTable("vehicleTracking", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }), // km/h
  heading: decimal("heading", { precision: 5, scale: 2 }), // degrees
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }), // meters
  timestamp: datetime("timestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleTracking = typeof vehicleTracking.$inferSelect;
export type InsertVehicleTracking = typeof vehicleTracking.$inferInsert;

/**
 * Income categories table for categorizing revenue sources
 */
export const incomeCategories = mysqlTable("incomeCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "حجوزات", "خدمات إضافية"
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#10b981"), // Hex color for UI
  icon: varchar("icon", { length: 50 }).default("TrendingUp"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IncomeCategory = typeof incomeCategories.$inferSelect;
export type InsertIncomeCategory = typeof incomeCategories.$inferInsert;

/**
 * Expense categories table for categorizing expenses
 */
export const expenseCategories = mysqlTable("expenseCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "صيانة", "وقود", "رواتب"
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#ef4444"), // Hex color for UI
  icon: varchar("icon", { length: 50 }).default("TrendingDown"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

/**
 * Enhanced transactions table with more fields for better tracking
 */
export const transactionsV2 = mysqlTable("transactionsV2", {
  id: int("id").autoincrement().primaryKey(),
  transactionType: mysqlEnum("transactionType", ["revenue", "expense"]).notNull(),
  incomeCategoryId: int("incomeCategoryId"), // For revenue transactions
  expenseCategoryId: int("expenseCategoryId"), // For expense transactions
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("confirmed").notNull(),
  bookingId: int("bookingId"), // For booking-related income
  vehicleId: int("vehicleId"),
  driverId: int("driverId"),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // e.g., "cash", "card", "check"
  referenceNumber: varchar("referenceNumber", { length: 100 }), // Invoice/receipt number
  notes: text("notes"),
  attachmentUrl: varchar("attachmentUrl", { length: 500 }), // For receipts/invoices
  transactionDate: datetime("transactionDate").notNull(),
  dueDate: datetime("dueDate"), // For expenses with payment terms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TransactionV2 = typeof transactionsV2.$inferSelect;
export type InsertTransactionV2 = typeof transactionsV2.$inferInsert;

/**
 * Financial summary table for quick access to monthly/yearly summaries
 */
export const financialSummaries = mysqlTable("financialSummaries", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12, or 0 for yearly
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
  totalExpenses: decimal("totalExpenses", { precision: 12, scale: 2 }).default("0"),
  netProfit: decimal("netProfit", { precision: 12, scale: 2 }).default("0"),
  profitMargin: decimal("profitMargin", { precision: 5, scale: 2 }).default("0"), // Percentage
  transactionCount: int("transactionCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialSummary = typeof financialSummaries.$inferSelect;
export type InsertFinancialSummary = typeof financialSummaries.$inferInsert;


/**
 * External partners table for managing third-party booking sources
 */
export const externalPartners = mysqlTable("externalPartners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  apiKey: varchar("apiKey", { length: 500 }),
  commissionPercentage: decimal("commissionPercentage", { precision: 5, scale: 2 }).default("0"),
  accountBalance: decimal("accountBalance", { precision: 12, scale: 2 }).default("0"),
  totalEarnings: decimal("totalEarnings", { precision: 12, scale: 2 }).default("0"),
  totalCommission: decimal("totalCommission", { precision: 12, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExternalPartner = typeof externalPartners.$inferSelect;
export type InsertExternalPartner = typeof externalPartners.$inferInsert;

/**
 * Partner transactions table for tracking all transactions from external partners
 */
export const partnerTransactions = mysqlTable("partnerTransactions", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  bookingId: int("bookingId").notNull(),
  externalBookingId: varchar("externalBookingId", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "paid", "cancelled"]).default("pending").notNull(),
  paymentDate: datetime("paymentDate"),
  notes: text("notes"),
  transactionDate: datetime("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PartnerTransaction = typeof partnerTransactions.$inferSelect;
export type InsertPartnerTransaction = typeof partnerTransactions.$inferInsert;

/**
 * Clients table for managing customers and companies
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["individual", "company"]).notNull(), // فرد أو شركة
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  taxId: varchar("taxId", { length: 50 }), // رقم الضريبة للشركات
  contactPerson: varchar("contactPerson", { length: 255 }), // اسم المسؤول
  totalBalance: decimal("totalBalance", { precision: 12, scale: 2 }).default("0"), // الرصيد الإجمالي (موجب = مستحق عليهم، سالب = لهم)
  totalPaid: decimal("totalPaid", { precision: 12, scale: 2 }).default("0"), // إجمالي ما دفعوه
  totalDue: decimal("totalDue", { precision: 12, scale: 2 }).default("0"), // إجمالي ما عليهم
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Receivables table for tracking outstanding payments
 */
export const receivables = mysqlTable("receivables", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  bookingId: int("bookingId").default(0),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // المبلغ الأصلي
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }).default("0"), // المبلغ المدفوع
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }).notNull(), // المبلغ المتبقي
  dueDate: datetime("dueDate"), // تاريخ الاستحقاق
  status: mysqlEnum("status", ["pending", "partial", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Receivable = typeof receivables.$inferSelect;
export type InsertReceivable = typeof receivables.$inferInsert;

/**
 * Payments table for tracking payments against receivables
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  receivableId: int("receivableId").notNull(),
  clientId: int("clientId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "check", "other"]).notNull(),
  referenceNumber: varchar("referenceNumber", { length: 100 }), // رقم الشيك أو التحويل
  notes: text("notes"),
  paymentDate: datetime("paymentDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Invoices table for managing invoices
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  clientId: int("clientId").notNull(),
  receivableId: int("receivableId").notNull(),
  bookingId: int("bookingId").notNull(),
  issueDate: datetime("issueDate").notNull(),
  dueDate: datetime("dueDate"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }).default("0"),
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "viewed", "paid", "overdue", "cancelled"]).default("draft").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "check", "other"]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;


// ============ RELATIONS ============

// Transactions - Clients relationship
export const transactionsClientRelation = relations(transactions, ({ one }) => ({
  client: one(clients, {
    fields: [transactions.clientId],
    references: [clients.id],
  }),
}));

export const clientsTransactionsRelation = relations(clients, ({ many }) => ({
  transactions: many(transactions),
}));


/**
 * Vehicle Locations Table - Real-time tracking
 */
export const vehicleLocations = mysqlTable("vehicleLocations", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }).default("0"),
  heading: int("heading").default(0), // 0-360 degrees
  status: mysqlEnum("status", ["idle", "moving", "stopped"]).default("idle"),
  timestamp: datetime("timestamp").default(new Date()),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }), // GPS accuracy in meters
  altitude: decimal("altitude", { precision: 6, scale: 2 }), // in meters
  batteryLevel: int("batteryLevel"), // 0-100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleLocation = typeof vehicleLocations.$inferSelect;
export type InsertVehicleLocation = typeof vehicleLocations.$inferInsert;

/**
 * Geofences Table - Defined areas for alerts
 */
export const geofences = mysqlTable("geofences", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["circle", "polygon"]).default("circle"),
  
  // Circle geofence
  centerLatitude: decimal("centerLatitude", { precision: 10, scale: 8 }),
  centerLongitude: decimal("centerLongitude", { precision: 11, scale: 8 }),
  radiusMeters: int("radiusMeters"),
  
  // Polygon geofence (stored as JSON)
  polygonPoints: text("polygonPoints"), // JSON array of {lat, lng}
  
  // Settings
  alertOnEnter: boolean("alertOnEnter").default(false),
  alertOnExit: boolean("alertOnExit").default(false),
  isActive: boolean("isActive").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = typeof geofences.$inferInsert;

/**
 * Vehicle Geofence Events - Track when vehicles enter/exit geofences
 */
export const vehicleGeofenceEvents = mysqlTable("vehicleGeofenceEvents", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  geofenceId: int("geofenceId").notNull(),
  eventType: mysqlEnum("eventType", ["enter", "exit"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  timestamp: datetime("timestamp").default(new Date()),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleGeofenceEvent = typeof vehicleGeofenceEvents.$inferSelect;
export type InsertVehicleGeofenceEvent = typeof vehicleGeofenceEvents.$inferInsert;

/**
 * Route History - Track complete routes
 */
export const routeHistory = mysqlTable("routeHistory", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  bookingId: int("bookingId"),
  startTime: datetime("startTime").notNull(),
  endTime: datetime("endTime"),
  
  // Route summary
  totalDistance: decimal("totalDistance", { precision: 10, scale: 2 }), // km
  averageSpeed: decimal("averageSpeed", { precision: 5, scale: 2 }), // km/h
  maxSpeed: decimal("maxSpeed", { precision: 5, scale: 2 }), // km/h
  
  // Stored route (compressed)
  routeData: text("routeData"), // JSON compressed
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RouteHistory = typeof routeHistory.$inferSelect;
export type InsertRouteHistory = typeof routeHistory.$inferInsert;

/**
 * Tracking Alerts - Real-time alerts for vehicle events
 */
export const trackingAlerts = mysqlTable("trackingAlerts", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  bookingId: int("bookingId"),
  
  type: varchar("type", { length: 50 }).notNull(), // pickup_arrived, dropoff_arrived, speed_limit, etc.
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  message: text("message").notNull(),
  
  // Location data
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Status
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: datetime("acknowledgedAt"),
  
  dismissed: boolean("dismissed").default(false),
  dismissedBy: int("dismissedBy"),
  dismissedAt: datetime("dismissedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrackingAlert = typeof trackingAlerts.$inferSelect;
export type InsertTrackingAlert = typeof trackingAlerts.$inferInsert;


/**
 * WhatsApp messages table for storing pending and sent messages
 */
export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 100 }).notNull().unique(),
  bookingId: varchar("bookingId", { length: 100 }).notNull(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).notNull(),
  message: text("message").notNull(),
  recipients: text("recipients").notNull(), // JSON array of phone numbers
  recipientNames: text("recipientNames").notNull(), // JSON array of names
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: datetime("sentAt"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = typeof whatsappMessages.$inferInsert;

// ============ EXPENSES (Direct Reimbursement) ============

export const expenses = mysqlTable("expenses", {
  id: varchar("id", { length: 191 }).primaryKey().default(sql`(uuid())`),
  driverId: varchar("driver_id", { length: 191 }).notNull(),
  bookingId: varchar("booking_id", { length: 191 }),
  categoryId: int("category_id"), // Reference to expenseCategories
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expenseType: varchar("expense_type", { length: 50 }).notNull(), // fuel, parking, toll, maintenance, other
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, paid
  paymentMethod: varchar("payment_method", { length: 20 }), // cash, salary_deduction, bank_transfer
  approvedBy: varchar("approved_by", { length: 191 }), // user_id of approver
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// Foreign key relationship
export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
}));

/**
 * Expense Payments table for tracking expense payments
 */
export const expensePayments = mysqlTable("expense_payments", {
  id: varchar("id", { length: 191 }).primaryKey().default(sql`(uuid())`),
  expenseId: varchar("expense_id", { length: 191 }).notNull(),
  paymentDate: datetime("payment_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // cash, salary_deduction, bank_transfer
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  referenceNumber: varchar("reference_number", { length: 100 }), // receipt number, check number, etc.
  notes: text("notes"),
  recordedBy: varchar("recorded_by", { length: 191 }).notNull(), // user_id who recorded the payment
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type ExpensePayment = typeof expensePayments.$inferSelect;
export type InsertExpensePayment = typeof expensePayments.$inferInsert;


/**
 * Email Reminders table for tracking booking reminders sent to customers
 */
export const emailReminders = mysqlTable("email_reminders", {
  id: varchar("id", { length: 191 }).primaryKey().default(sql`(uuid())`),
  bookingId: int("booking_id").notNull(),
  customerEmail: varchar("customer_email", { length: 320 }).notNull(),
  reminderType: mysqlEnum("reminder_type", ["10_hours_before", "2_hours_before"]).notNull(),
  scheduledTime: datetime("scheduled_time").notNull(),
  sentTime: datetime("sent_time"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type EmailReminder = typeof emailReminders.$inferSelect;
export type InsertEmailReminder = typeof emailReminders.$inferInsert;


/**
 * Other Income/Expenses table for tracking non-booking related transactions
 * This table stores income (like fines, penalties) and expenses that are not related to bookings
 */
export const otherTransactions = mysqlTable("other_transactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionType: mysqlEnum("transactionType", ["income", "expense"]).notNull(), // income or expense
  type: varchar("type", { length: 100 }).notNull(), // Custom type entered by user (e.g., "مخالفة", "غرامة", "دخل إضافي")
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  clientId: int("clientId"), // Link to client if applicable
  driverId: int("driverId"), // Link to driver if applicable
  description: text("description"), // Additional notes
  transactionDate: datetime("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("other_transactions_clientId_idx").on(table.clientId),
  driverIdIdx: index("other_transactions_driverId_idx").on(table.driverId),
  transactionDateIdx: index("other_transactions_date_idx").on(table.transactionDate),
}));

export type OtherTransaction = typeof otherTransactions.$inferSelect;
export type InsertOtherTransaction = typeof otherTransactions.$inferInsert;
