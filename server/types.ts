import type { Request } from "express";
import type { Tenant, User } from "@shared/schema";

// Attached to every authenticated request by requireAuth (server/routes/middleware.ts).
// Routes should read tenantId/userId from here and scope all storage calls by tenantId.
export interface AuthContext {
  user: User;
  tenant: Tenant;
  userId: string;
  tenantId: string;
}

export interface AuthedRequest extends Request {
  ctx: AuthContext;
}
