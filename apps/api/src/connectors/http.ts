import { apiConfig } from "../config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = apiConfig.requestTimeoutMs
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": apiConfig.secUserAgent,
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    return fetchJsonWithCurl<T>(url, init, timeoutMs, error);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithCurl<T>(url: string, init: RequestInit, timeoutMs: number, originalError: unknown): Promise<T> {
  const args = ["--max-time", String(Math.ceil(timeoutMs / 1000)), "-sS", "-L", url, "-H", "Accept: application/json"];
  const headers = normalizeHeaders(init.headers);
  for (const [key, value] of headers) {
    args.push("-H", `${key}: ${value}`);
  }
  if (init.method && init.method !== "GET") {
    args.push("-X", init.method);
  }
  if (typeof init.body === "string") {
    args.push("-d", init.body);
  }

  try {
    const { stdout } = await execFileAsync("curl", args, { timeout: timeoutMs + 1000, maxBuffer: 8 * 1024 * 1024 });
    return JSON.parse(stdout) as T;
  } catch {
    throw originalError;
  }
}

function normalizeHeaders(headers: RequestInit["headers"]): Array<[string, string]> {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers.map(([key, value]) => [key, String(value)]);
  if (headers instanceof Headers) {
    const values: Array<[string, string]> = [];
    headers.forEach((value, key) => values.push([key, value]));
    return values;
  }
  return Object.entries(headers).map(([key, value]) => [key, String(value)]);
}

export function safeText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return fallback;
}

export function compactText(value: string, maxLength = 220): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function isoNow(): string {
  return new Date().toISOString();
}
