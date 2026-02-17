/**
 * حساب حالة الحجز بناءً على الوقت والدفع
 * - حجز الرحلة (pending): قبل وقت الحجز
 * - بدء الرحلة (confirmed): عند وقت الحجز (نفس الساعة)
 * - جاري الرحلة (in_progress): بعد يوم الحجز
 * - انتهاء الرحلة (completed): عند الدفع الكامل
 */
export function calculateBookingStatus(
  booking: any,
  paidAmount: number = 0
): "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" {
  // إذا كانت الحالة ملغاة، احتفظ بها
  if (booking.status === "cancelled") {
    return "cancelled";
  }

  const now = new Date();
  const pickupTime = new Date(booking.pickupDateTime);
  const fare = typeof booking.fare === "string" ? parseFloat(booking.fare) : booking.fare;

  // إذا تم الدفع بالكامل، حالة انتهاء الرحلة
  if (paidAmount >= fare && fare > 0) {
    return "completed";
  }

  // حساب الفرق بالساعات
  const diffMs = pickupTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // إذا كان الوقت قد مضى (بعد وقت الحجز)
  if (diffHours < 0) {
    return "in_progress"; // جاري الرحلة
  }

  // إذا كان الوقت قريب جداً (في نفس الساعة أو أقل من ساعة)
  if (diffHours <= 1) {
    return "confirmed"; // بدء الرحلة
  }

  // إذا كان الوقت في المستقبل
  return "pending"; // حجز الرحلة
}

/**
 * تحديث حالة الحجز في قائمة الحجوزات
 */
export function enrichBookingsWithCalculatedStatus(
  bookings: any[],
  paymentsMap: Map<number, number> = new Map()
): any[] {
  return bookings.map((booking) => {
    const paidAmount = paymentsMap.get(booking.id) || 0;
    return {
      ...booking,
      calculatedStatus: calculateBookingStatus(booking, paidAmount),
    };
  });
}
