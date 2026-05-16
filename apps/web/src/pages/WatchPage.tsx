import { useQuery } from "@tanstack/react-query";
import { Bell, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoticePanel } from "../components/NoticePanel";
import { SourceTraceList } from "../components/SourceTraceList";
import { getWatchWorkspaceView } from "../services/api";
import { useWorkspaceContextSync } from "../hooks/useWorkspaceContextSync";

export function WatchPage() {
  const query = useQuery({ queryKey: ["watchWorkspace"], queryFn: getWatchWorkspaceView });
  const data = query.data;
  useWorkspaceContextSync(
    data?.context ?? {
      eventId: null,
      eventName: null,
      windowId: "pending",
      windowLabel: "等待公开数据快照",
      updatedAt: new Date().toISOString(),
      viewMode: "watch"
    }
  );

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!data) return null;

  return (
    <div className="page two-column">
      <div className="page-header full-span">
        <div>
          <p className="eyebrow">指标复核</p>
          <h1>复核事件窗、阈值和证据来源</h1>
        </div>
        <div className="header-stats">
          <Metric label="复核对象" value={data.summary.watchItemCount} />
          <Metric label="指标规则" value={data.summary.activeRuleCount} />
          <Metric label="窗口变化" value={data.summary.changedTodayCount} />
        </div>
      </div>
      <NoticePanel notices={data.partialDataNotice} />

      <section className="panel">
        <div className="section-title">
          <h2>复核对象</h2>
          <Bell size={18} />
        </div>
        <div className="watch-list">
          {data.items.map((item) => (
            item.targetType === "event" ? (
              <Link key={item.watchId} to={`/events/${item.targetId}/overview`}>
                <div>
                  <strong>{item.targetName}</strong>
                  <span>{item.targetType} / {item.status}</span>
                  <p>{item.latestSignal}</p>
                </div>
              </Link>
            ) : (
              <a key={item.watchId} href={item.sourceUrl} target="_blank" rel="noreferrer">
                <div>
                  <strong>{item.targetName}</strong>
                  <span>{item.targetType} / {item.status}</span>
                  <p>{item.latestSignal}</p>
                </div>
                <ExternalLink size={15} />
              </a>
            )
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>窗口变化</h2>
          <span>{data.ruleSummary.defaultWindowLabel}</span>
        </div>
        <div className="watch-list">
          {data.changeFeed.map((item) => (
            <a key={item.changeId} href={item.sourceUrl} target="_blank" rel="noreferrer">
              <div>
                <strong>{item.targetName}</strong>
                <p>{item.summary}</p>
              </div>
              <ExternalLink size={15} />
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
