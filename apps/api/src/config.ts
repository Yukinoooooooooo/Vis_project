import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function resolveApiCacheDir(_launchCwd = process.cwd()): string {
  return path.join(apiRootDir, "data/cache");
}

export const apiConfig = {
  port: Number(process.env.PORT ?? 4317),
  cacheDir: resolveApiCacheDir(),
  secUserAgent:
    process.env.SEC_USER_AGENT ??
    "hot-event-tech-board-linkage local research prototype contact@example.com",
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 12000)
};
