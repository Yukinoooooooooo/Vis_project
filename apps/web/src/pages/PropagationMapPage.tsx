import { useQuery } from "@tanstack/react-query";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "reactflow";
import { useNavigate, useParams } from "react-router-dom";
import { FactBadge } from "../components/FactBadge";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoticePanel } from "../components/NoticePanel";
import { SourceTraceList } from "../components/SourceTraceList";
import { getPropagationMapView } from "../services/api";
import { useWorkspaceContextSync } from "../hooks/useWorkspaceContextSync";

export function PropagationMapPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["propagationMap", eventId], queryFn: () => getPropagationMapView(eventId), enabled: Boolean(eventId) });
  const data = query.data;
  useWorkspaceContextSync(
    data?.context ?? {
      eventId,
      eventName: null,
      windowId: "pending",
      windowLabel: "等待公开数据快照",
      updatedAt: new Date().toISOString(),
      viewMode: "map"
    },
    data?.summary.focusNodeId ?? null
  );

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!data) return null;

  const flowNodes: Node[] = data.graph.nodes.map((node, index) => ({
    id: node.nodeId,
    type: "default",
    position: { x: 80 + index * 260, y: index % 2 === 0 ? 120 : 280 },
    data: { label: `${node.nodeName}\n${node.nodeType}` },
    style: {
      border: `2px solid ${node.riskLevel === "critical" || node.riskLevel === "high" ? "#be123c" : "#2563eb"}`,
      background: node.factType === "directFact" ? "#ffffff" : "#f8fafc",
      width: 190,
      minHeight: 72,
      borderRadius: 8,
      fontSize: 12
    }
  }));
  const flowEdges: Edge[] = data.graph.edges.map((edge) => ({
    id: edge.edgeId,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    label: edge.ruleId,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: edge.derivationType === "ruleDerived"
  }));

  return (
    <div className="page map-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">传播地图</p>
          <h1>{data.context.eventName}</h1>
        </div>
        <div className="header-stats">
          <Metric label="节点" value={data.summary.nodeCount} />
          <Metric label="边" value={data.summary.edgeCount} />
          <Metric label="主路径" value={data.summary.primaryPathCount} />
        </div>
      </div>
      <NoticePanel notices={data.partialDataNotice} />

      <section className="panel graph-panel">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          onNodeClick={(_, node) => navigate(`/events/${eventId}/nodes/${node.id}`)}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>路径解释</h2>
          <span>{data.legend.length} 类</span>
        </div>
        <div className="edge-list">
          {data.graph.edges.map((edge) => (
            <a key={edge.edgeId} href={edge.sourceUrl} target="_blank" rel="noreferrer">
              <FactBadge factType={edge.derivationType} />
              <strong>{edge.relationType}</strong>
              <span>{edge.ruleId}</span>
            </a>
          ))}
        </div>
      </section>

      <SourceTraceList traces={data.sourceTrace} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
