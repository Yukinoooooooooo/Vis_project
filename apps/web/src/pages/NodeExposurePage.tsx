import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellPlus, ExternalLink } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link, useParams } from "react-router-dom";
import { FactBadge } from "../components/FactBadge";
import { EvidenceBadge, JudgmentBadge, SeverityBadge } from "../components/LevelBadge";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoticePanel } from "../components/NoticePanel";
import { SourceTraceList } from "../components/SourceTraceList";
import { addWatchItem, getNodeExposureView } from "../services/api";
import { useWorkspaceContextSync } from "../hooks/useWorkspaceContextSync";

export function NodeExposurePage() {
  const { eventId = "", nodeId = "" } = useParams();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["nodeExposure", eventId, nodeId],
    queryFn: () => getNodeExposureView(eventId, nodeId),
    enabled: Boolean(eventId && nodeId)
  });
  const watchMutation = useMutation({
    mutationFn: () => addWatchItem({ targetType: "node", targetId: nodeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nodeExposure", eventId, nodeId] })
  });
  const data = query.data;
  useWorkspaceContextSync(
    data?.context ?? {
      eventId,
      eventName: null,
      windowId: "pending",
      windowLabel: "等待公开数据快照",
      updatedAt: new Date().toISOString(),
      viewMode: "node"
    },
    data?.context.nodeId ?? nodeId
  );

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!data) return null;

  const series = data.signals.nodeSignals[0]?.points ?? [];

  return (
    <div className="page two-column">
      <div className="page-header full-span">
        <div>
          <p className="eyebrow">节点与暴露</p>
          <h1>{data.nodeCard.nodeName}</h1>
          <p className="lead">{data.nodeCard.summary}</p>
        </div>
        <button className="primary-button" onClick={() => watchMutation.mutate()} type="button">
          <BellPlus size={17} />
          观察节点
        </button>
      </div>
      <NoticePanel notices={data.partialDataNotice} />

      <section className="panel">
        <div className="section-title">
          <h2>节点判断</h2>
          <FactBadge factType={data.nodeCard.factType} />
        </div>
        <div className="badge-row">
          <SeverityBadge level={data.nodeCard.riskLevel} />
          <JudgmentBadge level={data.nodeCard.judgmentLevel} />
          <EvidenceBadge level={data.nodeCard.evidenceLevel} />
        </div>
        <p className="boundary">{data.nodeCard.boundaryHint}</p>
        <a className="inline-link" href={data.nodeCard.sourceUrl} target="_blank" rel="noreferrer">
          查看原始来源 <ExternalLink size={14} />
        </a>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>上下游影响链</h2>
          <span>{data.upstreamDownstream.upstreamNodes.length + data.upstreamDownstream.downstreamNodes.length} 个相邻节点</span>
        </div>
        <div className="node-mini-list">
          {[...data.upstreamDownstream.upstreamNodes, ...data.upstreamDownstream.downstreamNodes].map((node) => (
            <Link key={node.nodeId} to={`/events/${eventId}/nodes/${node.nodeId}`}>
              <strong>{node.nodeName}</strong>
              <span>{node.relationType}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel full-span">
        <div className="section-title">
          <h2>暴露对象</h2>
          <span>只展示公开源可追溯对象</span>
        </div>
        <div className="exposure-grid">
          {data.exposureGroups.map((group) => (
            <div key={group.groupKey} className="exposure-group">
              <h3>{group.groupLabel}</h3>
              {group.items.length ? (
                group.items.map((item) => (
                  <div key={item.companyId} className="exposure-item">
                    <div>
                      <strong>{item.companyName}</strong>
                      <p>{item.reason}</p>
                    </div>
                    <div className="badge-row">
                      <FactBadge factType={item.factType} />
                      <span>{item.exposureScore}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">暂无该等级对象</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="panel full-span chart-panel">
        <div className="section-title">
          <h2>信号趋势</h2>
          <span>{data.signals.trendSummary}</span>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={series}>
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <SourceTraceList traces={data.sourceTrace} />
    </div>
  );
}
