import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveApiCacheDir } from "./config";

describe("resolveApiCacheDir", () => {
  it("uses the API package data cache regardless of launch working directory", () => {
    const rootLaunchedCacheDir = resolveApiCacheDir(path.resolve("..", ".."));
    expect(rootLaunchedCacheDir).toBe(path.resolve("data/cache"));
  });
});
