import { Navigate, Route, Routes } from "react-router-dom";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { EvidencePage } from "../pages/EvidencePage";
import { EventOverviewPage } from "../pages/EventOverviewPage";
import { EventConstellationPage } from "../pages/EventConstellationPage";
import { NodeExposurePage } from "../pages/NodeExposurePage";
import { PropagationMapPage } from "../pages/PropagationMapPage";
import { RadarPage } from "../pages/RadarPage";
import { WatchPage } from "../pages/WatchPage";

export function App() {
  return (
    <WorkspaceLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/radar" replace />} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/constellation" element={<EventConstellationPage />} />
        <Route path="/events/:eventId/overview" element={<EventOverviewPage />} />
        <Route path="/events/:eventId/constellation" element={<EventConstellationPage />} />
        <Route path="/events/:eventId/map" element={<PropagationMapPage />} />
        <Route path="/events/:eventId/nodes/:nodeId" element={<NodeExposurePage />} />
        <Route path="/events/:eventId/evidence" element={<EvidencePage />} />
        <Route path="/watch" element={<WatchPage />} />
      </Routes>
    </WorkspaceLayout>
  );
}
