import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Gauge, GitCompareArrows, RadioTower, Sparkles } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState, type ReactNode } from "react";
import { EventConstellationScene } from "../components/EventConstellationScene";
import { FactBadge } from "../components/FactBadge";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoticePanel } from "../components/NoticePanel";
import { SourceTraceList } from "../components/SourceTraceList";
import { getEventConstellationView } from "../services/api";
import { useWorkspaceContextSync } from "../hooks/useWorkspaceContextSync";

export function EventConstellationPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const eventId = params.eventId ?? searchParams.get("eventId");
  const query = useQuery({
    queryKey: ["eventConstellation", eventId],
    queryFn: () => getEventConstellationView(eventId),
    staleTime: 60_000
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const data = query.data;
  useWorkspaceContextSync(
    data?.context ?? {
      eventId: eventId ?? null,
      eventName: null,
      windowId: "pending",
      windowLabel: "等待公开数据快照",
      updatedAt: new Date().toISOString(),
      viewMode: "constellation"
    }
  );

  const selectedNode = useMemo(() => {
    if (!data) return null;
    return data.nodes.find((node) => node.id === (selectedNodeId ?? data.focusEventId)) ?? data.nodes[0] ?? null;
  }, [data, selectedNodeId]);

  if (query.isLoading) return <LoadingState label="正在生成事件星图" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!data) return null;

  return (
    <div className="constellation-page">
      <div className="constellation-hero">
        <EventConstellationScene view={data} selectedNodeId={selectedNode?.id ?? null} onSelect={setSelectedNodeId} />

        <div className="constellation-metrics">
          <Metric icon={<Sparkles size={16} />} label="事件" value={data.summary.eventCount} />
          <Metric icon={<RadioTower size={16} />} label="指标节点" value={data.summary.chainNodeCount} />
          <Metric icon={<GitCompareArrows size={16} />} label="关系" value={data.summary.relationCount} />
          <Metric icon={<Gauge size={16} />} label="最大Z" value={data.summary.maxZScore ?? "-"} />
        </div>

        <aside className="constellation-inspector">
          {selectedNode ? (
            <>
              <div className="section-title">
                <h2>{selectedNode.label}</h2>
                <FactBadge factType={selectedNode.factType} />
              </div>
              <dl>
                <div>
                  <dt>类型</dt>
                  <dd>{kindLabel(selectedNode.kind)}</dd>
                </div>
                <div>
                  <dt>资金热度</dt>
                  <dd>{selectedNode.heatScore}</dd>
                </div>
                <div>
                  <dt>时间差</dt>
                  <dd>{formatLag(selectedNode.lagDays)}</dd>
                </div>
                <div>
                  <dt>来源</dt>
                  <dd>{selectedNode.sourceName}</dd>
                </div>
                {selectedNode.financialMetric ? (
                  <>
                    <div>
                      <dt>峰值 Z</dt>
                      <dd>{selectedNode.financialMetric.peakZScore}</dd>
                    </div>
                    <div>
                      <dt>峰值日</dt>
                      <dd>{selectedNode.financialMetric.peakDate.slice(0, 10)}</dd>
                    </div>
                    <div>
                      <dt>首次异常</dt>
                      <dd>{selectedNode.financialMetric.firstAbnormalDate?.slice(0, 10) ?? "未达阈值"}</dd>
                    </div>
                    <div>
                      <dt>代理变量</dt>
                      <dd>{selectedNode.financialMetric.proxyVariable}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
              <div className="action-row">
                {selectedNode.eventId ? (
                  <Link className="primary-button" to={`/events/${selectedNode.eventId}/overview`}>
                    打开事件
                  </Link>
                ) : null}
                {selectedNode.nodeId && selectedNode.eventId ? (
                  <Link className="secondary-button" to={`/events/${selectedNode.eventId}/nodes/${selectedNode.nodeId}`}>
                    打开节点
                  </Link>
                ) : null}
                {selectedNode.sourceUrl ? (
                  <a className="secondary-button" href={selectedNode.sourceUrl} target="_blank" rel="noreferrer">
                    来源 <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </>
          ) : null}
        </aside>
      </div>

      <NoticePanel notices={data.partialDataNotice} />

      <div className="constellation-panels">
        <section className="panel">
          <div className="section-title">
            <h2>热度编码</h2>
            <span>球体大小和发光强度</span>
          </div>
          <div className="legend-list">
            {data.heatLegend.map((item) => (
              <span key={item.label}>
                <i style={{ background: item.color }} />
                {item.label} ≥ {item.minScore}
              </span>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>滞后性编码</h2>
            <span>关系线颜色</span>
          </div>
          <div className="legend-list">
            {data.lagLegend.map((item) => (
              <span key={item.label}>
                <i style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </section>
      </div>

      <SourceTraceList traces={data.sourceTrace} />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="constellation-metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function kindLabel(kind: string): string {
  if (kind === "focusEvent") return "中心热点事件";
  if (kind === "relatedEvent") return "相关事件";
  if (kind === "chainNode") return "产业链节点";
  return "公开来源";
}


function formatLag(days: number): string {
  if (days === 0) return "同步";
  if (days < 0) return `领先 ${Math.abs(days)} 天`;
  return `滞后 ${days} 天`;
}
