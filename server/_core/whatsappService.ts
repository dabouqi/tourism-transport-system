/**
 * WhatsApp Service for sending booking notifications
 * Integrates with WhatsApp Business API or similar service
 */

export interface BookingData {
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: Date;
  fare: string;
  numberOfPassengers?: number;
  hotelName?: string;
  carrierName?: string;
  flightNumber?: string;
  transferType?: string;
  agencyName?: string;
  notes?: string;
  programDays?: number;
  programEndDate?: Date;
  repName?: string;
  repPhone?: string;
}

/**
 * Format booking data into WhatsApp message
 * Supports dynamic variables and custom templates
 */
export function formatBookingMessage(booking: BookingData, template?: string): string {
  const defaultTemplate = `
👤 {{REP_NAME}}
📅 DATE: {{BOOKING_DATE}}
📝 NAMES: {{CUSTOMER_NAME}}
🚖 TRANSFER TYPE: {{TRANSFER_TYPE}}
📍 FROM: {{PICKUP_LOCATION}}
✈️ TO: {{DROPOFF_LOCATION}}
🏨 HOTEL NAME: {{HOTEL_NAME}}
✈️ CARRIER: {{CARRIER_NAME}}
✈️ FLIGHT NUMBER: {{FLIGHT_NUMBER}}
⏰ TIME: {{PICKUP_TIME}}
👥 PAX: {{PAX_COUNT}}
👤 Rep Name: {{REP_NAME}}
📞 Rep Number: {{REP_PHONE}}
📝 NOTE: {{NOTES}}
🏢 Agency Name: {{AGENCY_NAME}}
🔴 Please Confirm
  `.trim();

  const messageTemplate = template || defaultTemplate;

  // Format date (M/D/YYYY)
  const bookingDate = new Date(booking.pickupDateTime);
  const month = bookingDate.getMonth() + 1;
  const day = bookingDate.getDate();
  const year = bookingDate.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;

  // Format time (HH:MM)
  const hours = String(bookingDate.getHours()).padStart(2, '0');
  const minutes = String(bookingDate.getMinutes()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}`;

  // Replace variables
  let message = messageTemplate;

  const replacements: Record<string, string> = {
    "{{BOOKING_NUMBER}}": booking.bookingNumber || "N/A",
    "{{CUSTOMER_NAME}}": booking.customerName || "N/A",
    "{{CUSTOMER_PHONE}}": booking.customerPhone || "N/A",
    "{{BOOKING_DATE}}": formattedDate,
    "{{PICKUP_LOCATION}}": booking.pickupLocation || "N/A",
    "{{DROPOFF_LOCATION}}": booking.dropoffLocation || "N/A",
    "{{PICKUP_TIME}}": formattedTime,
    "{{TRANSFER_TYPE}}": booking.transferType || "ARRIVAL",
    "{{HOTEL_NAME}}": booking.hotelName || "NA",
    "{{CARRIER_NAME}}": booking.carrierName || "N/A",
    "{{FLIGHT_NUMBER}}": booking.flightNumber || "N/A",
    "{{PAX_COUNT}}": (booking.numberOfPassengers || 1).toString(),
    "{{FARE}}": booking.fare || "N/A",
    "{{REP_NAME}}": booking.repName || "N/A",
    "{{REP_PHONE}}": booking.repPhone || "N/A",
    "{{NOTES}}": booking.notes || "N/A",
    "{{AGENCY_NAME}}": booking.agencyName || "N/A",
    "{{PROGRAM_DAYS}}": (booking.programDays || 0).toString(),
    "{{PROGRAM_END_DATE}}": booking.programEndDate
      ? new Date(booking.programEndDate).toLocaleDateString("en-US")
      : "N/A",
  };

  Object.entries(replacements).forEach(([key, value]) => {
    message = message.replace(new RegExp(key, "g"), value);
  });

  return message;
}

/**
 * Send WhatsApp message to a phone number
 * Currently a placeholder - integrate with actual WhatsApp API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // TODO: Integrate with WhatsApp Business API or Twilio
    // For now, this is a placeholder that logs the message
    console.log(`[WhatsApp] Sending to ${phoneNumber}:\n${message}`);

    // Placeholder response
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
    };
  } catch (error) {
    console.error(`[WhatsApp] Error sending message to ${phoneNumber}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send booking notification to multiple recipients
 */
export async function sendBookingNotification(
  booking: BookingData,
  recipientNumbers: string[],
  template?: string
): Promise<{ success: boolean; sentTo: string[]; failed: string[] }> {
  const message = formatBookingMessage(booking, template);
  const sentTo: string[] = [];
  const failed: string[] = [];

  for (const phoneNumber of recipientNumbers) {
    const result = await sendWhatsAppMessage(phoneNumber, message);
    if (result.success) {
      sentTo.push(phoneNumber);
    } else {
      failed.push(phoneNumber);
    }
  }

  return { success: failed.length === 0, sentTo, failed };
}
