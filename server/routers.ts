import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as dbReports from "./db-reports";
import { clientsRouter, receivablesRouter, paymentsRouter } from "./routers-clients-payments";
import { whatsappRouterV2 as whatsappRouter } from "./routers-whatsapp-v2";
import { expensesRouter } from "./routers-expenses";
import { reportsRouter } from "./routers-reports";
import { bookingsStatusRouter } from "./routers-bookings-status";
import * as whatsappHelper from "./whatsapp";
import { exportData, importData } from "./backup";
import { eq, or, isNull } from "drizzle-orm";
import { transactions } from "../drizzle/schema";
import { calculateBookingStatus } from "./statusCalculator";

// Helper to check admin role
const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Helper to check operations manager or admin role
const operationsProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "operations_manager")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Operations access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    getStats: publicProcedure.query(async () => {
      const [todayBookings, activeVehicles, todayRevenue, pendingOperations] = await Promise.all([
        db.getTodayBookingsCount(),
        db.getActiveVehiclesCount(),
        db.getTodayRevenue(),
        db.getPendingOperationsCount(),
      ]);

      return {
        todayBookings,
        activeVehicles,
        todayRevenue,
        pendingOperations,
      };
    }),

    getRecentAlerts: publicProcedure.query(async () => {
      const alerts = await db.getUnreadAlerts();
      return alerts.slice(0, 5);
    }),

    monthlyFinancialSummary: publicProcedure
      .input(z.object({ year: z.number().optional(), month: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getMonthlyFinancialSummary(input.year, input.month);
      }),

    compareFinancialData: publicProcedure
      .input(z.object({ periods: z.array(z.object({ year: z.number(), month: z.number() })) }))
      .query(async ({ input }) => {
        return await db.getFinancialComparison(input.periods);
      }),

    getTotalReceivables: publicProcedure.query(async () => {
      return await db.getTotalReceivables();
    }),

    getSplitReceivables: publicProcedure.query(async () => {
      return await db.getSplitReceivables();
    }),

    comprehensiveOverview: publicProcedure.query(async () => {
      return await db.getComprehensiveFinancialOverview();
    }),

    dailySummary: publicProcedure.query(async () => {
      return await db.getDailyFinancialSummary();
    }),

    yearToDateSummary: publicProcedure.query(async () => {
      return await db.getYearToDateFinancialSummary();
    }),

    bookingProfitAnalysis: publicProcedure.query(async () => {
      return await db.getBookingProfitAnalysis();
    }),

    financialByDateRange: publicProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await db.getFinancialSummaryByDateRange(input.startDate, input.endDate);
      }),

    accountsSummary: publicProcedure.query(async () => {
      return await db.getAccountsSummary();
    }),

    monthlyRevenue: publicProcedure.query(async () => {
      return await db.getMonthlyRevenue();
    }),

    monthlyExpenses: publicProcedure.query(async () => {
      return await db.getMonthlyExpenses();
    }),

    futureOperations: publicProcedure.query(async () => {
      return await db.getFutureOperations();
    }),

    monthlyProfits: publicProcedure.query(async () => {
      return await db.getMonthlyProfits();
    }),

    getMonthlyFinancialData: publicProcedure
      .input(z.object({ fromDate: z.date(), toDate: z.date() }))
      .query(async ({ input }) => {
        const revenue = await db.getRevenueByDateRange(input.fromDate, input.toDate);
        const expenses = await db.getExpensesByDateRange(input.fromDate, input.toDate);
        return {
          revenue,
          expenses,
          profit: revenue - expenses,
        };
      }),

    actualProfitByDateRange: publicProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await db.getActualProfitByDateRange(input.startDate, input.endDate);
      }),
  }),

  // ============ RECEIVABLES (SPLIT) ============
  receivablesSplit: router({
    list: publicProcedure
      .input(z.object({ type: z.enum(['current', 'future']).default('current') }))
      .query(async ({ input }) => {
        return await db.getReceivablesList(input.type);
      }),
  }),

  // ============ VEHICLES ============
  vehicles: router({
    list: publicProcedure.query(() => db.getVehicles()),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
      db.getVehicleById(input.id)
    ),

    create: publicProcedure
      .input(
        z.object({
          licensePlate: z.string().min(1),
          vehicleType: z.string().min(1),
          model: z.string().min(1),
          year: z.number(),
          capacity: z.number().min(1),
          fuelLevel: z.number().optional(),
          purchaseDate: z.date().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createVehicle(input as any);
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          licensePlate: z.string().optional(),
          vehicleType: z.string().optional(),
          model: z.string().optional(),
          year: z.number().optional(),
          capacity: z.number().optional(),
          status: z.enum(["available", "in_trip", "maintenance", "inactive"]).optional(),
          fuelLevel: z.number().optional(),
          nextMaintenanceDate: z.date().optional(),
          mileage: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, fuelLevel, ...data } = input;
        const updateData = {
          ...data,
          ...(fuelLevel !== undefined && { fuelLevel: fuelLevel.toString() }),
        };
        return db.updateVehicle(id, updateData);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteVehicle(input.id)),

    getTracking: publicProcedure
      .input(z.object({ vehicleId: z.number() }))
      .query(async ({ input }) => {
        const vehicle = await db.getVehicleById(input.vehicleId);
        if (!vehicle) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });
        }
        const latestLocation = await db.getLatestVehicleLocation(input.vehicleId);
        if (!latestLocation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No tracking data available" });
        }
        return {
          id: vehicle.id,
          licensePlate: vehicle.licensePlate,
          status: vehicle.status,
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          speed: latestLocation.speed,
          heading: latestLocation.heading,
          altitude: latestLocation.altitude,
          accuracy: latestLocation.accuracy,
          lastUpdated: latestLocation.timestamp,
        };
      }),

    getMultipleTracking: publicProcedure
      .input(z.object({ vehicleIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        const vehicles = await Promise.all(
          input.vehicleIds.map((id) => db.getVehicleById(id))
        );
        const trackingData = await Promise.all(
          input.vehicleIds.map(async (vehicleId) => {
            const vehicle = vehicles.find((v) => v?.id === vehicleId);
            if (!vehicle) return null;
            const latestLocation = await db.getLatestVehicleLocation(vehicleId);
            if (!latestLocation) return null;
            return {
              id: vehicle.id,
              licensePlate: vehicle.licensePlate,
              status: vehicle.status,
              latitude: latestLocation.latitude,
              longitude: latestLocation.longitude,
              speed: latestLocation.speed,
              heading: latestLocation.heading,
              altitude: latestLocation.altitude,
              accuracy: latestLocation.accuracy,
              lastUpdated: latestLocation.timestamp,
            };
          })
        );
        return trackingData.filter((t) => t !== null);
      }),
  }),

  // ============ DRIVERS ============
  drivers: router({
    list: publicProcedure.query(() => db.getDrivers()),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
      db.getDriverById(input.id)
    ),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().optional(), // Allow any email format
          licenseNumber: z.string().min(1),
          licenseExpiry: z.date(),
          joinDate: z.date(),
          salary: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { salary, ...data } = input;
        await db.createDriver({
          ...data,
          status: "available",
          salary: salary ? salary.toString() : null,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          licenseNumber: z.string().optional(),
          licenseExpiry: z.date().optional(),
          status: z.enum(["available", "on_trip", "on_leave", "inactive"]).optional(),
          salary: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, salary, ...data } = input;
        const updateData = {
          ...data,
          ...(salary !== undefined && { salary: salary.toString() }),
        };
        return db.updateDriver(id, updateData);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteDriver(input.id)),
  }),

  // ============ BOOKINGS ============
  bookings: router({
    list: publicProcedure.query(() => db.getBookings()),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
      db.getBookingById(input.id)
    ),

    getWithTracking: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking) return null;

        let vehicle = null;
        let tracking = null;

        if (booking.vehicleId) {
          vehicle = await db.getVehicleById(booking.vehicleId);
          tracking = await db.getLatestVehicleTracking(booking.vehicleId);
        }

        return {
          booking,
          vehicle,
          tracking,
        };
      }),

    create: publicProcedure
      .input(
        z.object({
          bookingNumber: z.string().optional(),
          clientId: z.number().nullable().optional(),
          customerName: z.string().optional(),
          customerPhone: z.string().optional(),
          customerEmail: z.string().optional(),
          pickupLocation: z.string().optional(),
          dropoffLocation: z.string().optional(),
          pickupDateTime: z.date().optional(),
          dropoffDateTime: z.date().optional(),
          numberOfPassengers: z.number().optional(),
          fare: z.number().min(0.01, "المبلغ مطلوب ويجب أن يكون أكبر من صفر"),
          bookingSource: z.enum(["internal", "talixo", "get_transfer", "transfeero", "other"]).optional(),
          status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
          notes: z.string().optional(),
          vehicleId: z.number().nullable().optional(),
          driverId: z.number().nullable().optional(),
          programDays: z.number().optional(),
          programEndDate: z.date().optional(),
          transferType: z.string().optional(),
          hotelName: z.string().optional(),
          carrierName: z.string().optional(),
          repName: z.string().optional(),
          repPhone: z.string().optional(),
          agencyName: z.string().optional(),
          flightNumber: z.string().optional(),
          sendWhatsApp: z.boolean().optional(),
          passengerCount: z.number().optional(),
          passengerNames: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        console.log('[bookings.create] Received input:', input);
        const bookingNumber = input.bookingNumber || `BK-${Date.now()}`;
        const programDays = input.programDays || 0;
        
        if (programDays > 0 && input.pickupDateTime) {
          const startDate = new Date(input.pickupDateTime);
          for (let i = 0; i < programDays; i++) {
            const bookingDate = new Date(startDate);
            bookingDate.setDate(bookingDate.getDate() + i);
            await db.createBooking({
              ...input,
              bookingNumber: `${bookingNumber}-D${i + 1}`,
              customerName: input.customerName || "عميل بدون تحديد",
              customerPhone: input.customerPhone || "",
              pickupLocation: input.pickupLocation || "",
              dropoffLocation: input.dropoffLocation || "",
              pickupDateTime: bookingDate,
              numberOfPassengers: input.numberOfPassengers || 1,
              fare: (input.fare || 0).toString(),
              status: input.status || "pending",
              programDays: programDays,
              programEndDate: null,
            });
          }
        } else {
          await db.createBooking({
            ...input,
            bookingNumber,
            customerName: input.customerName || "عميل بدون تحديد",
            customerPhone: input.customerPhone || "",
            pickupLocation: input.pickupLocation || "",
            dropoffLocation: input.dropoffLocation || "",
            pickupDateTime: input.pickupDateTime || new Date(),
            numberOfPassengers: input.numberOfPassengers || 1,
            fare: (input.fare || 0).toString(),
            status: input.status || "pending",
          });
        }
        
        // Create pending message for manual review only if sendWhatsApp is true
        if (input.sendWhatsApp) {
          try {
            const { createPendingMessage } = await import("./db-whatsapp");
            const { formatBookingMessage } = await import("./_core/whatsappService");
            
            const message = formatBookingMessage({
              bookingNumber: bookingNumber,
              customerName: input.customerName || "عميل",
              customerPhone: input.customerPhone || "",
              pickupLocation: input.pickupLocation || "",
              dropoffLocation: input.dropoffLocation || "",
              pickupDateTime: input.pickupDateTime || new Date(),
              fare: (input.fare || 0).toString(),
              numberOfPassengers: input.numberOfPassengers || 1,
              flightNumber: input.flightNumber || "",
              transferType: input.transferType || "ARRIVAL",
              hotelName: input.hotelName || "",
              carrierName: input.carrierName || "",
              repName: input.repName || "",
              repPhone: input.repPhone || "",
              agencyName: input.agencyName || "",
              notes: input.notes || "",
            });
            
            await createPendingMessage({
              bookingId: bookingNumber,
              bookingNumber: bookingNumber,
              message: message,
              recipients: [],
              recipientNames: []
            });
          } catch (error) {
            console.error("Error creating pending message:", error);
          }
        }
        
        return { success: true };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          bookingNumber: z.string().optional(),
          clientId: z.number().nullable().optional(),
          customerName: z.string().optional(),
          customerPhone: z.string().optional(),
          customerEmail: z.string().optional(),
          pickupLocation: z.string().optional(),
          dropoffLocation: z.string().optional(),
          pickupDateTime: z.date().optional(),
          dropoffDateTime: z.date().optional(),
          numberOfPassengers: z.number().optional(),
          fare: z.number().min(0.01, "المبلغ مطلوب ويجب أن يكون أكبر من صفر").optional(),
          bookingSource: z.enum(["internal", "talixo", "get_transfer", "transfeero", "other"]).optional(),
          status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
          notes: z.string().optional(),
          vehicleId: z.number().nullable().optional(),
          driverId: z.number().nullable().optional(),
          programDays: z.number().optional(),
          programEndDate: z.date().optional(),
          transferType: z.string().optional(),
          hotelName: z.string().optional(),
          carrierName: z.string().optional(),
          repName: z.string().optional(),
          repPhone: z.string().optional(),
          agencyName: z.string().optional(),
          flightNumber: z.string().optional(),
          sendWhatsApp: z.boolean().optional(),
          passengerCount: z.number().optional(),
          passengerNames: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.fare !== undefined) updateData.fare = data.fare.toString();
        
        // Get the booking before updating to get booking details
        const booking = await db.getBookingById(id);
        
        await db.updateBooking(id, updateData);
        
        // Create pending message for manual review if sendWhatsApp is true
        if (data.sendWhatsApp && booking) {
          try {
            const { createPendingMessage } = await import("./db-whatsapp");
            const { formatBookingMessage } = await import("./_core/whatsappService");
            
            const message = formatBookingMessage({
              bookingNumber: booking.bookingNumber || `BK-${id}`,
              customerName: data.customerName || booking.customerName || "عميل",
              customerPhone: data.customerPhone || booking.customerPhone || "",
              pickupLocation: data.pickupLocation || booking.pickupLocation || "",
              dropoffLocation: data.dropoffLocation || booking.dropoffLocation || "",
              pickupDateTime: data.pickupDateTime || booking.pickupDateTime || new Date(),
              fare: data.fare ? data.fare.toString() : booking.fare || "0",
              numberOfPassengers: data.numberOfPassengers || booking.numberOfPassengers || 1,
              flightNumber: data.flightNumber || booking.flightNumber || "",
              transferType: data.transferType || booking.transferType || "ARRIVAL",
              hotelName: data.hotelName || booking.hotelName || "",
              carrierName: data.carrierName || booking.carrierName || "",
              repName: data.repName || booking.repName || "",
              repPhone: data.repPhone || booking.repPhone || "",
              agencyName: data.agencyName || booking.agencyName || "",
              notes: data.notes || booking.notes || "",
            });
            
            await createPendingMessage({
              bookingId: booking.bookingNumber || `BK-${id}`,
              bookingNumber: booking.bookingNumber || `BK-${id}`,
              message: message,
              recipients: [],
              recipientNames: []
            });
          } catch (error) {
            console.error("Error creating pending message on update:", error);
          }
        }
        
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteBooking(input.id)),

    getByStatus: publicProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        const allBookings = await db.getBookings();
        return allBookings.filter((b) => b.status === input.status);
      }),

    listWithCalculatedStatus: publicProcedure.query(async () => {
      const bookings = await db.getBookings();
      const bookingsWithStatus = await Promise.all(
        bookings.map(async (booking) => {
          const paidAmount = await db.getTotalPaidForBooking(booking.id);
          const calculatedStatus = calculateBookingStatus(booking, paidAmount);
          return {
            ...booking,
            calculatedStatus,
            paidAmount,
          };
        })
      );
      return bookingsWithStatus;
    }),

    getByIdWithCalculatedStatus: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking) return null;
        const paidAmount = await db.getTotalPaidForBooking(booking.id);
        const calculatedStatus = calculateBookingStatus(booking, paidAmount);
        return {
          ...booking,
          calculatedStatus,
          paidAmount,
        };
      }),

    getTotals: publicProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getBookingsTotals(input.startDate, input.endDate);
      }),

    getCancelledBookings: publicProcedure.query(async () => {
      return await db.getCancelledBookings();
    }),

    cancelBooking: publicProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateBookingStatus(input.bookingId, "cancelled");
      }),

    restoreBooking: publicProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateBookingStatus(input.bookingId, "pending");
      }),
  }),

  // ============ CLIENTS & PAYMENTS ============
  clients: clientsRouter,
  receivables: receivablesRouter,
  payments: paymentsRouter,
  // ============ WHATSAPP ============
  whatsapp: whatsappRouter,
  // ============ TRANSACTIONS ============
  transactions: router({
    getAll: publicProcedure
      .input(z.object({ clientId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getTransactions(input?.clientId);
      }),
    list: publicProcedure
      .input(z.object({ clientId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getTransactions(input?.clientId);
      }),
    create: publicProcedure
      .input(z.object({
        transactionType: z.enum(["revenue", "expense"]),
        category: z.string(),
        expenseCategoryId: z.number().optional(),
        amount: z.number().min(0.01),
        description: z.string().optional(),
        clientId: z.number().optional(),
        transactionDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await dbInstance.insert(transactions).values({
          transactionType: input.transactionType,
          category: input.category,
          expenseCategoryId: input.expenseCategoryId,
          amount: input.amount.toString(),
          description: input.description,
          clientId: input.clientId,
          transactionDate: input.transactionDate,
          isFromBooking: false,
        });
        
        return { success: true, ...input };
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        transactionType: z.enum(["revenue", "expense"]).optional(),
        category: z.string().optional(),
        expenseCategoryId: z.number().optional().nullable(),
        amount: z.number().min(0.01).optional(),
        description: z.string().optional(),
        clientId: z.number().optional().nullable(),
        transactionDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        const { id, ...data } = input;
        const updateData: any = {};
        
        if (data.transactionType) updateData.transactionType = data.transactionType;
        if (data.category) updateData.category = data.category;
        if (data.expenseCategoryId !== undefined) updateData.expenseCategoryId = data.expenseCategoryId;
        if (data.amount) updateData.amount = data.amount.toString();
        if (data.description !== undefined) updateData.description = data.description;
        if (data.clientId !== undefined) updateData.clientId = data.clientId;
        if (data.transactionDate) updateData.transactionDate = data.transactionDate;
        
        await dbInstance.update(transactions).set(updateData).where(eq(transactions.id, id));
        
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await dbInstance.delete(transactions).where(eq(transactions.id, input.id));
        
        return { success: true };
      }),
    getUnlinked: publicProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      return await dbInstance
        .select()
        .from(transactions)
        .where(or(eq(transactions.isFromBooking, false), isNull(transactions.bookingId)));
    }),
    linkToBooking: publicProcedure
      .input(z.object({
        transactionId: z.number(),
        bookingId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await dbInstance
          .update(transactions)
          .set({
            bookingId: input.bookingId,
            isFromBooking: true,
            notes: input.notes,
          })
          .where(eq(transactions.id, input.transactionId));
        
        return { success: true };
      }),
    updateNotes: publicProcedure
      .input(z.object({
        transactionId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await dbInstance
          .update(transactions)
          .set({ notes: input.notes })
          .where(eq(transactions.id, input.transactionId));
        
        return { success: true };
      }),
  }),
  // ============ PARTNERS ============
  partners: router({
    getAll: publicProcedure.query(async () => {
      return await db.getExternalPartners();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getExternalPartnerById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        apiKey: z.string().optional(),
        commissionPercentage: z.number().default(0),
        status: z.enum(["active", "inactive", "suspended"]).default("active"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createExternalPartner({
          name: input.name,
          code: input.code,
          apiKey: input.apiKey,
          commissionPercentage: input.commissionPercentage.toString(),
          status: input.status,
          notes: input.notes,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        apiKey: z.string().optional(),
        commissionPercentage: z.number().optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const data: any = {};
        if (input.name) data.name = input.name;
        if (input.code) data.code = input.code;
        if (input.apiKey) data.apiKey = input.apiKey;
        if (input.commissionPercentage !== undefined) data.commissionPercentage = input.commissionPercentage.toString();
        if (input.status) data.status = input.status;
        if (input.notes) data.notes = input.notes;
        return await db.updateExternalPartner(input.id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteExternalPartner(input.id);
      }),
  }),
  // ============ DATA MANAGEMENT =============
  // ============ FINANCIALS =============
  financials: router({
    getMonthlyFinancialTrend: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await db.getMonthlyFinancialTrend(input.year);
      }),

    calculateMonthlyFinancialSummary: publicProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => {
        return await db.calculateMonthlyFinancialSummary(input.year, input.month);
      }),

    getAnnualFinancialSummary: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await db.getFinancialSummary(input.year);
      }),
  }),

  // ============ MAINTENANCE =============
  maintenance: router({
    list: publicProcedure.query(async () => {
      return await db.getMaintenanceRecords();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMaintenanceRecordById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        vehicleId: z.number(),
        maintenanceType: z.string(),
        description: z.string(),
        cost: z.number(),
        scheduledDate: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createMaintenanceRecord({
          vehicleId: input.vehicleId,
          maintenanceType: input.maintenanceType,
          description: input.description,
          cost: input.cost.toString(),
          scheduledDate: new Date(input.scheduledDate),
          notes: input.notes,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        maintenanceType: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().optional(),
        scheduledDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const data: any = {};
        if (input.maintenanceType) data.maintenanceType = input.maintenanceType;
        if (input.description) data.description = input.description;
        if (input.cost !== undefined) data.cost = input.cost.toString();
        if (input.scheduledDate) data.scheduledDate = new Date(input.scheduledDate);
        if (input.notes) data.notes = input.notes;
        return await db.updateMaintenanceRecord(input.id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteMaintenanceRecord(input.id);
      }),
  }),

  // ============ TRACKING =============
  tracking: router({
    getTelecomcubeVehicles: publicProcedure.query(async () => {
      try {
        const allVehicles = await db.getVehicles();
        
        // Get tracking data for each vehicle
        const vehiclesWithTracking = await Promise.all(
          allVehicles.map(async (vehicle) => {
            const tracking = await db.getLatestVehicleTracking(vehicle.id);
            return {
              id: vehicle.id,
              name: vehicle.licensePlate || `Vehicle ${vehicle.id}`,
              latitude: parseFloat(String(tracking?.latitude || 31.945)),
              longitude: parseFloat(String(tracking?.longitude || 35.927)),
              speed: parseFloat(String(tracking?.speed || 0)),
              lastUpdate: tracking?.timestamp ? tracking.timestamp.toISOString() : new Date().toISOString(),
              status: tracking ? 'active' : 'offline' as const,
            };
          })
        );
        
        return {
          success: true,
          vehicles: vehiclesWithTracking,
        };
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        return {
          success: false,
          vehicles: [],
          error: 'Failed to fetch vehicles',
        };
      }
    }),

    recordLocation: publicProcedure
      .input(z.object({
        vehicleId: z.number(),
        latitude: z.number(),
        longitude: z.number(),
        speed: z.number().optional(),
        heading: z.number().optional(),
        accuracy: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.createVehicleTracking({
            vehicleId: input.vehicleId,
            latitude: String(input.latitude),
            longitude: String(input.longitude),
            speed: input.speed ? String(input.speed) : '0',
            heading: input.heading ? String(input.heading) : '0',
            accuracy: input.accuracy ? String(input.accuracy) : '0',
            timestamp: new Date(),
          });
          return { success: true };
        } catch (error) {
          console.error('Error recording location:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to record location',
          });
        }
      }),

    getLatest: publicProcedure
      .input(z.object({ vehicleId: z.number() }))
      .query(async ({ input }) => {
        try {
          const tracking = await db.getLatestVehicleTracking(input.vehicleId);
          return tracking || null;
        } catch (error) {
          console.error('Error fetching latest tracking:', error);
          return null;
        }
      }),
  }),

  data: router({
    export: publicProcedure.query(async () => {
      return await exportData();
    }),

    import: publicProcedure
      .input(z.object({ data: z.any() }))
      .mutation(async ({ input }) => {
        await importData(input.data);
        return { success: true };
      }),
  }),

  // ============ EXPENSE CATEGORIES ============
  expenseCategories: router({
    list: publicProcedure.query(async () => {
      return await db.getExpenseCategories();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const categories = await db.getExpenseCategories();
        return categories.find((c) => c.id === input.id) || null;
      }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Category name is required"),
          description: z.string().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createExpenseCategory({
          name: input.name,
          description: input.description,
          color: input.color || "#ef4444",
          icon: input.icon || "TrendingDown",
        });
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateExpenseCategory(id, data as any);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteExpenseCategory(input.id);
      }),

    getExpenses: publicProcedure
      .input(
        z.object({
          categoryId: z.number(),
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getExpenseByCategoryId(input.categoryId, input.startDate, input.endDate);
      }),

    getTotal: publicProcedure
      .input(
        z.object({
          categoryId: z.number(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getTotalExpenseByCategory(input.categoryId, input.startDate, input.endDate);
      }),

    seed: publicProcedure.mutation(async () => {
      await db.seedExpenseCategories();
      return { success: true };
    }),
  }),

  // ============ WHATSAPP ============
  whatsappMessages: router({
    sendMessage: protectedProcedure
      .input(z.object({
        phoneNumber: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await whatsappHelper.sendWhatsAppMessage(input.phoneNumber, input.message);
      }),

    sendBookingConfirmation: protectedProcedure
      .input(z.object({
        phoneNumber: z.string(),
        bookingId: z.string(),
        clientName: z.string(),
        pickupDate: z.string(),
        pickupTime: z.string(),
        destination: z.string(),
        fare: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await whatsappHelper.sendBookingConfirmation(input.phoneNumber, {
          bookingId: input.bookingId,
          clientName: input.clientName,
          pickupDate: input.pickupDate,
          pickupTime: input.pickupTime,
          destination: input.destination,
          fare: input.fare,
        });
      }),

    sendBookingReminder: protectedProcedure
      .input(z.object({
        phoneNumber: z.string(),
        bookingId: z.string(),
        clientName: z.string(),
        pickupDate: z.string(),
        pickupTime: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await whatsappHelper.sendBookingReminder(input.phoneNumber, {
          bookingId: input.bookingId,
          clientName: input.clientName,
          pickupDate: input.pickupDate,
          pickupTime: input.pickupTime,
        });
      }),

    sendPaymentReminder: protectedProcedure
      .input(z.object({
        phoneNumber: z.string(),
        clientName: z.string(),
        amount: z.number(),
        dueDate: z.string(),
        invoiceId: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await whatsappHelper.sendPaymentReminder(input.phoneNumber, {
          clientName: input.clientName,
          amount: input.amount,
          dueDate: input.dueDate,
          invoiceId: input.invoiceId,
        });
      }),

    verifyConnection: publicProcedure
      .query(async () => {
        const isConnected = await whatsappHelper.verifyWhatsAppConnection();
        return { connected: isConnected };
       }),
  }),

  // ============ EXPENSES ============
  expenses: expensesRouter,

  // ============ REPORTS ============
  reports: reportsRouter,

  // ============ EMAIL REMINDERS ============
  emailReminders: router({
    sendReminder: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        reminderType: z.enum(["10_hours_before", "2_hours_before"]),
      }))
      .mutation(async ({ input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        }
        const { sendBookingReminderEmail } = await import("./email-reminders");
        return await sendBookingReminderEmail(booking, input.reminderType);
      }),
    checkAndSend: protectedProcedure
      .mutation(async () => {
        const { checkAndSendReminders } = await import("./email-reminders");
        await checkAndSendReminders();
        return { success: true };
      }),
  }),
  // ============ OTHER INCOME/EXPENSES ============
  otherTransactions: router({
    getAll: protectedProcedure
      .query(async () => {
        return await db.getOtherTransactions();
      }),
    getByType: protectedProcedure
      .input(z.enum(["income", "expense"]))
      .query(async ({ input }) => {
        return await db.getOtherTransactionsByType(input);
      }),
    getIncome: protectedProcedure
      .query(async () => {
        return await db.getOtherIncome();
      }),
    getExpenses: protectedProcedure
      .query(async () => {
        return await db.getOtherExpenses();
      }),
    getTotalIncome: protectedProcedure
      .query(async () => {
        return await db.getTotalOtherIncome();
      }),
    getTotalExpenses: protectedProcedure
      .query(async () => {
        return await db.getTotalOtherExpenses();
      }),
    create: protectedProcedure
      .input(z.object({
        transactionType: z.enum(["income", "expense"]),
        type: z.string().optional(),
        amount: z.string().min(1, "Amount is required"),
        clientId: z.number().optional(),
        driverId: z.number().optional(),
        description: z.string().optional(),
        transactionDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        // Use default type if not provided
        const typeToUse = input.type || (input.transactionType === 'income' ? 'دخل' : 'مصروفة');
        
        // If income type, create a receivable for the client/driver
        if (input.transactionType === "income" && input.clientId) {
          const numAmount = parseFloat(input.amount);
          
          await db.createReceivable({
            clientId: input.clientId,
            amount: numAmount.toString(),
            remainingAmount: numAmount.toString(),
            bookingId: 0,
            dueDate: input.transactionDate,
            status: "pending",
            notes: `${typeToUse}: ${input.description || ""}`,
          });
          
          await db.createTransaction({
            transactionType: "revenue",
            category: typeToUse,
            amount: numAmount.toString(),
            description: input.description,
            clientId: input.clientId,
            isFromBooking: false,
            notes: `${typeToUse}: ${input.description || ""}`,
            transactionDate: input.transactionDate,
          });
        } else if (input.transactionType === "expense") {
          const numAmount = parseFloat(input.amount);
          
          await db.createTransaction({
            transactionType: "expense",
            category: typeToUse,
            amount: numAmount.toString(),
            description: input.description,
            clientId: input.clientId,
            driverId: input.driverId,
            isFromBooking: false,
            notes: `${typeToUse}: ${input.description || ""}`,
            transactionDate: input.transactionDate,
          });
        }
        
        return await db.createOtherTransaction({
          transactionType: input.transactionType,
          type: typeToUse,
          amount: input.amount,
          clientId: input.clientId,
          driverId: input.driverId,
          description: input.description,
          transactionDate: input.transactionDate,
        });
      }),
        update: protectedProcedure
      .input(z.object({
        id: z.number(),
        transactionType: z.enum(["income", "expense"]).optional(),
        type: z.string().optional(),
        amount: z.string().optional(),
        clientId: z.number().optional(),
        driverId: z.number().optional(),
        description: z.string().optional(),
        transactionDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateOtherTransaction(id, data);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deleteOtherTransaction(input);
      }),
  }),

  bookingsStatus: bookingsStatusRouter,
});
export type AppRouter = typeof appRouter;
