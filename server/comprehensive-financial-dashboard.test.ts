import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Comprehensive Financial Dashboard", () => {
  describe("getDailyFinancialSummary", () => {
    it("should return daily revenue, expenses, and net profit", async () => {
      const result = await db.getDailyFinancialSummary();
      
      expect(result).toHaveProperty("revenue");
      expect(result).toHaveProperty("expenses");
      expect(result).toHaveProperty("netProfit");
      
      expect(typeof result.revenue).toBe("number");
      expect(typeof result.expenses).toBe("number");
      expect(typeof result.netProfit).toBe("number");
      
      // Net profit should equal revenue minus expenses
      expect(result.netProfit).toBe(result.revenue - result.expenses);
      
      // All values should be non-negative
      expect(result.revenue).toBeGreaterThanOrEqual(0);
      expect(result.expenses).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getYearToDateFinancialSummary", () => {
    it("should return YTD revenue, expenses, and monthly breakdown", async () => {
      const result = await db.getYearToDateFinancialSummary();
      
      expect(result).toHaveProperty("revenue");
      expect(result).toHaveProperty("expenses");
      expect(result).toHaveProperty("netProfit");
      expect(result).toHaveProperty("monthlyBreakdown");
      
      expect(typeof result.revenue).toBe("number");
      expect(typeof result.expenses).toBe("number");
      expect(typeof result.netProfit).toBe("number");
      expect(Array.isArray(result.monthlyBreakdown)).toBe(true);
      
      // Net profit should equal revenue minus expenses
      expect(result.netProfit).toBe(result.revenue - result.expenses);
      
      // Monthly breakdown should have correct structure
      if (result.monthlyBreakdown.length > 0) {
        const month = result.monthlyBreakdown[0];
        expect(month).toHaveProperty("month");
        expect(month).toHaveProperty("revenue");
        expect(month).toHaveProperty("expenses");
        expect(month).toHaveProperty("netProfit");
        
        // Each month's net profit should equal revenue minus expenses
        expect(month.netProfit).toBe(month.revenue - month.expenses);
      }
    });
  });

  describe("getBookingProfitAnalysis", () => {
    it("should return completed and pending booking analysis", async () => {
      const result = await db.getBookingProfitAnalysis();
      
      expect(result).toHaveProperty("completedCount");
      expect(result).toHaveProperty("completedProfit");
      expect(result).toHaveProperty("pendingCount");
      expect(result).toHaveProperty("expectedProfit");
      
      expect(typeof result.completedCount).toBe("number");
      expect(typeof result.completedProfit).toBe("number");
      expect(typeof result.pendingCount).toBe("number");
      expect(typeof result.expectedProfit).toBe("number");
      
      // All counts and profits should be non-negative
      expect(result.completedCount).toBeGreaterThanOrEqual(0);
      expect(result.completedProfit).toBeGreaterThanOrEqual(0);
      expect(result.pendingCount).toBeGreaterThanOrEqual(0);
      expect(result.expectedProfit).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getComprehensiveFinancialOverview", () => {
    it("should return complete financial overview with all sections", async () => {
      const result = await db.getComprehensiveFinancialOverview();
      
      expect(result).toHaveProperty("daily");
      expect(result).toHaveProperty("ytd");
      expect(result).toHaveProperty("bookingAnalysis");
      expect(result).toHaveProperty("receivables");
      expect(result).toHaveProperty("timestamp");
      
      // Check daily section
      expect(result.daily).toHaveProperty("revenue");
      expect(result.daily).toHaveProperty("expenses");
      expect(result.daily).toHaveProperty("netProfit");
      
      // Check YTD section
      expect(result.ytd).toHaveProperty("revenue");
      expect(result.ytd).toHaveProperty("expenses");
      expect(result.ytd).toHaveProperty("netProfit");
      expect(result.ytd).toHaveProperty("monthlyBreakdown");
      
      // Check booking analysis
      expect(result.bookingAnalysis).toHaveProperty("completedCount");
      expect(result.bookingAnalysis).toHaveProperty("completedProfit");
      expect(result.bookingAnalysis).toHaveProperty("pendingCount");
      expect(result.bookingAnalysis).toHaveProperty("expectedProfit");
      
      // Check receivables
      expect(result.receivables).toHaveProperty("current");
      expect(result.receivables).toHaveProperty("future");
      
      // Timestamp should be a valid date
      expect(result.timestamp instanceof Date).toBe(true);
    });
  });

  describe("getAccountsSummary", () => {
    it("should return accounts summary with receivables, payables, and net position", async () => {
      const result = await db.getAccountsSummary();
      
      expect(result).toHaveProperty("receivables");
      expect(result).toHaveProperty("payables");
      expect(result).toHaveProperty("netPosition");
      
      expect(typeof result.receivables).toBe("number");
      expect(typeof result.payables).toBe("number");
      expect(typeof result.netPosition).toBe("number");
      
      // Net position should equal receivables minus payables
      expect(result.netPosition).toBe(result.receivables - result.payables);
      
      // All values should be non-negative
      expect(result.receivables).toBeGreaterThanOrEqual(0);
      expect(result.payables).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getFinancialSummaryByDateRange", () => {
    it("should return financial summary for a given date range", async () => {
      const startDate = new Date(2026, 0, 1); // January 1, 2026
      const endDate = new Date(2026, 1, 28); // February 28, 2026
      
      const result = await db.getFinancialSummaryByDateRange(startDate, endDate);
      
      expect(result).toHaveProperty("revenue");
      expect(result).toHaveProperty("expenses");
      expect(result).toHaveProperty("netProfit");
      expect(result).toHaveProperty("byCategory");
      
      expect(typeof result.revenue).toBe("number");
      expect(typeof result.expenses).toBe("number");
      expect(typeof result.netProfit).toBe("number");
      expect(Array.isArray(result.byCategory)).toBe(true);
      
      // Net profit should equal revenue minus expenses
      expect(result.netProfit).toBe(result.revenue - result.expenses);
      
      // All values should be non-negative
      expect(result.revenue).toBeGreaterThanOrEqual(0);
      expect(result.expenses).toBeGreaterThanOrEqual(0);
      
      // byCategory should have correct structure if not empty
      if (result.byCategory.length > 0) {
        const category = result.byCategory[0];
        expect(category).toHaveProperty("category");
        expect(category).toHaveProperty("type");
        expect(category).toHaveProperty("total");
      }
    });
  });

  describe("Financial consistency checks", () => {
    it("should ensure daily profit equals revenue minus expenses", async () => {
      const daily = await db.getDailyFinancialSummary();
      expect(daily.netProfit).toBe(daily.revenue - daily.expenses);
    });

    it("should ensure YTD profit equals revenue minus expenses", async () => {
      const ytd = await db.getYearToDateFinancialSummary();
      expect(ytd.netProfit).toBe(ytd.revenue - ytd.expenses);
    });

    it("should ensure accounts net position equals receivables minus payables", async () => {
      const accounts = await db.getAccountsSummary();
      expect(accounts.netPosition).toBe(accounts.receivables - accounts.payables);
    });
  });
});
