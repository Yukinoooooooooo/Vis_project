import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "reactflow";
import { useNavigate, useParams } from "react-router-dom";
import dagre from "dagre";
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

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

    const NODE_W = 190;
    const NODE_H = 84;

    const nodes: Node[] = data.graph.nodes.map((node) => ({
      id: node.nodeId,
      type: "default",
      position: { x: 0, y: 0 },
      data: { label: `${node.nodeName}\n${node.nodeType}\n热度 ${node.heatScore} · 异常 ${node.abnormalScore}` },
      style: {
        border: `2px solid ${node.riskLevel === "critical" || node.riskLevel === "high" ? "#be123c" : "#2563eb"}`,
        background: node.factType === "directFact" ? "#ffffff" : "#f8fafc",
        width: NODE_W,
        minHeight: NODE_H,
        borderRadius: 8,
        fontSize: 12,
        cursor: "pointer"
      }
    }));

    const edges: Edge[] = data.graph.edges.map((edge) => ({
      id: edge.edgeId,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: `${edge.ruleId} (${edge.strengthScore})`,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: edge.derivationType === "ruleDerived"
    }));

    // Layout with dagre
    nodes.forEach((n) => dagreGraph.setNode(n.id, { width: NODE_W, height: NODE_H }));
    edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));
    dagre.layout(dagreGraph);

    for (const node of nodes) {
      const pos = dagreGraph.node(node.id);
      node.position = { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 };
    }

    return { nodes, edges };
  }, [data]);

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
          <Metric label="活跃扩散" value={data.summary.expandingNodeCount} />
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

      {data.timeline.points.length > 0 ? (
        <section className="panel">
          <div className="section-title">
            <h2>时间线</h2>
            <span>{data.timeline.points.length} 个节点</span>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {data.timeline.points.map((pt) => (
              <div key={pt.pointId} className="metric" style={{ minWidth: 110, flexShrink: 0, ...(pt.isCurrent ? { borderColor: "var(--studio-border-hot)" } : {}) }}>
                <strong style={{ fontSize: 14 }}>{pt.label}</strong>
                <span>{pt.activeNodeCount} 活跃 · {pt.changedNodeCount} 变化</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
              <span>{edge.ruleId} · 强度 {edge.strengthScore}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>推导策略</h2>
        </div>
        <div className="policy-list">
          <div className="policy-item">
            <p>{data.derivationPolicy.summary}</p>
          </div>
          {data.derivationPolicy.rules.map((rule) => (
            <div key={rule.ruleId} className="policy-item">
              <FactBadge factType={rule.factType} />
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
            </div>
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
