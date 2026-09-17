import type { Context, Next } from "hono";
import type { Env, Variables } from "./env";
import { verifyFirebaseIdToken } from "./verifyIdToken";
import { unauthenticated, permissionDenied } from "./errors";

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

/** Requires a valid Firebase ID token on Authorization: Bearer <token>. Any signed-in user passes. */
export async function requireAuth(c: Ctx, next: Next): Promise<Response | void> {
  const authz = c.req.header("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) throw unauthenticated();

  try {
    const user = await verifyFirebaseIdToken(token, c.env.FIREBASE_PROJECT_ID);
    c.set("user", user);
  } catch (e) {
    throw unauthenticated(`Invalid or expired session: ${e instanceof Error ? e.message : String(e)}`);
  }
  await next();
}

/** Must run after requireAuth. Mirrors assertIsAdmin's two-stage 401-then-403 semantics. */
export async function requireAdmin(c: Ctx, next: Next): Promise<Response | void> {
  const user = c.get("user");
  if (!user) throw unauthenticated();
  if (!user.admin) throw permissionDenied();
  await next();
}
