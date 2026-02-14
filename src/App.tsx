import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { ConnectionPage } from "./pages/ConnectionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DeviceSetupPage } from "./pages/DeviceSetupPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SyncExecutionPage } from "./pages/SyncExecutionPage";
import { SyncItemsPage } from "./pages/SyncItemsPage";

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/device-setup" element={<DeviceSetupPage />} />
          <Route path="/connection" element={<ConnectionPage />} />
          <Route path="/sync-items" element={<SyncItemsPage />} />
          <Route path="/sync" element={<SyncExecutionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
