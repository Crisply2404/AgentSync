
import React, { useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { SSHConfig, SyncItem, GlobalSettings, SyncStatus, HistoryEntry } from './types';
import Dashboard from './views/Dashboard';
import Connection from './views/Connection';
import SyncItems from './views/SyncItems';
import History from './views/History';
import SyncExecution from './views/SyncExecution';

const App: React.FC = () => {
  const [sshConfig, setSshConfig] = useState<SSHConfig>({
    host: '192.168.1.100',
    port: 22,
    user: 'developer',
    keyPath: '~/.ssh/id_rsa',
    remoteRoot: '~/AgentSync/'
  });

  const [items, setItems] = useState<SyncItem[]>([
    { id: '1', name: '前端项目 (Frontend)', path: 'C:\\Projects\\my-react-app', enabled: true },
    { id: '2', name: 'Python 后端', path: 'C:\\Projects\\api-service', enabled: true }
  ]);

  const [settings, setSettings] = useState<GlobalSettings>({
    syncCodex: true,
    syncAgents: false,
    mirrorDelete: false,
    excludeRules: ['node_modules', 'dist', 'build', '.venv', '.git', '.DS_Store']
  });

  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: 'h1',
      timestamp: Date.now() - 3600000,
      duration: '45s',
      status: SyncStatus.COMPLETED,
      summary: { added: 12, updated: 5, errors: 0 },
      log: ['[信息] 正在连接 192.168.1.100...', '[信息] 正在同步前端项目', '[成功] 同步完成。']
    }
  ]);

  const [isSyncing, setIsSyncing] = useState(false);

  return (
    <HashRouter>
      <div className="flex flex-col h-screen bg-[#f3f4f6] text-[#2d3436]">
        {/* Top Header / Nav */}
        <header className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-sync-alt text-white text-sm"></i>
            </div>
            <h1 className="font-bold text-xl tracking-tight">AgentSync</h1>
          </div>
          
          <nav className="flex items-center bg-gray-100 p-1 rounded-xl">
            <TabLink to="/" icon="fa-paper-plane" label="传送" />
            <TabLink to="/items" icon="fa-folder-open" label="内容" />
            <TabLink to="/connection" icon="fa-server" label="目标" />
            <TabLink to="/history" icon="fa-history" label="历史" />
          </nav>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">已连接</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 flex justify-center">
          <div className="w-full max-w-2xl">
            <Routes>
              <Route path="/" element={<Dashboard history={history} isSyncing={isSyncing} onStartSync={() => setIsSyncing(true)} sshConfig={sshConfig} items={items} />} />
              <Route path="/connection" element={<Connection config={sshConfig} setConfig={setSshConfig} />} />
              <Route path="/items" element={<SyncItems items={items} setItems={setItems} settings={settings} setSettings={setSettings} />} />
              <Route path="/history" element={<History history={history} />} />
            </Routes>
          </div>
        </main>

        {isSyncing && (
          <SyncExecution 
            items={items} 
            settings={settings}
            sshConfig={sshConfig}
            onClose={(entry) => {
              if (entry) setHistory([entry, ...history]);
              setIsSyncing(false);
            }} 
          />
        )}
      </div>
    </HashRouter>
  );
};

const TabLink: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold
      ${isActive 
        ? 'bg-white text-indigo-600 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
      }
    `}
  >
    <i className={`fas ${icon}`}></i>
    {label}
  </NavLink>
);

export default App;
