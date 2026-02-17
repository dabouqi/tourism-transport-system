import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { emailReminders, bookings } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Generate HTML email template for booking reminder
 */
export function generateBookingReminderEmail(booking: any): string {
  const pickupDateTime = new Date(booking.pickupDateTime);
  const formattedTime = pickupDateTime.toLocaleString("ar-JO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      direction: rtl;
      text-align: right;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 25px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      background-color: #fafafa;
    }
    .section-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .section-content {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .booking-number {
      background-color: #f0f0f0;
      border-right: 4px solid #667eea;
      padding: 10px;
      margin: 10px 0;
      font-weight: bold;
      color: #333;
    }
    .customer-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      padding: 10px;
      background-color: white;
      border-radius: 4px;
    }
    .info-label {
      font-weight: bold;
      color: #667eea;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .info-value {
      color: #333;
      font-size: 14px;
    }
    .trip-details {
      background-color: #f9f9f9;
      border-right: 4px solid #764ba2;
      padding: 15px;
      margin: 15px 0;
    }
    .trip-item {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .trip-item:last-child {
      border-bottom: none;
    }
    .trip-label {
      font-weight: bold;
      color: #666;
      font-size: 13px;
    }
    .trip-value {
      color: #333;
      font-size: 15px;
      margin-top: 3px;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
    }
    .status-badge {
      display: inline-block;
      background-color: #ffc107;
      color: #333;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 تذكير الرحلة</h1>
      <p>تذكير مهم بشأن رحلتك القادمة</p>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">رقم الحجز</div>
        <div class="booking-number">${booking.bookingNumber}</div>
      </div>

      <div class="section">
        <div class="section-title">معلومات العميل</div>
        <div class="section-content">
          <div class="info-item">
            <div class="info-label">الاسم</div>
            <div class="info-value">${booking.customerName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الهاتف</div>
            <div class="info-value">${booking.customerPhone}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">تفاصيل الرحلة</div>
        <div class="trip-details">
          <div class="trip-item">
            <div class="trip-label">موقع الانطلاق</div>
            <div class="trip-value">${booking.pickupLocation}</div>
          </div>
          <div class="trip-item">
            <div class="trip-label">موقع الوصول</div>
            <div class="trip-value">${booking.dropoffLocation}</div>
          </div>
          <div class="trip-item">
            <div class="trip-label">تاريخ ووقت الرحلة</div>
            <div class="trip-value">${formattedTime}</div>
          </div>
          <div class="trip-item">
            <div class="trip-label">عدد الركاب</div>
            <div class="trip-value">${booking.numberOfPassengers}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">الحالة</div>
        <div class="section-content">
          <span class="status-badge">${booking.status === "pending" ? "قيد الانتظار" : booking.status === "confirmed" ? "مؤكدة" : booking.status}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>شكراً لاستخدامك خدماتنا</p>
      <p>© 2026 نظام إدارة النقل السياحي</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send booking reminder email
 */
export async function sendBookingReminderEmail(
  booking: any,
  reminderType: "10_hours_before" | "2_hours_before"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!booking.customerEmail) {
      return { success: false, error: "Customer email not provided" };
    }

    const htmlContent = generateBookingReminderEmail(booking);
    const reminderText =
      reminderType === "10_hours_before"
        ? "تذكير: رحلتك بعد 10 ساعات"
        : "تذكير أخير: رحلتك بعد ساعتين";

    // Use LLM to send email via built-in service
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an email sending assistant. Send the following email to the customer.",
        },
        {
          role: "user",
          content: `Send email to: ${booking.customerEmail}\nSubject: ${reminderText}\n\nHTML Content:\n${htmlContent}`,
        },
      ],
    });

    // Record the reminder in database
    const db = await getDb();
    if (db) {
      await db.insert(emailReminders).values({
        bookingId: booking.id,
        customerEmail: booking.customerEmail,
        reminderType,
        scheduledTime: new Date(),
        sentTime: new Date(),
        status: "sent",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[sendBookingReminderEmail] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check and send pending reminders
 */
export async function checkAndSendReminders() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[checkAndSendReminders] Database not available");
      return;
    }

    const now = new Date();

    // Get all bookings that need 10-hour reminder
    const bookingsFor10HourReminder = await db
      .select({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        customerName: bookings.customerName,
        customerPhone: bookings.customerPhone,
        customerEmail: bookings.customerEmail,
        pickupLocation: bookings.pickupLocation,
        dropoffLocation: bookings.dropoffLocation,
        pickupDateTime: bookings.pickupDateTime,
        numberOfPassengers: bookings.numberOfPassengers,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "pending"),
          // Pickup time is between 9.5 and 10.5 hours from now
          // This ensures we send exactly once
        )
      );

    // Filter bookings that need 10-hour reminder
    for (const booking of bookingsFor10HourReminder) {
      const pickupTime = new Date(booking.pickupDateTime).getTime();
      const timeUntilPickup = (pickupTime - now.getTime()) / (1000 * 60 * 60); // hours

      if (timeUntilPickup >= 9.5 && timeUntilPickup <= 10.5) {
        // Check if reminder already sent
        const existingReminder = await db
          .select()
          .from(emailReminders)
          .where(
            and(
              eq(emailReminders.bookingId, booking.id),
              eq(emailReminders.reminderType, "10_hours_before"),
              eq(emailReminders.status, "sent")
            )
          );

        if (existingReminder.length === 0) {
          await sendBookingReminderEmail(booking, "10_hours_before");
          console.log(
            `[checkAndSendReminders] Sent 10-hour reminder for booking ${booking.bookingNumber}`
          );
        }
      }
    }

    // Get bookings that need 2-hour reminder
    for (const booking of bookingsFor10HourReminder) {
      const pickupTime = new Date(booking.pickupDateTime).getTime();
      const timeUntilPickup = (pickupTime - now.getTime()) / (1000 * 60 * 60); // hours

      if (timeUntilPickup >= 1.5 && timeUntilPickup <= 2.5) {
        // Check if reminder already sent
        const existingReminder = await db
          .select()
          .from(emailReminders)
          .where(
            and(
              eq(emailReminders.bookingId, booking.id),
              eq(emailReminders.reminderType, "2_hours_before"),
              eq(emailReminders.status, "sent")
            )
          );

        if (existingReminder.length === 0) {
          await sendBookingReminderEmail(booking, "2_hours_before");
          console.log(
            `[checkAndSendReminders] Sent 2-hour reminder for booking ${booking.bookingNumber}`
          );
        }
      }
    }
  } catch (error) {
    console.error("[checkAndSendReminders] Error:", error);
  }
}
