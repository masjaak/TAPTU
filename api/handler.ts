// Vercel catch-all serverless entry — routes all /api/* requests through Express.
// @vercel/node compiles and traces this file; all relative imports use .js extensions
// so Node.js ESM resolution works correctly at runtime.
import { app } from "../apps/api/src/index.js";

export default app;
