import { Router } from "express";
import { z } from "zod";
import { readSnapshot } from "../data/cache";
import { fail, ok } from "../http/respond";
import { addWatchItem, buildReportOutline, patchWatchRule, removeWatchItem } from "../services/commandService";
import { ViewError } from "../services/viewService";

export const commandsRouter = Router();

const addWatchSchema = z.object({
  targetType: z.enum(["event", "node", "company"]),
  targetId: z.string().min(1),
  targetName: z.string().optional(),
  sourceUrl: z.string().url().optional()
});

commandsRouter.post("/watch-items", async (req, res) => {
  await handle(res, async () => {
    const input = addWatchSchema.parse(req.body);
    return addWatchItem(await readSnapshot(), input);
  });
});

commandsRouter.delete("/watch-items/:watchId", async (req, res) => {
  await handle(res, async () => {
    await removeWatchItem(await readSnapshot(), req.params.watchId);
    return { removed: true };
  });
});

commandsRouter.patch("/watch-rules/:ruleId", async (req, res) => {
  await handle(res, async () => {
    const parsed = z.object({ status: z.enum(["active", "paused"]) }).parse(req.body);
    return patchWatchRule(await readSnapshot(), req.params.ruleId, parsed.status);
  });
});

commandsRouter.post("/reports/outline", async (req, res) => {
  await handle(res, async () => {
    const parsed = z.object({ eventId: z.string().min(1) }).parse(req.body);
    return buildReportOutline(await readSnapshot(), parsed.eventId);
  });
});

async function handle<T>(res: Parameters<typeof ok<T>>[0], action: () => Promise<T> | T): Promise<void> {
  try {
    ok(res, await action());
  } catch (error) {
    if (error instanceof z.ZodError) {
      fail(res, 400, 4001, error.issues.map((issue) => issue.message).join("; "));
      return;
    }
    if (error instanceof ViewError) {
      fail(res, error.status, error.code, error.message);
      return;
    }
    fail(res, 500, 5000, error instanceof Error ? error.message : String(error));
  }
}

