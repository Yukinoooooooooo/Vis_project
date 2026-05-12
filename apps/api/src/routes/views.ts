import { Router } from "express";
import { readSnapshot } from "../data/cache";
import { fail, ok } from "../http/respond";
import {
  getEvidenceAssessmentView,
  getEventConstellationView,
  getEventOverviewView,
  getNodeExposureView,
  getPropagationMapView,
  getRadarView,
  getWatchWorkspaceView,
  ViewError
} from "../services/viewService";

export const viewsRouter = Router();

viewsRouter.get("/radar", async (_req, res) => {
  const snapshot = await readSnapshot();
  ok(res, getRadarView(snapshot));
});

viewsRouter.get("/constellation", async (req, res) => {
  const snapshot = await readSnapshot();
  ok(res, getEventConstellationView(snapshot, req.query.eventId ? String(req.query.eventId) : null));
});

viewsRouter.get("/events/:eventId/overview", async (req, res) => {
  await handle(res, async () => getEventOverviewView(await readSnapshot(), req.params.eventId));
});

viewsRouter.get("/events/:eventId/propagation-map", async (req, res) => {
  await handle(res, async () => getPropagationMapView(await readSnapshot(), req.params.eventId));
});

viewsRouter.get("/events/:eventId/nodes/:nodeId/exposure", async (req, res) => {
  await handle(res, async () => getNodeExposureView(await readSnapshot(), req.params.eventId, req.params.nodeId));
});

viewsRouter.get("/events/:eventId/evidence-assessment", async (req, res) => {
  await handle(res, async () =>
    getEvidenceAssessmentView(
      await readSnapshot(),
      req.params.eventId,
      parseTargetType(req.query.targetType),
      String(req.query.targetId ?? req.params.eventId),
      req.query.compareTargetId ? String(req.query.compareTargetId) : null
    )
  );
});

viewsRouter.get("/watch-workspace", async (_req, res) => {
  const snapshot = await readSnapshot();
  ok(res, getWatchWorkspaceView(snapshot));
});

async function handle<T>(res: Parameters<typeof ok<T>>[0], action: () => Promise<T> | T): Promise<void> {
  try {
    ok(res, await action());
  } catch (error) {
    if (error instanceof ViewError) {
      fail(res, error.status, error.code, error.message);
      return;
    }
    fail(res, 500, 5000, error instanceof Error ? error.message : String(error));
  }
}

function parseTargetType(value: unknown): "event" | "node" | "company" {
  if (value === "node" || value === "company" || value === "event") return value;
  return "event";
}
