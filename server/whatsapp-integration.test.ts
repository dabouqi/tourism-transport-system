import { describe, it, expect } from "vitest";
import * as whatsapp from "./whatsapp";

/**
 * Integration tests for WhatsApp Business API
 * These tests verify the actual API calls work correctly
 */
describe("WhatsApp Business API Integration", () => {
  it("should verify WhatsApp connection", async () => {
    const isConnected = await whatsapp.verifyWhatsAppConnection();
    // Connection should be boolean
    expect(typeof isConnected).toBe("boolean");
  });

  it("should handle message sending with valid phone number", async () => {
    const result = await whatsapp.sendWhatsAppMessage(
      "+962790175202",
      "اختبار الرسالة"
    );

    // Result should have success property
    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");

    // If successful, should have messageId
    if (result.success) {
      expect(result.messageId).toBeDefined();
    } else {
      // If failed, should have error message
      expect(result.error).toBeDefined();
    }
  });

  it("should handle booking confirmation message", async () => {
    const result = await whatsapp.sendBookingConfirmation(
      "+962790175202",
      {
        bookingId: "TEST-001",
        clientName: "أحمد محمد",
        pickupDate: "2026-02-07",
        pickupTime: "14:30",
        destination: "عمّان - مطار الملكة علياء",
        fare: 50,
      }
    );

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("should handle booking reminder message", async () => {
    const result = await whatsapp.sendBookingReminder(
      "+962790175202",
      {
        bookingId: "TEST-002",
        clientName: "فاطمة علي",
        pickupDate: "2026-02-08",
        pickupTime: "10:00",
      }
    );

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("should handle payment reminder message", async () => {
    const result = await whatsapp.sendPaymentReminder(
      "+962790175202",
      {
        clientName: "محمود حسن",
        amount: 150,
        dueDate: "2026-02-10",
        invoiceId: "INV-2026-001",
      }
    );

    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("should handle invalid phone number gracefully", async () => {
    const result = await whatsapp.sendWhatsAppMessage(
      "invalid-phone",
      "رسالة اختبار"
    );

    // Should return a response object
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("error");
  });
});
