import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PRODUCT_BRANDING } from "@risk-map/shared";
import { ArrowRight, ChevronDown, ChevronUp, Database, ExternalLink, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { FactBadge } from "../components/FactBadge";
import { LoadingState } from "../components/LoadingState";
import { NoticePanel } from "../components/NoticePanel";
import { SeverityBadge } from "../components/LevelBadge";
import { SourceTraceList } from "../components/SourceTraceList";
import { getRadarView } from "../services/api";
import { useWorkspaceContextSync } from "../hooks/useWorkspaceContextSync";

export function RadarPage() {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const query = useQuery({ queryKey: ["radarView"], queryFn: getRadarView });
  const data = query.data;
  useWorkspaceContextSync(
    data?.context ?? {
      eventId: null,
      eventName: null,
      windowId: "pending",
      windowLabel: "等待公开数据快照",
      updatedAt: new Date().toISOString(),
      viewMode: "radar"
    }
  );

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <div className="error-state">{query.error.message}</div>;
  if (!data) return null;

  return (
    <div className="page radar-grid">
      <div className="page-header full-span">
        <div>
          <p className="eyebrow">{PRODUCT_BRANDING.name}</p>
          <h1>国际热点事件后的科技板块联动</h1>
        </div>
        <div className="header-stats">
          <Metric label="热点/指标" value={data.summary.eventCount} />
          <Metric label="高异常" value={data.summary.highSeverityCount} />
          <Metric label="显著响应" value={data.summary.expandingCount} />
          <Metric label="复核对象" value={data.summary.watchRelatedCount} />
        </div>
      </div>

      <NoticePanel notices={data.partialDataNotice} />

      <section className="panel event-list-panel">
        <div className="section-title">
          <h2>热点事件与科技链指标</h2>
          <span>{data.context.windowLabel}</span>
        </div>
        {data.items.length ? (
          <div className="event-list">
            {data.items.map((item) => (
              <Link key={item.eventId} className="event-card" to={`/events/${item.eventId}/overview`}>
                <div className="card-topline">
                  <SeverityBadge level={item.severityLevel} />
                  <span className="status-pill">{item.status}</span>
                  <FactBadge factType={item.factType} />
                  {item.isInWatchlist ? <Star size={14} fill="currentColor" /> : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="tag-row">
                  {item.themeTags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="card-footer">
                  <span>{item.affectedNodeCount} 联动节点 / {item.affectedCompanyCount} 点名对象</span>
                  <ArrowRight size={16} />
                </div>
                <div style={{ fontSize: 12, color: "var(--studio-muted)", display: "flex", gap: 12 }}>
                  <span>发现：{new Date(item.firstObservedAt).toLocaleDateString()}</span>
                  <span>更新：{item.latestChange}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyRadar />
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>结论边界</h2>
          <ShieldCheck size={18} />
        </div>
        <div className="policy-list">
          {data.derivationPolicy.rules.map((rule) => (
            <div key={rule.ruleId} className="policy-item">
              <FactBadge factType={rule.factType} />
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>数据来源</h2>
          <Database size={18} />
        </div>
        <div className="source-list">
          {data.items.slice(0, sourcesExpanded ? undefined : 8).map((item) => (
            <a key={item.eventId} href={item.sourceUrl} target="_blank" rel="noreferrer">
              <div>
                <strong>{item.title}</strong>
                <span>{new Date(item.updatedAt).toLocaleString()}</span>
              </div>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
        {data.items.length > 8 ? (
          <button
            className="secondary-button"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() => setSourcesExpanded((v) => !v)}
            type="button"
          >
            {sourcesExpanded ? <><ChevronUp size={16} /> 收起来源</> : <><ChevronDown size={16} /> 展开全部（{data.items.length}）</>}
          </button>
        ) : null}
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

function EmptyRadar() {
  return (
    <div className="empty-state">
      <h3>还没有事件窗数据快照</h3>
      <p>点击右上角刷新公开数据，或运行 npm run data:refresh 生成热点事件与科技板联动快照。</p>
    </div>
  );
}
