/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Sparkles, 
  Code,
  Layers, 
  Save, 
  HelpCircle,
  Copy,
  Check,
  ChevronDown
} from 'lucide-react';
import { SQLSnippet } from '../types';
import { BUILTIN_SNIPPETS } from '../data';

interface SqlEditorProps {
  sql: string;
  onChange: (val: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
  onSaveQuery?: (name: string, sql: string) => void;
  onFormatQuery?: () => void;
  onLogMessage?: (msg: string, status: 'success' | 'error') => void;
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 
  'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'LEFT', 'RIGHT', 
  'INNER', 'OUTER', 'AS', 'DESC', 'ASC', 'IN', 'COALESCE', 'SUM', 'COUNT', 'AVG', 
  'MIN', 'MAX', 'HAVING', 'CASE', 'WHEN', 'THEN', 'END', 'NULL', 'LIKE'
];

const AUTOC_SUGGESTIONS = [
  ...SQL_KEYWORDS,
  'customers', 'products', 'orders', 'order_items', 'audit_logs',
  'lifetime_spent', 'joined_date', 'customer_id', 'order_date', 'total_amount',
  'quantity', 'unit_price', 'rating', 'category', 'status', 'email', 'name', 'sku'
];

export default function SqlEditor({
  sql,
  onChange,
  onExecute,
  isExecuting,
  onSaveQuery,
  onFormatQuery,
  onLogMessage
}: SqlEditorProps) {
  const [lineCount, setLineCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [snippetMenuOpen, setSnippetMenuOpen] = useState(false);
  
  // Auto-complete States
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteWord, setAutoCompleteWord] = useState('');
  const [filteredSpecs, setFilteredSpecs] = useState<string[]>([]);
  const [activeSpecIdx, setActiveSpecIdx] = useState(0);
  const [autoCCoords, setAutoCCoords] = useState({ top: 0, left: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Sync line numbers and highlighters
  useEffect(() => {
    const lines = sql.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [sql]);

  // Synergize scrolls
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Prettify query formatting regex helper
  const handleFormatSelf = () => {
    if (onFormatQuery) {
      onFormatQuery();
      return;
    }

    // fallback custom formatting
    let clean = sql.replace(/\s+/g, ' ').trim();
    // break on key statements
    const keywordsBreak = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'SET', 'VALUES'];
    
    let formatted = clean;
    keywordsBreak.forEach(word => {
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

    onChange(formatted);
    if (onLogMessage) {
      onLogMessage('SQL script beautified successfully.', 'success');
    }
  };

  // Keyboard bindings listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Tab key override inside text editors
    if (e.key === 'Tab') {
      if (showAutoComplete && filteredSpecs.length > 0) {
        e.preventDefault();
        insertSelectedSuggestion();
        return;
      }

      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newVal = sql.substring(0, start) + '  ' + sql.substring(end);
      onChange(newVal);
      // reset selection
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
      return;
    }

    // 2. Active Auto-complete navigation (Up / Down)
    if (showAutoComplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSpecIdx(p => (p + 1) % filteredSpecs.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSpecIdx(p => (p - 1 + filteredSpecs.length) % filteredSpecs.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertSelectedSuggestion();
        return;
      }
      if (e.key === 'Escape') {
        setShowAutoComplete(false);
        return;
      }
    }

    // 3. EXECUTE: Ctrl + Enter
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      onExecute();
    }

    // 4. FORMAT: Shift + Alt + F
    if (e.shiftKey && e.altKey && e.key === 'F') {
      e.preventDefault();
      handleFormatSelf();
    }

    // 5. SAVE: Ctrl + S
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (onSaveQuery) {
        onSaveQuery(`Saved Query (${new Date().toLocaleTimeString()})`, sql);
      }
    }
  };

  // Highlight syntax using regex strings safely via single-pass matching
  const renderHighlightedSql = () => {
    if (!sql) return <span className="text-slate-600">// Write standard SQL statements or utilize Natural Language features...</span>;
    
    // First escape HTML entities
    let escaped = sql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Combined regex to scan comments, strings, decimal numbers/integers, and keywords in one pass!
    // This absolutely guarantees we never double-highlight or mess up HTML classes like 'blue-400' or 'slate-500'.
    const keywordsRegexStr = SQL_KEYWORDS.join('|');
    const combinedRegex = new RegExp(
      `(--.*?$)|('(?:[^'\\\\]|\\\\.)*')|("(?:[^"\\\\]|\\\\.)*")|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:${keywordsRegexStr})\\b)`,
      'gmi'
    );

    const html = escaped.replace(combinedRegex, (match, comment, stringSingle, stringDouble, number, keyword) => {
      if (comment) {
        return `<span class="text-slate-500 italic">${comment}</span>`;
      }
      if (stringSingle || stringDouble) {
        return `<span class="text-emerald-400">${match}</span>`;
      }
      if (number) {
        return `<span class="text-amber-500">${number}</span>`;
      }
      if (keyword) {
        return `<span class="text-blue-400 font-bold">${match.toUpperCase()}</span>`;
      }
      return match;
    });

    return <code dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Copy query to memory
  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onLogMessage) {
      onLogMessage('SQL statement copied to standard clip boards.', 'success');
    }
  };

  // Auto-complete text analyzer
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, selectionStart);
    const words = textBeforeCursor.split(/[\s(),.;]/);
    const activeWord = words[words.length - 1] || '';

    if (activeWord.length >= 1) {
      const matched = AUTOC_SUGGESTIONS.filter(item => 
        item.toLowerCase().startsWith(activeWord.toLowerCase()) && 
        item.toLowerCase() !== activeWord.toLowerCase()
      ).slice(0, 5);

      if (matched.length > 0) {
        setFilteredSpecs(matched);
        setAutoCompleteWord(activeWord);
        setActiveSpecIdx(0);
        setShowAutoComplete(true);

        // Approximate cursor coordinates relative to viewport
        const linesBefore = textBeforeCursor.split('\n');
        const currentLineNum = linesBefore.length;
        const colNum = linesBefore[linesBefore.length - 1].length;

        setAutoCCoords({
          top: currentLineNum * 18 + 12,
          left: colNum * 7.5 + 45
        });
      } else {
        setShowAutoComplete(false);
      }
    } else {
      setShowAutoComplete(false);
    }
  };

