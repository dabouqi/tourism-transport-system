import { ENV } from "./_core/env";

/**
 * WhatsApp Business API Helper
 * Handles sending messages via Meta WhatsApp Business API
 */

export interface WhatsAppMessage {
  to: string; // Phone number in format: +1234567890
  message: string;
  messageType?: "text" | "template";
  templateName?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Add LTR (Left-to-Right) markers to Arabic text
 * This ensures Arabic text displays left-to-right in WhatsApp
 */
function addLTRMarkers(text: string): string {
  // Add LRE (Left-to-Right Embedding) at the start and PDF (Pop Directional Formatting) at the end
  // This ensures the entire message is treated as LTR
  return "\u202A" + text + "\u202C";
}

/**
 * Send a text message via WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppResponse> {
  try {
    if (!ENV.whatsappAccessToken || !ENV.whatsappPhoneNumberId) {
      console.error("[WhatsApp] Missing credentials");
      return {
        success: false,
        error: "WhatsApp credentials not configured",
      };
    }

    // Ensure phone number starts with +
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;

    const url = `https://graph.instagram.com/v18.0/${ENV.whatsappPhoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: {
        preview_url: true,
        body: addLTRMarkers(message),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string };
    };

    if (!response.ok) {
      console.error("[WhatsApp] API Error:", data.error?.message);
      return {
        success: false,
        error: data.error?.message || "Failed to send message",
      };
    }

    const messageId = data.messages?.[0]?.id;
    console.log("[WhatsApp] Message sent successfully:", messageId);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send booking confirmation message
 */
export async function sendBookingConfirmation(
  phoneNumber: string,
  bookingDetails: {
    bookingId: string;
    clientName: string;
    pickupDate: string;
    pickupTime: string;
    destination: string;
    fare: number;
  }
): Promise<WhatsAppResponse> {
  const message = `مرحباً ${bookingDetails.clientName}،

تم تأكيد حجزك بنجاح ✅

📋 تفاصيل الحجز:
• رقم الحجز: ${bookingDetails.bookingId}
• التاريخ: ${bookingDetails.pickupDate}
• الوقت: ${bookingDetails.pickupTime}
• الوجهة: ${bookingDetails.destination}
• السعر: ${bookingDetails.fare} د.ا

شكراً لاختيارك خدماتنا!`;

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send booking reminder message
 */
export async function sendBookingReminder(
  phoneNumber: string,
  bookingDetails: {
    bookingId: string;
    clientName: string;
    pickupDate: string;
    pickupTime: string;
  }
): Promise<WhatsAppResponse> {
  const message = `مرحباً ${bookingDetails.clientName}،

تذكير بحجزك 🚗

📋 تفاصيل الحجز:
• رقم الحجز: ${bookingDetails.bookingId}
• التاريخ: ${bookingDetails.pickupDate}
• الوقت: ${bookingDetails.pickupTime}

يرجى التأكد من توفرك في الوقت المحدد.`;

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send payment reminder message
 */
export async function sendPaymentReminder(
  phoneNumber: string,
  paymentDetails: {
    clientName: string;
    amount: number;
    dueDate: string;
    invoiceId: string;
  }
): Promise<WhatsAppResponse> {
  const message = `مرحباً ${paymentDetails.clientName}،

تذكير بالدفع المستحق 💰

📋 تفاصيل الدفع:
• المبلغ: ${paymentDetails.amount} د.ا
• تاريخ الاستحقاق: ${paymentDetails.dueDate}
• رقم الفاتورة: ${paymentDetails.invoiceId}

يرجى تسوية الدفع في أقرب وقت.`;

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send custom message
 */
export async function sendCustomMessage(
  phoneNumber: string,
  subject: string,
  content: string
): Promise<WhatsAppResponse> {
  const message = `${subject}

${content}`;

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Verify WhatsApp API connection
 */
export async function verifyWhatsAppConnection(): Promise<boolean> {
  try {
    if (!ENV.whatsappAccessToken || !ENV.whatsappPhoneNumberId) {
      console.warn("[WhatsApp] Missing credentials for verification");
      return false;
    }

    const url = `https://graph.instagram.com/v18.0/${ENV.whatsappPhoneNumberId}?fields=id,display_phone_number`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ENV.whatsappAccessToken}`,
      },
    });

    if (!response.ok) {
      console.error("[WhatsApp] Verification failed:", response.statusText);
      return false;
    }

    console.log("[WhatsApp] Connection verified successfully");
    return true;
  } catch (error) {
    console.error("[WhatsApp] Verification error:", error);
    return false;
  }
}
