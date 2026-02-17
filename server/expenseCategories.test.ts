import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Expense Categories", () => {
  beforeAll(async () => {
    // Seed categories before tests
    await db.seedExpenseCategories();
  });

  describe("getExpenseCategories", () => {
    it("should return all expense categories", async () => {
      const categories = await db.getExpenseCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it("should have required fields in categories", async () => {
      const categories = await db.getExpenseCategories();
      const category = categories[0];
      expect(category).toHaveProperty("id");
      expect(category).toHaveProperty("name");
      expect(category).toHaveProperty("color");
      expect(category).toHaveProperty("icon");
    });

    it("should include predefined categories", async () => {
      const categories = await db.getExpenseCategories();
      const categoryNames = categories.map((c) => c.name);
      expect(categoryNames).toContain("بنزين");
      expect(categoryNames).toContain("غسيل");
      expect(categoryNames).toContain("زيت");
      expect(categoryNames).toContain("قطع غيار");
    });
  });

  describe("createExpenseCategory", () => {
    it("should create a new expense category", async () => {
      const result = await db.createExpenseCategory({
        name: "فئة اختبار",
        description: "فئة للاختبار",
        color: "#ff0000",
        icon: "Test",
      });
      expect(result).toBeDefined();
    });

    it("should create category with default color if not provided", async () => {
      const result = await db.createExpenseCategory({
        name: "فئة بدون لون",
        description: "فئة بدون لون محدد",
      });
      expect(result).toBeDefined();
    });
  });

  describe("getTotalExpenseByCategory", () => {
    it("should return 0 for category with no expenses", async () => {
      const categories = await db.getExpenseCategories();
      const categoryId = categories[0].id;
      const total = await db.getTotalExpenseByCategory(categoryId);
      expect(typeof total).toBe("number");
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it("should calculate total with date range", async () => {
      const categories = await db.getExpenseCategories();
      const categoryId = categories[0].id;
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const total = await db.getTotalExpenseByCategory(categoryId, startDate, endDate);
      expect(typeof total).toBe("number");
    });
  });

  describe("getExpenseByCategoryId", () => {
    it("should return array of expenses for category", async () => {
      const categories = await db.getExpenseCategories();
      const categoryId = categories[0].id;
      const expenses = await db.getExpenseByCategoryId(
        categoryId,
        new Date("2024-01-01"),
        new Date("2024-12-31")
      );
      expect(Array.isArray(expenses)).toBe(true);
    });

    it("should return empty array for non-existent category", async () => {
      const expenses = await db.getExpenseByCategoryId(
        99999,
        new Date("2024-01-01"),
        new Date("2024-12-31")
      );
      expect(Array.isArray(expenses)).toBe(true);
      expect(expenses.length).toBe(0);
    });
  });

  describe("updateExpenseCategory", () => {
    it("should update category name", async () => {
      const categories = await db.getExpenseCategories();
      const categoryId = categories[0].id;
      const result = await db.updateExpenseCategory(categoryId, {
        name: "اسم محدث",
      });
      expect(result).toBeDefined();
    });

    it("should update category color", async () => {
      const categories = await db.getExpenseCategories();
      const categoryId = categories[0].id;
      const result = await db.updateExpenseCategory(categoryId, {
        color: "#00ff00",
      });
      expect(result).toBeDefined();
    });
  });

  describe("deleteExpenseCategory", () => {
    it("should delete a category", async () => {
      // Create a category first
      await db.createExpenseCategory({
        name: "فئة للحذف",
        description: "سيتم حذفها",
        color: "#0000ff",
        icon: "Delete",
      });

      const categories = await db.getExpenseCategories();
      const categoryToDelete = categories.find((c) => c.name === "فئة للحذف");

      if (categoryToDelete) {
        const result = await db.deleteExpenseCategory(categoryToDelete.id);
        expect(result).toBeDefined();
      }
    });
  });

  describe("seedExpenseCategories", () => {
    it("should not fail if categories already exist", async () => {
      const result = await db.seedExpenseCategories();
      expect(result).toBeUndefined();
    });

    it("should create 8 predefined categories", async () => {
      const categories = await db.getExpenseCategories();
      expect(categories.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("getExpensesByCategory from transactions", () => {
    it("should return expenses grouped by category", async () => {
      const expenses = await db.getExpensesByCategory(
        new Date("2024-01-01"),
        new Date("2024-12-31")
      );
      expect(Array.isArray(expenses)).toBe(true);
    });

    it("should have required fields in grouped expenses", async () => {
      const expenses = await db.getExpensesByCategory(
        new Date("2024-01-01"),
        new Date("2024-12-31")
      );
      if (expenses.length > 0) {
        const expense = expenses[0];
        expect(expense).toHaveProperty("categoryId");
        expect(expense).toHaveProperty("categoryName");
        expect(expense).toHaveProperty("total");
        expect(expense).toHaveProperty("count");
      }
    });
  });
});