  const insertSelectedSuggestion = () => {
    const targetSpec = filteredSpecs[activeSpecIdx];
    if (!targetSpec || !textareaRef.current) return;

    const cursorIdx = textareaRef.current.selectionStart;
    const textBefore = sql.substring(0, cursorIdx - autoCompleteWord.length);
    const textAfter = sql.substring(cursorIdx);
    
    onChange(textBefore + targetSpec + textAfter);
    setShowAutoComplete(false);

    // reposition cursor
    const newCursorIdx = cursorIdx - autoCompleteWord.length + targetSpec.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorIdx;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleSnippetClicked = (snip: SQLSnippet) => {
    onChange(snip.sql);
    setSnippetMenuOpen(false);
    if (onLogMessage) {
      onLogMessage(`Imported snippet template "${snip.name}" into editor view.`, 'success');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/45 relative border border-slate-900 rounded-lg overflow-hidden">
      
      {/* Editor toolbar option tray */}
      <div className="px-3.5 py-1.5 border-b border-slate-900 bg-slate-950 flex justify-between items-center text-xs select-none">
        
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              id="snip-dropdown-btn"
              onClick={() => setSnippetMenuOpen(!snippetMenuOpen)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 rounded flex items-center gap-1 cursor-pointer font-mono text-[10px]"
            >
              <Code className="w-3 h-3 text-blue-400" />
              SQL Templates
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            
            {snippetMenuOpen && (
              <div id="snip-menu-panel" className="absolute left-0 mt-1 w-64 rounded-md border border-slate-900 bg-slate-950 p-1.5 shadow-2xl z-50 animate-fade-in font-mono text-[10px]">
                <div className="px-2 py-1 border-b border-slate-900 text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Standard Boilerplates</div>
                {BUILTIN_SNIPPETS.map(snip => (
                  <button
                    key={snip.id}
                    onClick={() => handleSnippetClicked(snip)}
                    className="w-full text-left rounded p-1.5 hover:bg-blue-950/30 text-slate-300 hover:text-blue-300 cursor-pointer text-ellipsis overflow-hidden block"
                  >
                    <div className="font-semibold block">{snip.name}</div>
                    <span className="text-[8px] text-slate-500 font-normal mt-0.5">{snip.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            id="editor-format-btn"
            onClick={handleFormatSelf}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 rounded transition duration-150 cursor-pointer text-[10px]"
            title="Prettify formatting (Shift+Alt+F)"
          >
            Prettify Code
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="editor-copy-btn"
            onClick={handleCopy}
            className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
            title="Copy selection"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onSaveQuery && (
            <button
              id="editor-save-btn"
              onClick={() => onSaveQuery(`Query File ${new Date().toLocaleTimeString()}`, sql)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded flex items-center gap-1 cursor-pointer text-[10px]"
              title="Save changes to connections stack (Ctrl+S)"
            >
              <Save className="w-3 h-3 text-slate-400" />
              Save Query
            </button>
          )}

          <div className="w-px h-3.5 bg-slate-900" />

          {/* Running Button trigger */}
          <button
            id="execute-query-btn"
            onClick={onExecute}
            disabled={isExecuting}
            className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white rounded font-semibold text-[10px] flex items-center gap-1 hover:shadow-md hover:shadow-blue-500/10 active:scale-[0.98] transition cursor-pointer font-mono"
            title="Run active query (Ctrl+Enter)"
          >
            <Play className={`w-3 h-3 fill-white ${isExecuting ? 'animate-pulse' : ''}`} />
            {isExecuting ? 'Compiling' : 'Run Statement'}
          </button>
        </div>

      </div>

      {/* Editor Body Grid Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Line numbers pane */}
        <div className="w-10 bg-slate-950/60 text-right pr-2 py-3 border-r border-slate-900 select-none text-[11px] font-mono text-slate-600 leading-relaxed font-semibold">
          {Array.from({ length: lineCount }).map((_, idx) => (
            <div key={idx} className="h-4.5">{idx + 1}</div>
          ))}
        </div>

        {/* Dynamic Syntax Container with Transparent Layer textareas */}
        <div className="flex-1 relative overflow-hidden bg-[#030611]/15">
          
          {/* Layer 1: Colored Backdrop text representation */}
          <pre
            ref={highlightRef}
            className="absolute inset-0 m-0 p-3 select-none pointer-events-none font-mono text-[11px] md:text-xs leading-relaxed text-slate-300 overflow-auto whitespace-pre whitespace-pre-wrap break-all pr-4 text-left"
            aria-hidden="true"
          >
            {renderHighlightedSql()}
          </pre>

          {/* Layer 2: Transparent edit area with cursor */}
          <textarea
            id="main-sql-textarea"
            ref={textareaRef}
            value={sql}
            onChange={handleTextChange}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 m-0 p-3 w-full h-full bg-transparent text-transparent caret-blue-400 focus:outline-none font-mono text-[11px] md:text-xs leading-relaxed resize-none overflow-auto whitespace-pre whitespace-pre-wrap break-all pr-4 text-left"
            placeholder="SELECT * FROM customers LIMIT 10;"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* Smart Auto-complete popup overlay */}
          {showAutoComplete && filteredSpecs.length > 0 && (
            <div 
              id="spec-auto-popup"
              className="absolute border border-slate-900 bg-slate-950 rounded shadow-2xl p-1 z-50 w-44 font-mono text-[10px] text-left select-none"
              style={{ top: `${Math.min(autoCCoords.top, textareaRef.current?.clientHeight ? textareaRef.current.clientHeight - 100 : 300)}px`, left: `${autoCCoords.left}px` }}
            >
              <div className="px-1.5 py-0.5 border-b border-slate-900 text-[8px] tracking-wider text-slate-500 font-semibold mb-1 uppercase">Database IntelliSense</div>
              {filteredSpecs.map((spec, index) => (
                <div
                  key={spec}
                  onClick={() => {
                    setActiveSpecIdx(index);
                    insertSelectedSuggestion();
                  }}
                  className={`px-2 py-1 rounded cursor-pointer truncate flex items-center justify-between ${
                    index === activeSpecIdx ? 'bg-blue-950/50 text-blue-300 font-semibold border-l border-blue-500' : 'text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <span>{spec}</span>
                  <span className="text-[7px] text-slate-600 uppercase">
                    {SQL_KEYWORDS.includes(spec) ? 'Keyword' : 'Relation'}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Editor footer shortcuts list bar overlay */}
      <div className="px-3 py-1.5 border-t border-slate-900 bg-[#070b19] flex justify-between items-center text-[9px] text-slate-500 font-mono select-none">
        <div className="flex items-center gap-3">
          <span>Ctrl+Enter: <strong className="text-slate-400">Run</strong></span>
          <span>Shift+Alt+F: <strong className="text-slate-400">Beautify</strong></span>
          <span>Ctrl+S: <strong className="text-slate-400">Commit File</strong></span>
        </div>
        <div className="text-right text-slate-600">IntelliSense Autocomplete Active</div>
      </div>

    </div>
  );
}
