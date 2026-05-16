import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspaceStore } from "../stores/workspace";

const LABEL_MAP: Record<string, string> = {
  radar: "分析总览",
  constellation: "扩散星图",
  watch: "指标复核",
  events: "热点事件",
  overview: "热点详情",
  map: "扩散路径",
  evidence: "证据复核",
  nodes: "联动节点"
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const currentEventName = useWorkspaceStore((s) => s.context.currentEventName);
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: Array<{ label: string; to: string }> = [];
  let accumulated = "";

  for (const segment of segments) {
    accumulated += `/${segment}`;
    let label = LABEL_MAP[segment] ?? segment;

    // Replace event IDs with the event name when available
    if (segment.length > 8 && !LABEL_MAP[segment] && segments.includes("events")) {
      const eventIndex = segments.indexOf("events");
      if (eventIndex >= 0 && eventIndex + 1 < segments.length && segments[eventIndex + 1] === segment) {
        label = currentEventName ?? segment;
      }
    }

    crumbs.push({ label, to: accumulated });
  }

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--studio-muted)" }}>
      {crumbs.map((crumb, i) => (
        <span key={crumb.to} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 ? <ChevronRight size={13} /> : null}
          {i < crumbs.length - 1 ? (
            <Link to={crumb.to} style={{ color: "var(--studio-muted)" }}>
              {crumb.label}
            </Link>
          ) : (
            <span style={{ color: "var(--studio-text)", fontWeight: 700 }}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
