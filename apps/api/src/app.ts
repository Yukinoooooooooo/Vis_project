import cors from "cors";
import express from "express";
import { adminRouter } from "./routes/admin";
import { commandsRouter } from "./routes/commands";
import { viewsRouter } from "./routes/views";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, generatedAt: new Date().toISOString() });
  });

  app.use("/views", viewsRouter);
  app.use("/commands", commandsRouter);
  app.use("/admin", adminRouter);

  return app;
}

