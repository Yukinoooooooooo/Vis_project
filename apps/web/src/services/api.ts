import type {
  ApiResponse,
  EventConstellationView,
  EvidenceAssessmentView,
  EventOverviewView,
  NodeExposureView,
  PropagationMapView,
  RadarView,
  WatchItem,
  WatchTargetType,
  WatchWorkspaceView
} from "@risk-map/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || body.code !== 0) {
    throw new Error(body.message || `Request failed: ${response.status}`);
  }
  return body.data;
}

export const getRadarView = () => request<RadarView>("/views/radar");
export const getEventConstellationView = (eventId?: string | null) =>
  request<EventConstellationView>(eventId ? `/views/constellation?eventId=${encodeURIComponent(eventId)}` : "/views/constellation");
export const getEventOverviewView = (eventId: string) => request<EventOverviewView>(`/views/events/${eventId}/overview`);
export const getPropagationMapView = (eventId: string) => request<PropagationMapView>(`/views/events/${eventId}/propagation-map`);
export const getNodeExposureView = (eventId: string, nodeId: string) =>
  request<NodeExposureView>(`/views/events/${eventId}/nodes/${nodeId}/exposure`);
export const getEvidenceAssessmentView = (eventId: string, targetType: WatchTargetType, targetId: string) =>
  request<EvidenceAssessmentView>(
    `/views/events/${eventId}/evidence-assessment?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`
  );
export const getWatchWorkspaceView = () => request<WatchWorkspaceView>("/views/watch-workspace");

export const refreshData = () =>
  request<{ generatedAt: string; sourceCount: number; eventCount: number; evidenceCount: number }>("/admin/data/refresh", {
    method: "POST"
  });

export const addWatchItem = (input: { targetType: WatchTargetType; targetId: string; targetName?: string; sourceUrl?: string }) =>
  request<WatchItem>("/commands/watch-items", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const buildReportOutline = (eventId: string) =>
  request<{ markdown: string; sourceUrls: string[] }>("/commands/reports/outline", {
    method: "POST",
    body: JSON.stringify({ eventId })
  });
