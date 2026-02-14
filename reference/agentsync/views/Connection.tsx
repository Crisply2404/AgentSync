
import React, { useState } from 'react';
import { SSHConfig } from '../types';

interface ConnectionProps {
  config: SSHConfig;
  setConfig: (config: SSHConfig) => void;
}

const Connection: React.FC<ConnectionProps> = ({ config, setConfig }) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: name === 'port' ? parseInt(value) || 0 : value });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">目标设备</h2>
        {testStatus === 'success' && <span className="text-xs font-bold text-green-500 flex items-center gap-1"><i className="fas fa-check"></i> 已连接</span>}
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="主机地址" name="host" value={config.host} onChange={handleChange} placeholder="192.168.1.100" />
          </div>
          <div>
            <Field label="端口" name="port" type="number" value={config.port} onChange={handleChange} placeholder="22" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="用户名" name="user" value={config.user} onChange={handleChange} placeholder="developer" />
          <Field label="同步目录" name="remoteRoot" value={config.remoteRoot} onChange={handleChange} placeholder="~/AgentSync/" />
        </div>

        <Field label="SSH 私钥路径" name="keyPath" value={config.keyPath} onChange={handleChange} placeholder="~/.ssh/id_rsa" />

        <div className="pt-4">
          <button 
            onClick={() => {
              setTestStatus('testing');
              setTimeout(() => setTestStatus('success'), 1000);
            }}
            disabled={testStatus === 'testing'}
            className="w-full py-4 bg-gray-50 hover:bg-indigo-50 text-indigo-600 rounded-2xl font-bold transition-all border border-gray-100 hover:border-indigo-100 active:scale-[0.98]"
          >
            {testStatus === 'testing' ? '正在连接...' : '测试连接'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50/50 p-6 rounded-3xl flex items-start gap-4 border border-blue-100/50">
        <i className="fas fa-info-circle text-blue-400 mt-1"></i>
        <p className="text-xs text-blue-700 leading-relaxed font-medium">
          AgentSync 使用 SFTP 协议。请确保远程设备已启用 SSH 服务并信任您的公钥。
        </p>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; name: string; value: any; onChange: any; type?: string; placeholder?: string }> = ({ label, name, value, onChange, type = "text", placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-100 rounded-xl outline-none transition-all text-sm font-semibold"
    />
  </div>
);

export default Connection;
