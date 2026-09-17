import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./lib/env";
import { HttpError } from "./lib/errors";
import { verifyVendorSubscriptionRoutes } from "./routes/verifyVendorSubscription";
import { sendNotificationRoutes } from "./routes/sendNotification";
import { recipeRoutes, runDailyRecipeGenerationJob } from "./routes/recipes";
import { walletRoutes } from "./routes/wallet";
import { reviewRoutes } from "./routes/reviews";
import { smsRoutes } from "./routes/sms";
import { menuEmbeddingRoutes } from "./routes/menuEmbeddings";
import { semanticSearchRoutes } from "./routes/semanticSearch";
import { reconcilePhotoRewards } from "./scheduled/reconcilePhotoRewards";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", cors());

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.code, message: err.message }, err.status as 400 | 401 | 403 | 404 | 500);
  }
  console.error("[unhandled]", err);
  return c.json({ error: "internal", message: err.message }, 500);
});

app.get("/health", (c) => c.json({ ok: true }));

app.route("/", verifyVendorSubscriptionRoutes);
app.route("/", sendNotificationRoutes);
app.route("/", recipeRoutes);
app.route("/", walletRoutes);
app.route("/", reviewRoutes);
app.route("/", smsRoutes);
app.route("/", menuEmbeddingRoutes);
app.route("/", semanticSearchRoutes);

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        console.log("[scheduled] Starting daily recipe generation job...");
        const result = await runDailyRecipeGenerationJob(env);
        console.log("[scheduled] Completed recipe job:", JSON.stringify(result));

        console.log("[scheduled] Running photo-reward reconciliation sweep...");
        const reconciliation = await reconcilePhotoRewards(env);
        console.log("[scheduled] Completed reconciliation sweep:", JSON.stringify(reconciliation));
      })()
    );
  },
};
