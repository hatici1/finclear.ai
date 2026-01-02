import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Eye, EyeOff, Save, Server, Download, Upload, Trash2, Database, Cpu, Globe, Check } from 'lucide-react';
import { loadSettings, saveSettings, AppSettings, exportAllData, importAllData, clearAllData } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'api' | 'models' | 'data' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('api');
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      // Load legacy API key
      const legacyKey = localStorage.getItem('finclear_api_key');
      if (legacyKey && !settings.apiKey) {
        setSettings(prev => ({ ...prev, apiKey: legacyKey }));
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSettings(settings);
    // Also save to legacy location for backward compatibility
    if (settings.apiKey) {
      localStorage.setItem('finclear_api_key', settings.apiKey);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finclear-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importAllData(data);
        setSettings(loadSettings());
        alert('Data imported successfully!');
      } catch (err) {
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all saved data? This cannot be undone.')) {
      clearAllData();
      setSettings(loadSettings());
      alert('All data cleared.');
    }
  };

  const testOllamaConnection = async () => {
    if (!settings.localLlmUrl) return;
    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const response = await fetch(`${settings.localLlmUrl}/api/tags`, {
        method: 'GET',
      });
      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
    setTestingConnection(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Key size={20} className="text-brand-500" />
            <h2 className="font-bold text-lg">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-4 sm:px-6 overflow-x-auto">
          {[
            { id: 'api', label: 'API Keys', icon: Key },
            { id: 'models', label: 'AI Models', icon: Cpu },
            { id: 'data', label: 'Data', icon: Database },
            { id: 'about', label: 'About', icon: Globe },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={16} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* API Keys Tab */}
          {activeTab === 'api' && (
            <>
              {/* Google Gemini */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Google Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={settings.apiKey || ''}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono"
                  />
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <button
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  For auto-categorization and chat.{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    Get free key
                  </a>
                </p>
              </div>

              {/* OpenAI */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">OpenAI API Key (Optional)</label>
                <div className="relative">
                  <input
                    type={showOpenAIKey ? "text" : "password"}
                    value={settings.openaiApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono"
                  />
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <button
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOpenAIKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Alternative to Gemini for GPT-4 powered analysis.
                </p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3">
                <ShieldCheck size={24} className="text-emerald-600 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-800">Your Privacy First</p>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    API keys are stored locally in your browser. They never touch our servers.
                    Communication happens directly between your browser and the AI provider.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* AI Models Tab */}
          {activeTab === 'models' && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Preferred AI Model</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'gemini', label: 'Google Gemini', desc: 'Free tier available' },
                      { id: 'openai', label: 'OpenAI GPT-4', desc: 'Most capable' },
                      { id: 'ollama', label: 'Ollama (Local)', desc: 'Privacy-first' },
                      { id: 'local', label: 'No AI', desc: 'Rules-based only' },
                    ].map(model => (
                      <button
                        key={model.id}
                        onClick={() => setSettings({ ...settings, preferredModel: model.id as any })}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          settings.preferredModel === model.id
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-sm font-medium text-slate-900">{model.label}</span>
                        <span className="block text-xs text-slate-500">{model.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ollama Settings */}
                {settings.preferredModel === 'ollama' && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Server size={16} />
                      <span className="text-sm font-medium">Local Ollama Configuration</span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-slate-600">Ollama Server URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.localLlmUrl || ''}
                          onChange={(e) => setSettings({ ...settings, localLlmUrl: e.target.value })}
                          placeholder="http://localhost:11434"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                        <button
                          onClick={testOllamaConnection}
                          disabled={testingConnection || !settings.localLlmUrl}
                          className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300 disabled:opacity-50"
                        >
                          {testingConnection ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                      {connectionStatus === 'success' && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <Check size={12} /> Connected successfully
                        </p>
                      )}
                      {connectionStatus === 'error' && (
                        <p className="text-xs text-rose-600">
                          Connection failed. Make sure Ollama is running.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-slate-600">Model Name</label>
                      <input
                        type="text"
                        value={settings.ollamaModel || ''}
                        onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                        placeholder="llama3.2, mistral, phi3, etc."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      <p className="text-xs text-slate-500">
                        Run <code className="bg-slate-200 px-1 rounded">ollama list</code> to see available models
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p><strong>Setup:</strong></p>
                      <ol className="list-decimal ml-4 space-y-0.5">
                        <li>Install Ollama from <a href="https://ollama.ai" target="_blank" className="text-brand-600 hover:underline">ollama.ai</a></li>
                        <li>Run <code className="bg-slate-200 px-1 rounded">ollama pull llama3.2</code></li>
                        <li>Start server: <code className="bg-slate-200 px-1 rounded">ollama serve</code></li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <h4 className="text-sm font-medium text-slate-700">Backup & Restore</h4>
                <p className="text-xs text-slate-500">
                  Export your category edits, planned expenses, and settings to a file.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
                  >
                    <Download size={16} />
                    Export Data
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 cursor-pointer">
                    <Upload size={16} />
                    Import Data
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                <h4 className="text-sm font-medium text-rose-700">Danger Zone</h4>
                <p className="text-xs text-rose-600">
                  Clear all saved data including categories, notes, and settings. This cannot be undone.
                </p>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700"
                >
                  <Trash2 size={16} />
                  Clear All Data
                </button>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="text-sm font-medium text-blue-700 mb-2">Bank Connection (Coming Soon)</h4>
                <p className="text-xs text-blue-600">
                  We're working on direct bank connections via Open Banking APIs (PSD2).
                  This will allow automatic import of transactions from supported banks.
                </p>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-2xl mb-3">
                  <span className="text-3xl">💰</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">FinClear AI</h3>
                <p className="text-sm text-slate-500">Version 1.0.0</p>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p><strong>Features:</strong></p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>100% local processing - your data stays on your device</li>
                  <li>AI-powered categorization (optional)</li>
                  <li>Smart spending insights and analysis</li>
                  <li>Planned expenses tracking</li>
                  <li>Multi-currency support (coming soon)</li>
                  <li>Works offline after first load</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500">
                  <strong>Privacy:</strong> FinClear processes everything locally. Your bank data
                  is never uploaded to any server. AI features use your own API keys and communicate
                  directly with the provider.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm flex items-center gap-2"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};
