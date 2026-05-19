// Vercel serverless entry point — wraps the Express app so all /api/* routes
// are handled by a single serverless function. TAPTU_STORAGE_MODE=supabase is
// expected in the Vercel environment; the local-demo file adapter is not used.
import { app } from "../apps/api/src/index.js";

export default app;
