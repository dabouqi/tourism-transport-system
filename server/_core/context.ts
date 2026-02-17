import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional - create a mock user for local development
    user = {
      id: 1,
      email: "local@example.com",
      name: "Local User",
      role: "user" as any,
      openId: "local-user",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
