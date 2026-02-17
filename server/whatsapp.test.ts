import { describe, it, expect } from "vitest";

/**
 * Test WhatsApp Business API credentials
 * Validates that the credentials are properly configured
 */
describe("WhatsApp Business API", () => {
  it("should have all required environment variables configured", () => {
    expect(process.env.WHATSAPP_ACCESS_TOKEN).toBeDefined();
    expect(process.env.WHATSAPP_PHONE_NUMBER_ID).toBeDefined();
    expect(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID).toBeDefined();
    expect(process.env.WHATSAPP_PHONE_NUMBER).toBeDefined();
  });

  it("should have valid format for Access Token", () => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    expect(token).toBeDefined();
    expect(token).toMatch(/^EA[A-Za-z0-9_-]+$/);
  });

  it("should have valid Phone Number ID", () => {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    expect(phoneId).toBeDefined();
    expect(phoneId).toMatch(/^\d+$/);
    expect(phoneId?.length).toBeGreaterThan(0);
  });

  it("should have valid Business Account ID", () => {
    const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    expect(businessId).toBeDefined();
    expect(businessId).toMatch(/^\d+$/);
    expect(businessId?.length).toBeGreaterThan(0);
  });

  it("should have valid phone number format", () => {
    const phoneNumber = process.env.WHATSAPP_PHONE_NUMBER;
    expect(phoneNumber).toBeDefined();
    expect(phoneNumber).toMatch(/^\+\d+/);
  });
});
