
import React, { useState, useEffect, useRef } from 'react';
import { SyncItem, GlobalSettings, SSHConfig, SyncStatus, SyncStats, HistoryEntry } from '../types';

interface SyncExecutionProps {
  items: SyncItem[];
  settings: GlobalSettings;
  sshConfig: SSHConfig;
  onClose: (entry?: HistoryEntry) => void;
}

const SyncExecution: React.FC<SyncExecutionProps> = ({ items, settings, sshConfig, onClose }) => {
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.PREPARING);
  const [currentFile, setCurrentFile] = useState('');
  const [stats, setStats] = useState<SyncStats>({ new: 0, updated: 0, skipped: 0, failed: 0, total: 100, current: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: any;
    const startSync = async () => {
      addLog(`[信息] 正在初始化 SSH 连接至 ${sshConfig.host}...`);
      await wait(1000);
      
      addLog(`[信息] 正在使用密钥 ${sshConfig.keyPath} 验证身份: ${sshConfig.user}...`);
      await wait(800);
      
      addLog(`[信息] 远程根目录已确认为 ${sshConfig.remoteRoot}`);
      setStatus(SyncStatus.SYNCING);
      
      const enabledItems = items.filter(i => i.enabled);
      const totalFiles = enabledItems.length * 42 + (settings.syncCodex ? 10 : 0);
      setStats(prev => ({ ...prev, total: totalFiles }));

      for (const item of enabledItems) {
        addLog(`[同步] 正在处理项目: ${item.name}`);
        for (let i = 0; i < 42; i++) {
          if (status === SyncStatus.CANCELLED) return;
          setCurrentFile(`${item.name}/src/components/Module_${i}.tsx`);
          setStats(prev => ({ 
            ...prev, 
            current: prev.current + 1,
            new: Math.random() > 0.8 ? prev.new + 1 : prev.new,
            updated: Math.random() > 0.5 ? prev.updated + 1 : prev.updated,
            skipped: Math.random() < 0.2 ? prev.skipped + 1 : prev.skipped
          }));
          await wait(50);
        }
      }

      if (settings.syncCodex) {
        addLog(`[同步] 正在处理 Codex 配置文件...`);
        setCurrentFile(`.codex/config.toml`);
        setStats(prev => ({ ...prev, current: prev.current + 10, updated: prev.updated + 10 }));
        await wait(1000);
      }

      addLog(`[成功] 工作区同步已完成。`);
      setStatus(SyncStatus.COMPLETED);
    };

    startSync();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleFinish = () => {
    const entry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: `${Math.round(stats.current * 0.1)}秒`,
      status: status,
      summary: { added: stats.new, updated: stats.updated, errors: stats.failed },
      log: logs
    };
    onClose(entry);
  };

  const progress = Math.min(100, Math.round((stats.current / stats.total) * 100));

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col h-[600px] overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg ${
              status === SyncStatus.COMPLETED ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'
            }`}>
              <i className={`fas ${status === SyncStatus.COMPLETED ? 'fa-check' : 'fa-sync-alt fa-spin'}`}></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xl">
                {status === SyncStatus.COMPLETED ? '同步完成' : '正在同步工作区'}
              </h3>
              <p className="text-slate-500 text-sm">
                {status === SyncStatus.COMPLETED ? '远程环境已是最新状态。' : `正在上传文件至 ${sshConfig.host}...`}
              </p>
            </div>
          </div>
          {status !== SyncStatus.COMPLETED && (
            <button 
              onClick={() => { setStatus(SyncStatus.CANCELLED); onClose(); }}
              className="text-slate-400 hover:text-red-500 font-bold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              取消同步
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">当前进度</span>
                <span className="text-2xl font-black text-slate-800">{progress}%</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase">当前任务</span>
                <p className="text-sm font-medium text-indigo-600 truncate max-w-[300px]">{currentFile || '就绪'}</p>
              </div>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <StatItem label="新增文件" value={stats.new} color="text-green-600" />
              <StatItem label="更新文件" value={stats.updated} color="text-blue-600" />
              <StatItem label="跳过" value={stats.skipped} color="text-slate-400" />
              <StatItem label="错误" value={stats.failed} color="text-red-600" />
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 bg-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-300 overflow-y-auto shadow-inner border border-slate-800">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span> {log}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Footer */}
        {status === SyncStatus.COMPLETED && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end animate-in fade-in slide-in-from-bottom-2">
            <button 
              onClick={handleFinish}
              className="bg-slate-900 hover:bg-black text-white font-bold py-3 px-12 rounded-xl transition-all shadow-lg active:scale-95"
            >
              保存结果并关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm text-center">
    <div className={`text-lg font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-slate-400 uppercase font-black">{label}</div>
  </div>
);

export default SyncExecution;
