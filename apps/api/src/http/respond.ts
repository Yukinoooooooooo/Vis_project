import type { ApiResponse } from "@risk-map/shared";
import type { Response } from "express";

export function ok<T>(res: Response, data: T): void {
  const body: ApiResponse<T> = {
    code: 0,
    message: "ok",
    data,
    meta: {
      requestId: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString()
    }
  };
  res.json(body);
}

export function fail(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({
    code,
    message,
    data: null,
    meta: {
      requestId: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString()
    }
  });
}

