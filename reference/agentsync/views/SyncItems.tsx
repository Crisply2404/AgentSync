
import React, { useState } from 'react';
import { SyncItem, GlobalSettings } from '../types';

interface SyncItemsProps {
  items: SyncItem[];
  setItems: (items: SyncItem[]) => void;
  settings: GlobalSettings;
  setSettings: (settings: GlobalSettings) => void;
}

const SyncItems: React.FC<SyncItemsProps> = ({ items, setItems, settings, setSettings }) => {
  const [showMirrorDialog, setShowMirrorDialog] = useState(false);

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addItem = () => {
    const newItem: SyncItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `新项目 ${items.length + 1}`,
      path: `C:\\Projects\\NewFolder_${items.length}`,
      enabled: true
    };
    setItems([...items, newItem]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">同步内容</h2>
        <button 
          onClick={addItem}
          className="text-indigo-600 font-bold text-sm hover:underline"
        >
          + 添加文件夹
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-300'}`}>
                <i className="fas fa-folder"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold truncate ${item.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{item.name}</h4>
                <p className="text-[10px] text-gray-400 font-mono truncate">{item.path}</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={item.enabled} 
                  onChange={() => toggleItem(item.id)}
                  className="w-5 h-5 rounded-full text-indigo-600 focus:ring-0 cursor-pointer" 
                />
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              列表为空，点击上方添加项目
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">高级配置</h3>
        
        <div className="space-y-4">
          <Toggle 
            label="同步 Codex (Config & Sessions)" 
            checked={settings.syncCodex} 
            onChange={() => setSettings({...settings, syncCodex: !settings.syncCodex})} 
          />
          <Toggle 
            label="同步 Agent 技能库 (~/.agents)" 
            checked={settings.syncAgents} 
            onChange={() => setSettings({...settings, syncAgents: !settings.syncAgents})} 
          />
          <div className="pt-2 border-t border-gray-50">
             <Toggle 
              label="镜像删除 (Mirror Mode)" 
              checked={settings.mirrorDelete} 
              danger
              onChange={() => {
                if (!settings.mirrorDelete) setShowMirrorDialog(true);
                else setSettings({...settings, mirrorDelete: false});
              }} 
            />
          </div>
        </div>
      </div>

      {showMirrorDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4">开启镜像删除？</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">该操作将删除远程端中本地不存在的多余文件。确认继续？</p>
            <div className="flex gap-3">
              <button onClick={() => setShowMirrorDialog(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">取消</button>
              <button 
                onClick={() => { setSettings({...settings, mirrorDelete: true}); setShowMirrorDialog(false); }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Toggle: React.FC<{ label: string; checked: boolean; onChange: () => void; danger?: boolean }> = ({ label, checked, onChange, danger }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <span className={`text-sm font-semibold ${danger && checked ? 'text-red-600' : 'text-gray-700'}`}>{label}</span>
    <div className="relative inline-flex items-center">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className={`w-11 h-6 rounded-full peer transition-all ${danger ? 'peer-checked:bg-red-500' : 'peer-checked:bg-indigo-600'} bg-gray-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`}></div>
    </div>
  </label>
);

export default SyncItems;
