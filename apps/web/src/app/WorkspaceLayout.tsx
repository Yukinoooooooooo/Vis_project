import { Activity, Bell, FileText, GitBranch, Home, Map, Orbit, Radar, RefreshCw, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshData } from "../services/api";
import { useWorkspaceStore } from "../stores/workspace";

const navItems = [
  { href: "/radar", label: "分析总览", icon: Radar },
  { href: "/constellation", label: "扩散星图", icon: Orbit },
  { href: "/watch", label: "指标复核", icon: Bell }
];

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
          <span>热点扩散分析</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.href} to={item.href} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {context.currentEventId ? (
            <>
              <NavLink to={`/events/${context.currentEventId}/overview`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Home size={18} />
                <span>热点详情</span>
              </NavLink>
              <NavLink to={`/events/${context.currentEventId}/map`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <GitBranch size={18} />
                <span>扩散路径</span>
              </NavLink>
              {context.currentNodeId ? (
                <NavLink to={`/events/${context.currentEventId}/nodes/${context.currentNodeId}`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                  <Activity size={18} />
                  <span>节点暴露</span>
                </NavLink>
              ) : null}
              <NavLink to={`/events/${context.currentEventId}/evidence?targetType=event&targetId=${context.currentEventId}`} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
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
            <span className="context-label">当前对象</span>
            <strong>{context.currentEventName ?? "SpaceX 事件窗分析"}</strong>
            <span>{context.currentWindowLabel ?? "等待公开数据快照"}</span>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <span>事件、指标、证据</span>
            </div>
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
