import path from "node:path";

export const apiConfig = {
  port: Number(process.env.PORT ?? 4317),
  cacheDir: path.resolve(process.cwd(), "data/cache"),
  secUserAgent:
    process.env.SEC_USER_AGENT ??
    "industry-risk-map local research prototype contact@example.com",
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 12000)
};

