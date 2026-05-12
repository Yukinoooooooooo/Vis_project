import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellPlus, FileText, GitBranch, Layers } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { EvidenceBadge, JudgmentBadge, SeverityBadge } from "../components/LevelBadge";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoticePanel } from "../components/NoticePanel";
import { SourceTraceList } from "../components/SourceTraceList";
import { addWatchItem, buildReportOutline, getEventOverviewView } from "../services/api";
import { useWorkspaceContextSync } from "../hooks/useWorkspaceContextSync";

export function EventOverviewPage() {
  const { eventId = "" } = useParams();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["eventOverview", eventId], queryFn: () => getEventOverviewView(eventId), enabled: Boolean(eventId) });
  const watchMutation = useMutation({
    mutationFn: () => addWatchItem({ targetType: "event", targetId: eventId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eventOverview", eventId] })
  });
  const reportMutation = useMutation({ mutationFn: () => buildReportOutline(eventId) });
  const data = query.data;
  useWorkspaceContextSync(
    data?.context ?? {
      eventId,
      eventName: null,
      windowId: "pending",
      windowLabel: "等待公开数据快照",
      updatedAt: new Date().toISOString(),
      viewMode: "event"
    }
  );

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!data) return null;

  return (
    <div className="page two-column">
      <div className="page-header full-span">
        <div>
          <p className="eyebrow">事件详情</p>
          <h1>{data.header.title}</h1>
          <p className="lead">{data.header.summary}</p>
        </div>
        <div className="action-row">
          <button className="primary-button" onClick={() => watchMutation.mutate()} type="button">
            <BellPlus size={17} />
            加入观察
          </button>
          <button className="secondary-button" onClick={() => reportMutation.mutate()} type="button">
            <FileText size={17} />
            生成表达骨架
          </button>
        </div>
      </div>
      <NoticePanel notices={data.partialDataNotice} />

      <section className="panel">
        <div className="section-title">
          <h2>风险总览</h2>
          <SeverityBadge level={data.header.severityLevel} />
        </div>
        <div className="overview-grid">
          <Metric label="判断等级" value={<JudgmentBadge level={data.overview.judgmentLevel} />} />
          <Metric label="证据等级" value={<EvidenceBadge level={data.overview.evidenceLevel} />} />
          <Metric label="影响节点" value={data.overview.affectedNodeCount} />
          <Metric label="暴露企业" value={data.overview.affectedCompanyCount} />
        </div>
        <p className="boundary">{data.overview.boundaryHint}</p>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>传播摘要</h2>
          <GitBranch size={18} />
        </div>
        <p>{data.pathSummary.summaryText}</p>
        <div className="path-counts">
          <span>{data.pathSummary.primaryPathCount} 条主路径</span>
          <span>{data.pathSummary.secondaryPathCount} 条次级路径</span>
        </div>
        <Link className="inline-link" to={`/events/${eventId}/map`}>
          查看传播地图
        </Link>
      </section>

      <section className="panel full-span">
        <div className="section-title">
          <h2>关键判断</h2>
          <Layers size={18} />
        </div>
        <div className="assessment-list">
          {data.keyAssessments.map((assessment) => (
            <Link
              key={assessment.assessmentId}
              className="assessment-card"
              to={`/events/${eventId}/evidence?targetType=${assessment.targetType}&targetId=${assessment.targetId}`}
            >
              <div>
                <strong>{assessment.targetName}</strong>
                <p>{assessment.judgmentText}</p>
              </div>
              <div className="badge-row">
                <JudgmentBadge level={assessment.judgmentLevel} />
                <EvidenceBadge level={assessment.evidenceLevel} />
                <span>{assessment.evidenceCount} 证据</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {reportMutation.data ? (
        <section className="panel full-span report-panel">
          <div className="section-title">
            <h2>研究表达骨架</h2>
            <span>{reportMutation.data.sourceUrls.length} 个来源</span>
          </div>
          <pre>{reportMutation.data.markdown}</pre>
        </section>
      ) : null}

      <SourceTraceList traces={data.sourceTrace} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="metric boxed">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
