import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock user context
const createMockContext = (role: "admin" | "operations_manager" | "booking_clerk" = "admin"): TrpcContext => {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
};

describe("Dashboard Router", () => {
  it("should return dashboard stats", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.getStats();

    expect(stats).toHaveProperty("todayBookings");
    expect(stats).toHaveProperty("activeVehicles");
    expect(stats).toHaveProperty("todayRevenue");
    expect(stats).toHaveProperty("pendingOperations");
    expect(typeof stats.todayBookings).toBe("number");
    expect(typeof stats.activeVehicles).toBe("number");
    expect(typeof stats.todayRevenue).toBe("number");
    expect(typeof stats.pendingOperations).toBe("number");
  });

  it("should return recent alerts", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const alerts = await caller.dashboard.getRecentAlerts();

    expect(Array.isArray(alerts)).toBe(true);
  });
});

describe("Vehicles Router", () => {
  it("should list vehicles", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const vehicles = await caller.vehicles.list();

    expect(Array.isArray(vehicles)).toBe(true);
  });

  it("should create a vehicle with operations_manager role", async () => {
    const ctx = createMockContext("operations_manager");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.vehicles.create({
      licensePlate: `ABC-${Date.now().toString().slice(-4)}`,
      vehicleType: "سيارة سيدان",
      model: "تويوتا كامري",
      year: 2023,
      capacity: 4,
      fuelLevel: 100,
    });

    expect(result).toBeDefined();
  });

  it("should deny vehicle creation for booking_clerk role", async () => {
    const ctx = createMockContext("booking_clerk");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.vehicles.create({
        licensePlate: `ABC-${Date.now().toString().slice(-4)}`,
        vehicleType: "سيارة سيدان",
        model: "تويوتا كامري",
        year: 2023,
        capacity: 4,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});

describe("Drivers Router", () => {
  it("should list drivers", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const drivers = await caller.drivers.list();

    expect(Array.isArray(drivers)).toBe(true);
  });

  it("should create a driver with operations_manager role", async () => {
    const ctx = createMockContext("operations_manager");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.drivers.create({
      name: "أحمد محمد",
      phone: "0501234567",
      licenseNumber: `LIC-${Date.now()}`,
      licenseExpiry: new Date("2025-12-31"),
      joinDate: new Date(),
    });

    expect(result).toBeDefined();
  });
});

describe("Bookings Router", () => {
  it("should list bookings", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const bookings = await caller.bookings.list();

    expect(Array.isArray(bookings)).toBe(true);
  });

  it("should create a booking for authenticated user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bookings.create({
      bookingNumber: `BK-${Date.now()}`,
      customerName: "محمد علي",
      customerPhone: "0501234567",
      pickupLocation: "الرياض",
      dropoffLocation: "جدة",
      pickupDateTime: new Date("2026-02-01T10:00:00"),
      numberOfPassengers: 4,
      fare: 150,
    });

    expect(result).toBeDefined();
  });
});

describe("Alerts Router", () => {
  it("should list alerts", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const alerts = await caller.alerts.list();

    expect(Array.isArray(alerts)).toBe(true);
  });

  it("should mark alert as read", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alerts.markAsRead({ id: 1, isRead: true });

    expect(result).toBeDefined();
  });
});

describe("Transactions Router", () => {
  it("should list transactions", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const transactions = await caller.transactions.list();

    expect(Array.isArray(transactions)).toBe(true);
  });

  it("should create a transaction with operations_manager role", async () => {
    const ctx = createMockContext("operations_manager");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.transactions.create({
      transactionType: "revenue",
      category: "حجز",
      amount: 150,
      transactionDate: new Date(),
    });

    expect(result).toBeDefined();
  });
});

describe("Auth Router", () => {
  it("should return current user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toEqual(ctx.user);
    expect(user?.name).toBe("Test User");
    expect(user?.role).toBe("admin");
  });
});
