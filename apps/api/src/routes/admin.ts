import { Router } from "express";
import { readSnapshot } from "../data/cache";
import { refreshSnapshot } from "../data/refresh";
import { ok } from "../http/respond";

export const adminRouter = Router();

adminRouter.post("/data/refresh", async (_req, res) => {
  const snapshot = await refreshSnapshot();
  ok(res, {
    generatedAt: snapshot.generatedAt,
    sourceCount: snapshot.sources.length,
    eventCount: snapshot.events.length,
    evidenceCount: snapshot.evidenceCards.length,
    failedSources: snapshot.sources.filter((source) => source.status === "failed")
  });
});

adminRouter.get("/data/sources", async (_req, res) => {
  const snapshot = await readSnapshot();
  ok(res, snapshot.sources);
});

adminRouter.get("/data/snapshots/latest", async (_req, res) => {
  const snapshot = await readSnapshot();
  ok(res, {
    generatedAt: snapshot.generatedAt,
    sourceCount: snapshot.sources.length,
    eventCount: snapshot.events.length,
    evidenceCount: snapshot.evidenceCards.length
  });
});

