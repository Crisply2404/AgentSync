
import React, { useState } from 'react';
import { HistoryEntry, SyncStatus } from '../types';

interface HistoryProps {
  history: HistoryEntry[];
}

const History: React.FC<HistoryProps> = ({ history }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = history.filter(h => 
    h.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    new Date(h.timestamp).toLocaleString().includes(searchTerm)
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">运行历史</h2>
          <p className="text-slate-500">所有同步任务的审计轨迹。</p>
        </div>
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            type="text" 
            placeholder="搜索记录..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-64 text-sm"
          />
        </div>
      </header>

      <div className="space-y-4">
        {filteredHistory.map((entry) => (
          <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group">
            <div 
              className="p-5 flex items-center gap-6 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${
                entry.status === SyncStatus.COMPLETED ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                <i className={`fas ${entry.status === SyncStatus.COMPLETED ? 'fa-check' : 'fa-times'}`}></i>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-slate-800">{new Date(entry.timestamp).toLocaleString('zh-CN')}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    entry.status === SyncStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {entry.status === SyncStatus.COMPLETED ? '成功' : '失败'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  新增 {entry.summary.added} • 更新 {entry.summary.updated} • 耗时 {entry.duration}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="复制日志">
                  <i className="fas fa-copy"></i>
                </button>
                <i className={`fas fa-chevron-down text-slate-300 transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`}></i>
              </div>
            </div>

            {expandedId === entry.id && (
              <div className="border-t border-slate-100 bg-slate-50 p-6 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-900 text-slate-300 rounded-xl p-4 font-mono text-xs max-h-60 overflow-y-auto shadow-inner">
                  {entry.log.map((line, i) => (
                    <div key={i} className="mb-1 leading-relaxed">{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredHistory.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <i className="fas fa-search text-4xl mb-4 opacity-10"></i>
            <p className="text-lg font-medium">未找到符合条件的运行记录。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
