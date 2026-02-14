
import React from 'react';
import { HistoryEntry, SSHConfig, SyncItem } from '../types';

interface DashboardProps {
  history: HistoryEntry[];
  isSyncing: boolean;
  onStartSync: () => void;
  sshConfig: SSHConfig;
  items: SyncItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ isSyncing, onStartSync, sshConfig, items }) => {
  const enabledItems = items.filter(i => i.enabled);

  return (
    <div className="space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Target Device Visual */}
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-white shadow-xl relative z-10">
            <i className="fas fa-desktop text-indigo-600 text-4xl"></i>
          </div>
          <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"></div>
          <div className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white z-20"></div>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">{sshConfig.host}</h2>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">{sshConfig.user}@{sshConfig.port}</p>
        </div>
      </div>

      {/* Content Summary Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-tighter">待同步内容</h3>
          <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded-full">
            {enabledItems.length} 个文件夹
          </span>
        </div>
        
        <div className="space-y-3">
          {enabledItems.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
              <i className="fas fa-folder text-indigo-400"></i>
              <span className="text-sm font-semibold truncate flex-1">{item.name}</span>
            </div>
          ))}
          {enabledItems.length > 3 && (
            <p className="text-center text-xs text-gray-400 font-medium">以及另外 {enabledItems.length - 3} 个项目...</p>
          )}
          {enabledItems.length === 0 && (
            <p className="text-center py-4 text-gray-400 text-sm italic">未选择任何项目</p>
          )}
        </div>
      </div>

      {/* Main Sync Button */}
      <div className="pt-4">
        <button 
          onClick={onStartSync}
          disabled={isSyncing || enabledItems.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-lg font-bold py-6 rounded-3xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          {isSyncing ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
          {isSyncing ? '正在同步...' : '立即同步到远程'}
        </button>
        <p className="text-center mt-6 text-xs text-gray-400 font-medium">
          同步将推送到: <code className="bg-gray-100 px-2 py-0.5 rounded text-indigo-500">{sshConfig.remoteRoot}</code>
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
