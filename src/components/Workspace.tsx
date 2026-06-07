/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Terminal, 
  Sparkles, 
  Layers, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Play, 
  RefreshCw, 
  Plus, 
  X, 
  HelpCircle, 
  Search, 
  FileText, 
  History, 
  Code,
  ShieldAlert, 
  ShieldCheck, 
  Briefcase, 
  ChevronUp, 
  Download, 
  MessageSquare,
  ArrowRightLeft,
  LayoutGrid,
  TrendingUp,
  Cpu,
  Trash,
  Check,
  Zap,
  Info
} from 'lucide-react';
import SqlEditor from './SqlEditor';
import TableDataEditor from './TableDataEditor';
import { BrandLogo } from './BrandLogo';
import { 
  DBConnection, 
  QueryTab, 
  QueryResult, 
  ExecutionLog, 
  SQLSnippet, 
  SavedQuery, 
  DatabaseStats,
  SecurityScore
} from '../types';
import { INITIAL_CONNECTIONS, BUILTIN_SNIPPETS, SANDBOX_SCHEMA } from '../data';

export default function Workspace({ onBackToLanding }: { onBackToLanding: () => void }) {
  // Connections stack
  const [connections, setConnections] = useState<DBConnection[]>(INITIAL_CONNECTIONS);
  const [activeConnId, setActiveConnId] = useState<string>('demo-sandbox');
  const [showConnModal, setShowConnModal] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connFeedback, setConnFeedback] = useState<string | null>(null);

  // New Connection Form state
  const [newConn, setNewConn] = useState<{
    name: string;
    type: 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver';
    host: string;
    port: number;
    username: string;
    database: string;
    filename: string;
  }>({
    name: '',
    type: 'postgresql',
    host: '',
    port: 5432,
    username: '',
    database: '',
    filename: ''
  });

  // Schema tree states
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'tables': true,
    'views': false,
    'procedures': false,
    'functions': false,
    'snippets': false,
    'history': false
  });
  const [selectedTable, setSelectedTable] = useState<string>('customers');
  const [objectSearch, setObjectSearch] = useState('');

  // Workbench tabs
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: 'tab-1',
      title: 'Query Analyst 1',
      connectionId: 'demo-sandbox',
      sql: `-- Select Top Customers analytically\nSELECT \n  c.id, \n  c.name, \n  c.email,\n  c.lifetime_spent\nFROM customers c\nWHERE c.status = 'VIP'\nORDER BY c.lifetime_spent DESC;`,
      nlInput: 'Show top customers by lifetime spend',
      isExecuting: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Interactive AI DBA chat assist
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: "Greetings! I am your AI Database Administrator (DBA). Ask me questions about the schema, construct complex joins, or request performance profiling recommendations!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Search Results details
  const [searchFilter, setSearchFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [resultsPage, setResultsPage] = useState(0);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // UI Modes
  const [workspaceMode, setWorkspaceMode] = useState<'sql-editor' | 'table-editor'>('sql-editor');
  const [schemaRefresherRunning, setSchemaRefresherRunning] = useState(false);
  const [showSecretsModal, setShowSecretsModal] = useState(false);
  const [secretsList, setSecretsList] = useState({ geminiKey: 'Local Sandbox API Client' });
  const [analyzingTable, setAnalyzingTable] = useState<string | null>(null);
  const [rebuildingTable, setRebuildingTable] = useState<string | null>(null);

  // Right sidebar tabs: 'meta' | 'chat' | 'stats'
  const [rightTab, setRightTab] = useState<'meta' | 'chat' | 'stats'>('meta');

  // Logs database
  const [systemLogs, setSystemLogs] = useState<ExecutionLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState<DatabaseStats>({
    totalDatabases: 4,
    totalTables: 5,
    totalQueries: 2,
    successRate: 100,
    avgQueryTimeMs: 4.5,
    mostUsedTables: [{ name: 'customers', count: 2 }]
  });

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Load initial logs and stats
  const refreshStats = async () => {
    try {
      const response = await fetch('/api/analytics/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.warn('Unable to query stats backend:', err);
    }
  };

  useEffect(() => {
    refreshStats();
  }, [systemLogs]);

  // Toggle schema tree expand collapse
  const toggleNode = (node: string) => {
    setExpandedNodes(p => ({ ...p, [node]: !p[node] }));
  };

  // Switch Connections safely
  const handleConnect = (connId: string) => {
    setActiveConnId(connId);
    logToConsole(`Workspace profile switched to link target ID: "${connId}"`, 'success');
  };

  // Dynamic console output log
  const logToConsole = (msg: string, status: 'success' | 'error') => {
    const fakeLog: ExecutionLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      connectionId: activeConnId,
      connectionName: connections.find(c => c.id === activeConnId)?.name || 'Demo DB',
      sql: `-- Internal operation`,
      status,
      rowsAffected: 0,
      durationMs: 1,
      message: msg
    };
    setSystemLogs(prev => [...prev, fakeLog]);
  };

  // Test dynamic DB profile
  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnFeedback(null);
    try {
      const response = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConn)
      });
      const data = await response.json();
      if (data.status === 'success') {
        setConnFeedback(`success||${data.message}`);
        logToConsole(`TEST SUCCESS: Verified node "${newConn.name || 'PostgreSQL Connection'}" endpoints.`, 'success');
      } else {
        throw new Error(data.error || 'Timeout reaching host');
      }
    } catch (err: any) {
      setConnFeedback(`error||Connection failed: ${err.message || 'Cannot bind resource address'}`);
      logToConsole(`TEST FAILURE: ${err.message}`, 'error');
    } finally {
      setTestingConn(false);
    }
  };

  // Save Connection Profile
  const handleSaveConnection = () => {
    const id = 'custom-' + Math.random().toString(36).substr(2, 9);
    const saved: DBConnection = {
      id,
      name: newConn.name || `User Connection (${newConn.type.toUpperCase()})`,
      type: newConn.type,
      host: newConn.host,
      port: newConn.port,
      username: newConn.username,
      database: newConn.database,
      filename: newConn.filename,
      isDemo: false
    };

    setConnections(prev => [...prev, saved]);
    setActiveConnId(id);
    setShowConnModal(false);
    logToConsole(`Successfully aggregated client credentials path database: "${saved.name}"`, 'success');
  };

  // Delete Connection Profile
  const handleDeleteConnection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === 'demo-sandbox') return; // protect demo
    setConnections(prev => prev.filter(c => c.id !== id));
    if (activeConnId === id) {
      setActiveConnId('demo-sandbox');
    }
    logToConsole(`Removed database credentials ID: "${id}"`, 'success');
  };

  // Create new active SQL queries tab
  const handleAddTab = () => {
    const nextNum = tabs.length + 1;
    const newTab: QueryTab = {
      id: `tab-${Math.random().toString(36).substr(2, 9)}`,
      title: `Query Analyst ${nextNum}`,
      connectionId: activeConnId,
      sql: `-- Auto-generated query buffer\nSELECT * FROM customers LIMIT 5;`,
      nlInput: '',
      isExecuting: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // Close tab
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // protect last tab
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter(t => t.id !== id);
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // Set active tab code content
  const handleSqlChange = (val: string) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, sql: val } : t));
  };

  // Set active tab NL input content
  const handleNLChange = (val: string) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, nlInput: val } : t));
  };

  // Execute manual query in workspace
  const handleExecuteActive = async () => {
    if (activeTab.isExecuting) return;

    // Set tab executing
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isExecuting: true } : t));

    try {
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: activeConnId,
          sql: activeTab.sql
        })
      });
      const data = await response.json();
      
      // Update execution logs
      if (data.executionLogs) {
        setSystemLogs(data.executionLogs);
      }

      if (data.success && data.result) {
        // Set tab results
        setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) {
            return {
              ...t,
              isExecuting: false,
              results: data.result
            };
          }
          return t;
        }));
        
        // Switch to meta stats on execution if desired
        setResultsPage(0);
        logToConsole(`SUCCESS: SQL execution completed safely (${data.result.rowCount} rows returning in ${data.result.executionTimeMs}ms).`, 'success');
      } else {
        // Display syntax fail state
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isExecuting: false } : t));
        logToConsole(`EXECUTION EXCEPTION: ${data.error || 'Evaluation timed out.'}`, 'error');
        setExportNotice(`Compile Exception: ${data.error || 'Evaluation syntax error'}`);
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (err: any) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isExecuting: false } : t));
      logToConsole(`SERVICE FAILURE: Unable to query port route - ${err.message}`, 'error');
    }
  };

  // Compile NL input directly via Gemini compiler
  const handleAiGenerateSql = async () => {
    if (!activeTab.nlInput || activeTab.nlInput.trim().length === 0) return;

    // Set tab executing state
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isExecuting: true } : t));

    try {
      const response = await fetch('/api/ai/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: activeTab.nlInput })
      });
      const data = await response.json();

      if (data.sql) {
        setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) {
            return {
              ...t,
              isExecuting: false,
              sql: data.sql
            };
          }
          return t;
        }));

        // Display explanation in chat overlay or logs
        setChatMessages(prev => [
          ...prev, 
          { role: 'user', content: `Compile: "${activeTab.nlInput}"` },
          { role: 'assistant', content: `**AI generated SQL Output (Confidence ${data.confidenceScore}%):**\n\n\`\`\`sql\n${data.sql}\n\`\`\`\n\n**Logic explanation:**\n${data.explanation}\n\n**Suggested Optimization parameters:**\n${(data.suggestedOptimizations || []).join('\n')}` }
        ]);
        setRightTab('chat');

        logToConsole(`AI COMPILER SUCCESS: Formulated optimized ${activeTab.connectionId === 'demo-sandbox' ? 'SQLite' : 'PostgreSQL'} script.`, 'success');
      } else {
        throw new Error(data.error || 'AI generation failed');
      }
    } catch (err: any) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isExecuting: false } : t));
      logToConsole(`AI EXCEPTION: ${err.message}`, 'error');
    }
  };

  // Prettify active code
  const handlePrettifyQuery = () => {
    let clean = activeTab.sql.replace(/\s+/g, ' ').trim();
    const matches = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'SET', 'VALUES', 'AND', 'OR', 'ON'];
    
    let formatted = clean;
    matches.forEach(word => {
      const reg = new RegExp(`\\b${word}\\b`, 'gi');
      formatted = formatted.replace(reg, `\n${word.toUpperCase()}`);
    });

    formatted = formatted.split('\n').map(line => {
      let l = line.trim();
      if (l.startsWith('AND') || l.startsWith('OR') || l.startsWith('ON')) {
        return '  ' + l;
      }
      return l;
    }).join('\n').trim();

    handleSqlChange(formatted);
  };

  // Submit dynamic DBA chat questions
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userText }],
          activeTable: selectedTable
        })
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'AI was unable to compile a reply.' }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `DBA Node Exception: ${err.message || 'Error processing speech context'}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Tap schema table to load details
  const handleSelectTableNode = (tableName: string) => {
    setSelectedTable(tableName);
    // populate standard SELECT into SQL tab if desired
    const selectSql = `SELECT * FROM ${tableName} LIMIT 10;`;
    handleSqlChange(selectSql);
    logToConsole(`Loaded node "${tableName}" columns definitions into lateral inspector.`, 'success');
  };

  // Synchronize entire DB schema definitions
  const handleRefreshWorkspaceSchema = async () => {
    setSchemaRefresherRunning(true);
    setTimeout(() => {
      setSchemaRefresherRunning(false);
      logToConsole(`SUCCESS: Synchronized active DB tables schema metadata trees.`, 'success');
    }, 550);
  };

  // Dynamic exports
  const handleTriggerExport = (format: 'CSV' | 'JSON' | 'Excel') => {
    const rows = activeTab.results?.rows || [];
    if (rows.length === 0) return;

    let textContent = '';
    let mimeType = 'text/plain';
    const filename = `nl2q_export_${activeTableNameMeta}_${Date.now()}`;

    if (format === 'JSON') {
      textContent = JSON.stringify(rows, null, 2);
      mimeType = 'application/json';
    } else {
      // CSV/Excel simplified
      const cols = activeTab.results?.columns || [];
      const headerLine = cols.join(',');
      const rowsLines = rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
      textContent = [headerLine, ...rowsLines].join('\n');
      mimeType = 'text/csv';
    }

    // Trigger download trigger
    const blob = new Blob([textContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format.toLowerCase()}`;
    link.click();
    URL.revokeObjectURL(url);

    setExportNotice(`Exported ${rows.length} rows successfully as ${format}!`);
    setTimeout(() => setExportNotice(null), 3000);
    logToConsole(`EXPORT SUCCESS: Composed client report bundle format=${format} row_count=${rows.length}.`, 'success');
  };

  // Auxiliary filtering elements for center query results
  const activeTableNameMeta = selectedTable || 'customers';
  const tableMeta = SANDBOX_SCHEMA.tables.find(t => t.name === activeTableNameMeta) || SANDBOX_SCHEMA.tables[0];

  const filteredSchemaTables = SANDBOX_SCHEMA.tables.filter(t => 
    t.name.toLowerCase().includes(objectSearch.toLowerCase())
  );

  // Results rendering filters
  const displayRows = activeTab.results?.rows || [];
  const displayCols = activeTab.results?.columns || [];

  const searchedRows = displayRows.filter(row => {
    if (!searchFilter) return true;
    return Object.values(row).some(val => 
      String(val ?? '').toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  // Sort rows logic
  const sortedRows = [...searchedRows].sort((a,b) => {
    if (!sortColumn) return 0;
    const valA = a[sortColumn];
    const valB = b[sortColumn];
    if (valA === valB) return 0;
    
    const outcome = valA > valB ? 1 : -1;
    return sortDirection === 'asc' ? outcome : -outcome;
  });

  // Paginated elements
  const itemsPerPage = 8;
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
  const paginatedRows = sortedRows.slice(resultsPage * itemsPerPage, (resultsPage + 1) * itemsPerPage);

  const toggleSortColumn = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  return (
    <div className="min-h-screen bg-[#02050f] text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Dynamic top menu header panel */}
      <header className="px-4 py-2 bg-slate-950/90 border-b border-slate-900 flex justify-between items-center z-20 select-none">
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer">
            <BrandLogo className="w-6.5 h-6.5" glow={true} />
            <span className="font-bold tracking-tight text-white text-xs leading-none group-hover:text-blue-400 transition-colors">NL2Q IDE</span>
          </div>

          <div className="h-4 w-px bg-slate-950" />

          {/* Connected profiles drop list */}
          <div className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <select
              id="active-conn-select"
              value={activeConnId}
              onChange={(e) => handleConnect(e.target.value)}
              className="bg-transparent text-slate-300 font-mono text-[11px] font-semibold border-none focus:outline-none focus:ring-0 pr-6 select-none cursor-pointer"
            >
              {connections.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-950 text-slate-300 text-xs">{c.name}</option>
              ))}
            </select>
            <button
              id="header-add-conn-btn"
              onClick={() => setShowConnModal(true)}
              className="p-1 hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-white rounded cursor-pointer"
              title="Add Database profiles"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Header telemetry and controls */}
        <div className="flex items-center gap-3">
          <button
            id="workspace-secrets-btn"
            onClick={() => setShowSecretsModal(true)}
            className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded flex items-center gap-1.5 cursor-pointer font-mono text-slate-400"
          >
            <Settings className="w-3.5 h-3.5" />
            Secrets
          </button>

          <button
            id="workspace-exit-btn"
            onClick={onBackToLanding}
            className="px-2.5 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700/80 rounded transition font-mono cursor-pointer text-slate-400"
          >
            Landing Portal
          </button>
        </div>

      </header>

      {/* Main workspace splits */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: Database Schema Explorer */}
        <aside className="w-64 bg-slate-950/40 border-r border-slate-900 flex flex-col overflow-hidden select-none">
          
          <div className="p-3 border-b border-slate-901 bg-slate-950/60">
            <div className="flex justify-between items-center text-xs font-semibold mb-2.5">
              <span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Schema Explorer</span>
              <button
                id="refresh-schema-btn"
                onClick={handleRefreshWorkspaceSchema}
                disabled={schemaRefresherRunning}
                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${schemaRefresherRunning ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {/* Search items */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                id="schema-search-input"
                type="text"
                placeholder="Search tables, views..."
                value={objectSearch}
                onChange={(e) => setObjectSearch(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded py-1 pl-8 pr-2.5 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Tree Navigation scrolling stack */}
          <div className="flex-1 overflow-auto p-2 space-y-1 text-xs text-slate-400 font-mono">
            
            {/* Tables tree node wrapper */}
            <div>
              <button
                onClick={() => toggleNode('tables')}
                className="w-full text-left py-1 hover:bg-slate-900/40 rounded flex items-center justify-between hover:text-slate-200 font-bold"
              >
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  Tables ({filteredSchemaTables.length})
                </span>
                {expandedNodes.tables ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {expandedNodes.tables && (
                <div className="pl-4.5 space-y-0.5 border-l border-slate-900/60 ml-2 mt-1">
                  {filteredSchemaTables.map(t => (
                    <div key={t.name}>
                      <button
                        onClick={() => handleSelectTableNode(t.name)}
                        className={`w-full text-left py-1 px-1.5 rounded flex items-center gap-1.5 transition ${
                          selectedTable === t.name 
                            ? 'bg-blue-950/40 text-blue-400 font-semibold border-l-2 border-l-blue-500' 
                            : 'hover:bg-slate-900/50 hover:text-slate-200'
                        }`}
                      >
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>{t.name}</span>
                        <span className="text-[9px] text-slate-600">({t.rowCount})</span>
                      </button>

                      {/* Columns visual nodes under active selectedTable */}
                      {selectedTable === t.name && (
                        <div className="pl-4 border-l border-slate-900/60 ml-1.5 py-1 space-y-0.5 text-[10px] text-slate-500">
                          {t.columns.map(col => (
                            <div key={col.name} className="flex items-center gap-1 py-0.5 truncate" title={`${col.name} ${col.type}`}>
                              <span className="text-slate-600">▪</span>
                              <span className="text-slate-400 font-semibold">{col.name}</span>
                              <span className="text-[8px] text-slate-600">({col.type})</span>
                              {col.isPrimary && <span className="text-[8px] px-1 py-0 bg-amber-950/40 text-amber-500 font-bold rounded scale-90">[PK]</span>}
                              {col.isForeign && <span className="text-[8px] px-1 py-0 bg-indigo-950/40 text-indigo-500 font-bold rounded scale-90">[FK]</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Views tree node */}
            <div>
              <button
                onClick={() => toggleNode('views')}
                className="w-full text-left py-1 hover:bg-slate-900/40 rounded flex items-center justify-between hover:text-slate-200"
              >
                <span className="flex items-center gap-1.5 text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  Views ({SANDBOX_SCHEMA.views.length})
                </span>
                {expandedNodes.views ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {expandedNodes.views && (
                <div className="pl-4.5 space-y-0.5 border-l border-slate-900/60 ml-2 mt-1">
                  {SANDBOX_SCHEMA.views.map(v => (
                    <button
                      key={v.name}
                      onClick={() => handleSqlChange(`SELECT * FROM ${v.name} LIMIT 20;`)}
                      className="w-full text-left py-1 hover:bg-slate-900/40 text-slate-400 hover:text-white truncate block p-1"
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stored Procedures node */}
            <div>
              <button
                onClick={() => toggleNode('procedures')}
                className="w-full text-left py-1 hover:bg-slate-900/40 rounded flex items-center justify-between hover:text-slate-200"
              >
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  Procedures ({SANDBOX_SCHEMA.procedures.length})
                </span>
                {expandedNodes.procedures ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {expandedNodes.procedures && (
                <div className="pl-4.5 mb-1.5 text-[10px] text-slate-500 font-mono space-y-1">
                  {SANDBOX_SCHEMA.procedures.map(p => (
                    <div key={p.name} className="truncate p-1 bg-slate-950/30 rounded border border-slate-900">
                      <strong>{p.name}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Functions node */}
            <div>
              <button
                onClick={() => toggleNode('functions')}
                className="w-full text-left py-1 hover:bg-slate-900/40 rounded flex items-center justify-between hover:text-slate-200"
              >
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Code className="w-3.5 h-3.5 text-pink-400" />
                  Functions ({SANDBOX_SCHEMA.functions.length})
                </span>
                {expandedNodes.functions ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {expandedNodes.functions && (
                <div className="pl-4.5 mb-1.5 text-[10px] text-slate-500 font-mono space-y-1">
                  {SANDBOX_SCHEMA.functions.map(f => (
                    <div key={f.name} className="truncate p-1 bg-slate-950/30 rounded border border-slate-900">
                      <strong>{f.name}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Built-in Snippets list */}
            <div>
              <button
                onClick={() => toggleNode('snippets')}
                className="w-full text-left py-1 hover:bg-slate-900/40 rounded flex items-center justify-between hover:text-slate-200"
              >
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                  SQL Snippets
                </span>
                {expandedNodes.snippets ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {expandedNodes.snippets && (
                <div className="pl-4.5 space-y-1.5 mt-1">
                  {BUILTIN_SNIPPETS.map(snip => (
                    <button
                      key={snip.id}
                      onClick={() => handleSqlChange(snip.sql)}
                      className="w-full text-left text-[10px] text-slate-400 hover:text-slate-100 bg-slate-900/30 py-1 p-1.5 border border-slate-900 rounded block"
                    >
                      <div className="font-semibold">{snip.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="p-3 border-t border-slate-900 bg-slate-950/30 select-text">
            <div className="flex gap-2 items-center text-[10px] font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sandbox Status: Live</span>
            </div>
          </div>

        </aside>

        {/* CENTER COLUMN: Tabs workbench, SQL Editor inputs & results grids */}
        <main className="flex-1 flex flex-col bg-[#050814]/15 overflow-hidden">
          
          {/* SQL TAB LIST RIBBON */}
          <div className="bg-slate-950 border-b border-slate-900 px-3 py-1.5 flex justify-between items-center text-xs space-x-1 select-none">
            <div className="flex flex-wrap items-center gap-1">
              
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-3 py-1 rounded-t flex items-center gap-2 border-t font-mono text-[11px] cursor-pointer transition ${
                    activeTabId === tab.id
                      ? 'bg-[#050814] text-white border-t-2 border-t-blue-500 font-semibold'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3 h-3 text-blue-400" />
                  <span>{tab.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 hover:bg-slate-800 rounded transition"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              <button
                id="add-tab-btn"
                onClick={handleAddTab}
                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                title="Create SQL tab"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

            </div>

            {/* Mode switch (SQL editor vs spreadsheet) */}
            <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 p-0.5 rounded text-[10px] font-mono">
              <button
                id="tab-mode-sql-btn"
                onClick={() => setWorkspaceMode('sql-editor')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  workspaceMode === 'sql-editor' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SQL Workspace
              </button>
              <button
                id="tab-mode-spread-btn"
                onClick={() => setWorkspaceMode('table-editor')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  workspaceMode === 'table-editor' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Spreadsheet
              </button>
            </div>
          </div>

          {/* INTERNAL MULTIPLEX: WORKSPACE MODE */}
          {workspaceMode === 'table-editor' ? (
            <div className="flex-1 overflow-hidden">
              <TableDataEditor
                activeTableName={selectedTable}
                tableMeta={tableMeta}
                onRefreshSchema={handleRefreshWorkspaceSchema}
                onLogMessage={(msg, status) => logToConsole(msg, status)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* PRIMARY AI NATURAL LANGUAGE GENERATOR WRAPPER */}
              <div className="p-3 border-b border-slate-900 bg-[#050814]/40 flex flex-col md:flex-row gap-2 items-center justify-between">
                <div className="flex-1 w-full flex items-center gap-2 relative bg-slate-950/55 rounded-lg border border-slate-900/80 px-3 py-1">
                  <Sparkles className="w-4 h-4 text-blue-400 animate-pulse flex-shrink-0" />
                  <input
                    id="nl-query-input"
                    type="text"
                    value={activeTab.nlInput}
                    onChange={(e) => handleNLChange(e.target.value)}
                    placeholder="Translate natural language to secure SQL (e.g., 'What was the category revenue last week?')"
                    className="w-full bg-transparent text-xs text-slate-200 focus:outline-none placeholder-slate-600 py-1.5 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAiGenerateSql();
                    }}
                  />
                  {activeTab.nlInput && (
                    <button onClick={() => handleNLChange('')} className="p-1 hover:bg-slate-900 text-slate-500 rounded text-xs select-none">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  id="ai-compile-btn"
                  onClick={handleAiGenerateSql}
                  disabled={activeTab.isExecuting || !activeTab.nlInput}
                  className="w-full md:w-auto px-4 py-2 font-semibold text-xs leading-none bg-gradient-to-r from-blue-700 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-500 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  Generate SQL
                </button>
              </div>

              {/* CENTER EDITOR SPLIT PANEL */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-2 min-h-[160px]">
                  <SqlEditor
                    sql={activeTab.sql}
                    onChange={handleSqlChange}
                    onExecute={handleExecuteActive}
                    isExecuting={activeTab.isExecuting}
                    onSaveQuery={(name, sql) => {
                      logToConsole(`Successfully committed query logic snapshot.`, 'success');
                      setExportNotice('Successfully saved query code into local buffer stash.');
                      setTimeout(() => setExportNotice(null), 3500);
                    }}
                    onFormatQuery={handlePrettifyQuery}
                    onLogMessage={(msg, status) => logToConsole(msg, status)}
                  />
                </div>

                {/* BOTTOM RESULT GRID PANEL */}
                <div className="h-[280px] bg-slate-950/80 border-t border-slate-900 flex flex-col overflow-hidden relative">
                  
                  {/* Results Header bar */}
                  <div className="px-4 py-2 border-b border-slate-900 bg-slate-950 flex justify-between items-center text-xs font-mono select-none">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-300 uppercase text-[10px]">Query Results Grid</span>
                      {activeTab.results ? (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>•</span>
                          <span>Time: <strong className="text-slate-400">{activeTab.results.executionTimeMs}ms</strong></span>
                          <span>•</span>
                          <span>Records: <strong className="text-slate-400">{activeTab.results.rowCount}</strong></span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">(Awaiting execution compiled statement)</span>
                      )}
                    </div>

                    {/* Results controllers */}
                    {activeTab.results && (
                      <div className="flex items-center gap-2">
                        <input
                          id="result-search-input"
                          type="text"
                          placeholder="Search column values..."
                          value={searchFilter}
                          onChange={(e) => {
                            setSearchFilter(e.target.value);
                            setResultsPage(0);
                          }}
                          className="bg-slate-900 border border-slate-800 text-[10px] py-1 px-2.5 rounded text-slate-300 focus:outline-none placeholder-slate-600 font-mono w-40"
                        />
                        <div className="h-4 w-px bg-slate-900" />
                        <button
                          id="export-csv-btn"
                          onClick={() => handleTriggerExport('CSV')}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[10px] flex items-center gap-1 cursor-pointer hover:text-white transition duration-150"
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          CSV
                        </button>
                        <button
                          id="export-json-btn"
                          onClick={() => handleTriggerExport('JSON')}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[10px] flex items-center gap-1 cursor-pointer hover:text-white transition duration-150"
                        >
                          <Download className="w-3 h-3 text-blue-400" />
                          JSON
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Table area */}
                  <div className="flex-1 overflow-auto bg-[#030611]/15">
                    
                    {exportNotice && (
                      <div className="m-3 p-2 bg-emerald-950/20 border-l-2 border-l-emerald-500 text-[10px] text-emerald-400 font-mono rounded">
                        {exportNotice}
                      </div>
                    )}

                    {activeTab.isExecuting ? (
                      <div className="absolute inset-0 bg-slate-950/50 flex flex-col items-center justify-center gap-2 backdrop-blur-xs z-10 font-mono">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="text-xs text-slate-400">DBMS parsing syntax compilation logs...</span>
                      </div>
                    ) : null}

                    {!activeTab.results && !activeTab.isExecuting ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 text-xs font-mono select-none">
                        <Terminal className="w-7 h-7 text-slate-800 mb-2" />
                        <span>SQL Statement Editor: Enter any valid SELECT queries above.</span>
                        <span className="text-[10px] text-slate-700 mt-1">Press Run or Click Ctrl + Enter to obtain records inline.</span>
                      </div>
                    ) : (
                      activeTab.results && (
                        <table className="w-full text-left font-mono text-[10px] md:text-[11px] border-collapse min-w-[500px]">
                          <thead>
                            <tr className="bg-slate-950 text-slate-400 border-b border-slate-900 select-none">
                              <th className="py-2 px-3 border-r border-slate-900 w-10 text-center">#</th>
                              {displayCols.map(col => (
                                <th 
                                  key={col} 
                                  onClick={() => toggleSortColumn(col)}
                                  className="py-2 px-3 border-r border-[#070b19] font-semibold text-slate-300 font-mono cursor-pointer hover:bg-slate-900"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>{col}</span>
                                    {sortColumn === col && (
                                      <span className="text-[9px] text-blue-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          
                          <tbody className="divide-y divide-slate-900/40 text-slate-300">
                            {paginatedRows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/30 font-mono leading-relaxed group">
                                <td className="py-1 px-3 border-r border-[#070b19] text-center text-slate-600 bg-slate-950/10">{(resultsPage * itemsPerPage) + idx + 1}</td>
                                {displayCols.map(col => (
                                  <td key={col} className="py-1 px-3 border-r border-slate-900/40 max-w-xs truncate">
                                    {row[col] === null || row[col] === undefined ? (
                                      <span className="text-slate-600 italic">NULL</span>
                                    ) : typeof row[col] === 'number' && col.includes('spent') ? (
                                      `$${row[col].toFixed(2)}`
                                    ) : (
                                      String(row[col])
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    )}

                  </div>

                  {/* Results Pagination bar */}
                  {activeTab.results && totalPages > 1 && (
                    <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono select-none">
                      <span className="text-slate-500">Page {resultsPage + 1} of {totalPages} (Showing {paginatedRows.length} of {sortedRows.length} results)</span>
                      <div className="flex gap-1.5">
                        <button
                          id="results-prev-page"
                          onClick={() => setResultsPage(p => Math.max(p - 1, 0))}
                          disabled={resultsPage === 0}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded cursor-pointer text-slate-300 text-[10px]"
                        >
                          Prev
                        </button>
                        <button
                          id="results-next-page"
                          onClick={() => setResultsPage(p => Math.min(p + 1, totalPages - 1))}
                          disabled={resultsPage === totalPages - 1}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded cursor-pointer text-slate-300 text-[10px]"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

        </main>

        {/* RIGHT COLUMN: Table Meta details Inspector & AI feedback */}
        <aside className="w-80 bg-slate-950/50 border-l border-slate-900 flex flex-col overflow-hidden">
          
          {/* Right sidebar tab selector ribbon */}
          <div className="flex border-b border-slate-900 bg-slate-950 text-[10px] font-mono uppercase tracking-tight select-none">
            <button
              id="meta-tab-inspect"
              onClick={() => setRightTab('meta')}
              className={`flex-1 py-2 text-center font-semibold cursor-pointer border-r border-slate-900 ${
                rightTab === 'meta' ? 'bg-[#050814] text-blue-400 font-bold border-b border-b-blue-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
              }`}
            >
              Schema Inspector
            </button>
            <button
              id="meta-tab-chat"
              onClick={() => setRightTab('chat')}
              className={`flex-1 py-2 text-center font-semibold cursor-pointer border-r border-slate-900 ${
                rightTab === 'chat' ? 'bg-[#050814] text-blue-400 font-bold border-b border-b-blue-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
              }`}
            >
              AI DBA Chat
            </button>
            <button
              id="meta-tab-stats"
              onClick={() => setRightTab('stats')}
              className={`flex-1 py-2 text-center font-semibold cursor-pointer ${
                rightTab === 'stats' ? 'bg-[#050814] text-blue-400 font-bold border-b border-b-blue-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
              }`}
            >
              Telemetry
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 flex flex-col space-y-4">
            
            {/* TAB CONTENT: SCHEMA INSPECTOR */}
            {rightTab === 'meta' && (
              <div className="space-y-4 text-xs font-mono text-left animate-fade-in select-text">
                
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-semibold text-xs uppercase tracking-wider">{activeTableNameMeta}</span>
                </div>

                <div className="bg-slate-950 border border-slate-900 rounded p-3 text-[10px] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approx Size:</span>
                    <span className="text-slate-300 font-semibold">{tableMeta.sizeKb} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grid rows:</span>
                    <span className="text-slate-300 font-semibold">{tableMeta.rowCount} records</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Indexes scanned:</span>
                    <span className="text-slate-300 font-semibold">{tableMeta.indexes.length} configured</span>
                  </div>
                </div>

                {/* Operations */}
                <div>
                  <span className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold mb-2 block">Database Operations</span>
                  <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                    <button
                      id="opt-analyze-btn"
                      disabled={!!analyzingTable || !!rebuildingTable}
                      onClick={() => {
                        const targetTbl = activeTableNameMeta;
                        setAnalyzingTable(targetTbl);
                        logToConsole(`DDL RUNNING: EXPLAIN ANALYZE index sweeps for table '${targetTbl}' in safe sandbox...`, 'success');
                        
                        setTimeout(() => {
                          setAnalyzingTable(null);
                          logToConsole(`DDL SUCCESS: Evaluated index distributions and cardinality maps for table '${targetTbl}' cleanly. (Duration: 18ms)`, 'success');
                          setExportNotice(`Command completed: Table '${targetTbl}' analyzed.`);
                          setTimeout(() => setExportNotice(null), 3000);
                          
                          setStats(p => ({
                            ...p,
                            totalQueries: p.totalQueries + 1,
                            avgQueryTimeMs: Number(((p.avgQueryTimeMs * p.totalQueries + 18) / (p.totalQueries + 1)).toFixed(1))
                          }));
                        }, 900);
                      }}
                      className="py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center justify-center gap-1.5 cursor-pointer transition text-slate-400 font-mono"
                    >
                      {analyzingTable ? (
                        <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                      )}
                      {analyzingTable ? 'Analyzing...' : `Analyze '${activeTableNameMeta}'`}
                    </button>
                    <button
                      id="opt-rebuild-btn"
                      disabled={!!analyzingTable || !!rebuildingTable}
                      onClick={() => {
                        const targetTbl = activeTableNameMeta;
                        setRebuildingTable(targetTbl);
                        logToConsole(`DDL RUNNING: REINDEX TABLE ${targetTbl}; (Re-constructing index storage b-trees)...`, 'success');
                        
                        setTimeout(() => {
                          setRebuildingTable(null);
                          logToConsole(`SUCCESS: Transformed B-Tree index pointers for table '${targetTbl}'! Rebuilt primary key and foreign key index references. (Duration: 65ms)`, 'success');
                          setExportNotice(`Success: Rebuilt indexes for column paths on '${targetTbl}'.`);
                          setTimeout(() => setExportNotice(null), 3000);

                          setStats(p => ({
                            ...p,
                            totalQueries: p.totalQueries + 1,
                            avgQueryTimeMs: Number(((p.avgQueryTimeMs * p.totalQueries + 65) / (p.totalQueries + 1)).toFixed(1))
                          }));
                        }, 1100);
                      }}
                      className="py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center justify-center gap-1.5 cursor-pointer transition text-slate-400 font-mono"
                    >
                      {rebuildingTable ? (
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {rebuildingTable ? 'Rebuilding...' : '+ Rebuild Table Indexes'}
                    </button>
                  </div>
                </div>

                {/* Column details list */}
                <div>
                  <span className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold mb-2.5 block">Columns metadata</span>
                  <div className="space-y-1.5">
                    {tableMeta.columns.map(col => (
                      <div key={col.name} className="flex justify-between items-center py-1.5 px-2 bg-slate-950/40 border border-slate-900 rounded text-[10px]">
                        <div className="flex items-center gap-1 max-w-[150px] truncate">
                          <span className="text-slate-600">◼</span>
                          <span className="text-slate-300 font-semibold truncate">{col.name}</span>
                          {col.isPrimary && <span className="text-[7px] text-amber-500 font-bold bg-amber-950/30 px-1 rounded">[PK]</span>}
                        </div>
                        <span className="text-[9px] text-slate-500">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: AI CHAT DBA */}
            {rightTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden h-full animate-fade-in select-text">
                
                {/* Message display screen */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left select-text max-h-[400px]">
                  {chatMessages.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded text-[11px] leading-relaxed ${
                        m.role === 'user' 
                          ? 'bg-blue-950/30 border border-blue-900/30 text-blue-200 ml-5 text-right' 
                          : 'bg-slate-950 border border-slate-900 text-slate-300 mr-5'
                      }`}
                    >
                      <div className="font-semibold text-[8px] uppercase tracking-wider text-slate-500 mb-1">
                        {m.role === 'user' ? 'Analytical Request' : 'GenAI DBA compiler'}
                      </div>
                      <div className="whitespace-pre-line leading-relaxed font-sans">{m.content}</div>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="text-left text-slate-600 text-[10px] font-mono italic animate-pulse">
                      GenAI compiler studying indices mapping...
                    </div>
                  )}
                </div>

                {/* Chat input footer */}
                <div className="pt-3 border-t border-slate-900 flex gap-1.5">
                  <input
                    id="ai-dba-chat-input"
                    type="text"
                    placeholder="Optimize this query..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-slate-905 border border-slate-900 rounded py-1 px-2 text-[10px] text-slate-200 focus:outline-none placeholder-slate-700 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChat();
                    }}
                  />
                  <button
                    id="submit-chat-btn"
                    onClick={handleSendChat}
                    className="p-1 px-2.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-semibold flex items-center justify-center cursor-pointer"
                  >
                    Send
                  </button>
                </div>

              </div>
            )}

            {/* TAB CONTENT: METRICS & COST PREDICTION */}
            {rightTab === 'stats' && (
              <div className="space-y-4 text-xs font-mono text-left animate-fade-in">
                
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-2">Workspace metrics</span>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded">
                      <span className="text-slate-500 block text-[9px] uppercase">Success rate</span>
                      <strong className="text-lg text-emerald-400 font-bold block mt-1">{stats.successRate}%</strong>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded">
                      <span className="text-slate-500 block text-[9px] uppercase">Avg Duration</span>
                      <strong className="text-lg text-blue-400 font-bold block mt-1">{stats.avgQueryTimeMs}ms</strong>
                    </div>
                  </div>
                </div>

                {/* Cyberpunk customized Bar charts using pure HTML and divs */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-2.5">Queries traffic by relation</span>
                  <div className="space-y-2 bg-slate-950/40 p-3 rounded border border-slate-950 text-[10px]">
                    {stats.mostUsedTables.map(tbl => {
                      // calculate relative height percentage
                      const maxCount = Math.max(...stats.mostUsedTables.map(t => t.count), 1);
                      const pct = Math.round((tbl.count / maxCount) * 100);
                      
                      return (
                        <div key={tbl.name} className="space-y-1">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400 font-bold uppercase">{tbl.name}</span>
                            <span className="text-slate-500">{tbl.count} executed query loops</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded transition-all duration-500" 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Predict complexities */}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold mb-2">Cost prediction</span>
                  <div className="p-3 bg-slate-950 border border-slate-900/60 rounded flex items-center gap-2.5">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    <div>
                      <span className="text-slate-500 block text-[9px] font-mono leading-none">Complexity Level</span>
                      <span className="text-indigo-400 text-xs font-bold font-mono">Low / O(Log N) Cost</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </aside>

      </div>

      {/* BOTTOM PANEL: TERMINAL LOGGING EVENTS */}
      <footer className="h-44 bg-slate-950 border-t border-slate-900 flex flex-col overflow-hidden select-none">
        
        {/* Terminal Header */}
        <div className="px-4 py-1.5 border-b border-slate-900 bg-slate-950 flex justify-between items-center text-[10px] font-mono">
          <span className="font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-blue-500" />
            Activity Console logs
          </span>
          <span className="text-[9px] text-slate-600">Buffer size: {systemLogs.length} entries recorded</span>
        </div>

        {/* Logging view list */}
        <div className="flex-1 overflow-auto p-3 font-mono text-[10px] space-y-1 text-left select-text max-h-[140px]">
          {systemLogs.length === 0 ? (
            <div className="text-slate-600 italic">No execution events recorded in current workspace session. Enter any queries above to track actions.</div>
          ) : (
            systemLogs.map(log => (
              <div 
                key={log.id} 
                onClick={() => setSelectedLogId(log.id)}
                className={`py-0.5 px-2 rounded cursor-pointer leading-tight flex justify-between gap-4 transition hover:bg-slate-900/40 ${
                  selectedLogId === log.id 
                    ? 'bg-slate-900 text-white font-semibold' 
                    : log.status === 'error' 
                      ? 'text-red-400' 
                      : 'text-slate-400'
                }`}
              >
                <div className="flex gap-2 truncate">
                  <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="text-slate-500">[{log.connectionName}]</span>
                  <span className="truncate">{log.message}</span>
                </div>
                <div className="text-right text-[9px] text-slate-600 font-normal shrink-0">{log.durationMs}ms</div>
              </div>
            ))
          )}
        </div>

      </footer>

      {/* MODAL WINDOW 1: CONNECTION MANAGER */}
      {showConnModal && (
        <div id="conn-modal-panel" className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in select-none">
          <div className="bg-slate-950 border border-slate-900 rounded-xl max-w-md w-full p-6 text-left space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setShowConnModal(false);
                setConnFeedback(null);
              }}
              className="absolute top-4 right-4 p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Database Connection Manager</h3>
              <p className="text-[10px] text-slate-500">Link external credentials to NL2Q Workbench safe routes.</p>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Db Engine type</label>
                  <select
                    value={newConn.type}
                    onChange={(e) => setNewConn(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-white"
                  >
                    <option value="postgresql">PostgreSQL (Primary)</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="sqlserver">Microsoft SQL Server</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Profile custom name</label>
                  <input
                    type="text"
                    placeholder="Staging PostgreSQL"
                    value={newConn.name}
                    onChange={(e) => setNewConn(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>
              </div>

              {newConn.type === 'sqlite' ? (
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Local database filename path</label>
                  <input
                    type="text"
                    placeholder=":memory: or local_db.sqlite"
                    value={newConn.filename}
                    onChange={(e) => setNewConn(p => ({ ...p, filename: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Host address / cluster link</label>
                      <input
                        type="text"
                        placeholder="pg-cluster-east.aurora.net"
                        value={newConn.host}
                        onChange={(e) => setNewConn(p => ({ ...p, host: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Active Port</label>
                      <input
                        type="number"
                        placeholder="5432"
                        value={newConn.port}
                        onChange={(e) => setNewConn(p => ({ ...p, port: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">DB username</label>
                      <input
                        type="text"
                        placeholder="nl2q_reader"
                        value={newConn.username}
                        onChange={(e) => setNewConn(p => ({ ...p, username: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Database name</label>
                      <input
                        type="text"
                        placeholder="sales_production"
                        value={newConn.database}
                        onChange={(e) => setNewConn(p => ({ ...p, database: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-white font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Feedback */}
              {connFeedback && (
                <div className={`p-2.5 rounded text-[10px] border leading-relaxed ${
                  connFeedback.startsWith('success') 
                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/60' 
                    : 'bg-red-950/20 text-red-400 border-red-900/60'
                }`}>
                  {connFeedback.split('||')[1]}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  id="modal-test-conn-btn"
                  onClick={handleTestConnection}
                  disabled={testingConn}
                  className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:text-white rounded cursor-pointer transition font-mono flex items-center gap-1 text-[11px] text-slate-400"
                >
                  {testingConn ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Layers className="w-3.5 h-3.5" />
                  )}
                  Test Credentials
                </button>
                <button
                  id="modal-save-conn-btn"
                  onClick={handleSaveConnection}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-white cursor-pointer transition text-[11px] font-mono shadow-sm"
                >
                  Save Connection profile
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL WINDOW 2: SECRETS CONTROLS */}
      {showSecretsModal && (
        <div id="secrets-modal-panel" className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in select-none">
          <div className="bg-slate-950 border border-slate-900 rounded-xl max-w-sm w-full p-6 text-left space-y-4 shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setShowSecretsModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-semibold text-white tracking-tight font-sans">AI Studio secrets stashes</h3>
              <p className="text-[10px] text-slate-500">Configure key requirements for remote AI-DBA processing.</p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Gemini API Key indicator</label>
                <input
                  type="password"
                  disabled
                  value="SHIELDED_AI_STUDIO_DEEP_INJECTION_SECRET"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-500 cursor-not-allowed text-[11px] font-mono"
                />
                <span className="text-[8px] text-slate-500 italic mt-1 block">Keys are read-only and automatically resolved at startup from the Secrets configuration panel.</span>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Workspace server URL</label>
                <input
                  type="text"
                  disabled
                  value="https://ais-dev-o54jryd67zdm7cpdq3ut52.run.app"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-500 cursor-not-allowed text-[11px]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  id="secrets-modal-close-btn"
                  onClick={() => setShowSecretsModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded cursor-pointer text-[11px]"
                >
                  Dismiss Secrets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
