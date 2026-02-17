import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { calculateBookingStatus } from "./statusCalculator";

export const bookingsStatusRouter = router({
  listWithCalculatedStatus: publicProcedure.query(async () => {
    const bookings = await db.getBookings();

    // Get payment information for all bookings
    const bookingsWithStatus = await Promise.all(
      bookings.map(async (booking) => {
        const paidAmount = await db.getTotalPaidForBooking(booking.id);
        const calculatedStatus = calculateBookingStatus(booking, paidAmount);
        return {
          ...booking,
          calculatedStatus,
          paidAmount,
        };
      })
    );

    return bookingsWithStatus;
  }),

  getByIdWithCalculatedStatus: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const booking = await db.getBookingById(input.id);
      if (!booking) return null;

      const paidAmount = await db.getTotalPaidForBooking(booking.id);
      const calculatedStatus = calculateBookingStatus(booking, paidAmount);

      return {
        ...booking,
        calculatedStatus,
        paidAmount,
      };
    }),

  getByStatusCalculated: publicProcedure
    .input(z.object({ status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]) }))
    .query(async ({ input }) => {
      const bookings = await db.getBookings();

      const bookingsWithStatus = await Promise.all(
        bookings.map(async (booking) => {
          const paidAmount = await db.getTotalPaidForBooking(booking.id);
          const calculatedStatus = calculateBookingStatus(booking, paidAmount);
          return {
            ...booking,
            calculatedStatus,
            paidAmount,
          };
        })
      );

      return bookingsWithStatus.filter((b) => b.calculatedStatus === input.status);
    }),
});
