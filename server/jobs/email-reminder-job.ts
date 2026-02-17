import { checkAndSendReminders } from "../email-reminders";

/**
 * Email Reminder Job
 * Runs every hour to check and send booking reminders
 */
export async function startEmailReminderJob() {
  console.log("[Email Reminder Job] Starting email reminder job...");

  // Run immediately on startup
  await checkAndSendReminders();

  // Run every hour
  setInterval(async () => {
    try {
      console.log("[Email Reminder Job] Checking for reminders to send...");
      await checkAndSendReminders();
    } catch (error) {
      console.error("[Email Reminder Job] Error:", error);
    }
  }, 60 * 60 * 1000); // 1 hour
}
