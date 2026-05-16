import { Activity, Bell, FileText, GitBranch, Home, Map, Orbit, Radar, RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PRODUCT_BRANDING } from "@risk-map/shared";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { refreshData } from "../services/api";
import { useWorkspaceStore } from "../stores/workspace";

// Match /events/:eventId/* from the URL to prevent sidebar flicker during store transitions
function useEventIdFromPath(): string | null {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/events\/([^/]+)/);
  return match?.[1] ?? null;
}

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const queryClient = useQueryClient();
  const context = useWorkspaceStore((state) => state.context);
  const refreshMutation = useMutation({
    mutationFn: refreshData,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    }
  });

  const eventIdFromPath = useEventIdFromPath();
  const activeEventId = context.currentEventId ?? eventIdFromPath;
  const activeNodeId = context.currentNodeId;

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 16);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <Map size={22} />
          <span>{PRODUCT_BRANDING.sidebarName}</span>
        </div>
        <nav className="nav">
          {/* Top-level navigation */}
          <NavLink to="/radar" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Radar size={18} />
            <span>分析总览</span>
          </NavLink>
          <NavLink to={activeEventId ? `/events/${activeEventId}/constellation` : "/constellation"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Orbit size={18} />
            <span>扩散星图</span>
          </NavLink>
          <NavLink to="/watch" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Bell size={18} />
            <span>指标复核</span>
          </NavLink>

          {/* Event-scoped navigation — derived from URL as fallback to prevent flicker */}
          {activeEventId ? (
            <>
              <NavLink to={`/events/${activeEventId}/overview`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Home size={18} />
                <span>热点详情</span>
              </NavLink>
              <NavLink to={`/events/${activeEventId}/map`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <GitBranch size={18} />
                <span>扩散路径</span>
              </NavLink>
              {activeNodeId ? (
                <NavLink to={`/events/${activeEventId}/nodes/${activeNodeId}`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                  <Activity size={18} />
                  <span>联动节点</span>
                </NavLink>
              ) : null}
              <NavLink to={`/events/${activeEventId}/evidence?targetType=event&targetId=${activeEventId}`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <FileText size={18} />
                <span>证据复核</span>
              </NavLink>
            </>
          ) : null}
        </nav>
      </aside>
      <main className="main">
        <header className={`topbar ${isScrolled ? "topbar-scrolled" : ""}`}>
          <div className="context-strip">
            <Breadcrumbs />
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => refreshMutation.mutate()} title="刷新公开数据" type="button">
              <RefreshCw size={17} className={refreshMutation.isPending ? "spin" : ""} />
            </button>
          </div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
