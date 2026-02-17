import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as dbReports from "./db-reports";

export const reportsRouter = router({
  monthlyReport: publicProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await dbReports.getMonthlyReport(input.year, input.month);
    }),

  clientDetailedReport: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await dbReports.getClientDetailedReport(input.clientId);
    }),

  clientMonthlyReport: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        year: z.number(),
        month: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await dbReports.getClientMonthlyReport(input.clientId, input.year, input.month);
    }),
});
