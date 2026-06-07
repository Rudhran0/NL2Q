/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  RefreshCw, 
  Table, 
  AlertTriangle,
  CheckCircle2,
  Trash
} from 'lucide-react';
import { DBTable } from '../types';

interface TableDataEditorProps {
  activeTableName: string;
  tableMeta: DBTable;
  onRefreshSchema?: () => void;
  onLogMessage?: (msg: string, status: 'success' | 'error') => void;
}

interface StagedEdit {
  type: 'cell-edit' | 'row-add' | 'row-delete';
  rowId: number;
  column?: string;
  prevValue?: any;
  newValue?: any;
  tableName: string;
}

export default function TableDataEditor({ 
  activeTableName, 
  tableMeta, 
  onRefreshSchema,
  onLogMessage 
}: TableDataEditorProps) {
  const [localRows, setLocalRows] = useState<any[]>([]);
  const [originalRows, setOriginalRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stagedEdits, setStagedEdits] = useState<StagedEdit[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: number; colName: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Load table data from sandbox back-end
  const loadData = async () => {
    setIsLoading(true);
    setStagedEdits([]);
    setEditingCell(null);
    try {
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: 'demo-sandbox',
          sql: `SELECT * FROM ${activeTableName};`
        })
      });
      const data = await response.json();
      if (data.success && data.result) {
        setLocalRows(data.result.rows || []);
        setOriginalRows(JSON.parse(JSON.stringify(data.result.rows || [])));
        if (onLogMessage) {
          onLogMessage(`Spreadsheet loaded table [${activeTableName}] with ${data.result.rows.length} rows successfully.`, 'success');
        }
      } else {
        throw new Error(data.error || 'Syntax exception');
      }
    } catch (err: any) {
      if (onLogMessage) {
        onLogMessage(`Failed to load spreadsheet table [${activeTableName}]: ${err.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTableName]);

  // Handle cell edit commit in-memory
  const handleCellClick = (rowId: number, colName: string, currentValue: any) => {
    // Avoid editing primary key id column directly
    if (colName === 'id') return;
    setEditingCell({ rowId, colName });
    setEditingValue(String(currentValue ?? ''));
  };

  const handleCellBlur = (rowId: number, colName: string, numValueCheck: boolean) => {
    if (!editingCell) return;
    
    // Check if value actually changed
    const originalRow = originalRows.find(r => r.id === rowId);
    const originalVal = originalRow ? originalRow[colName] : undefined;
    
    let typedValue: any = editingValue;
    if (numValueCheck) {
      const num = Number(editingValue);
      if (!isNaN(num)) typedValue = num;
    }

    if (String(originalVal) !== String(typedValue)) {
      // Record staged edit
      const editRecord: StagedEdit = {
        type: 'cell-edit',
        tableName: activeTableName,
        rowId,
        column: colName,
        prevValue: originalVal,
        newValue: typedValue
      };

      // Set new rows locally
      setLocalRows(prev => prev.map(row => {
        if (row.id === rowId) {
          return { ...row, [colName]: typedValue };
        }
        return row;
      }));

      // Filter existing staged cell-edit for same cell
      setStagedEdits(prev => [
        ...prev.filter(e => !(e.rowId === rowId && e.column === colName && e.type === 'cell-edit')),
        editRecord
      ]);
    }

    setEditingCell(null);
  };

  // Add new blank row inline
  const handleAddRow = () => {
    const defaultRow: Record<string, any> = {};
    const cols = tableMeta.columns;

    // Generate max ID
    const maxId = localRows.length > 0 
      ? Math.max(...localRows.map(r => typeof r.id === 'number' ? r.id : 0)) 
      : 0;
    const newId = maxId + 1;

    cols.forEach(col => {
      if (col.name === 'id') {
        defaultRow.id = newId;
      } else if (col.type.startsWith('INT') || col.type.startsWith('DECIMAL')) {
        defaultRow[col.name] = 0;
      } else if (col.type === 'DATE' || col.type === 'TIMESTAMP') {
        defaultRow[col.name] = new Date().toISOString().split('T')[0];
      } else {
        defaultRow[col.name] = '';
      }
    });

    setLocalRows(prev => [...prev, defaultRow]);
    setStagedEdits(prev => [...prev, {
      type: 'row-add',
      tableName: activeTableName,
      rowId: newId,
      newValue: defaultRow
    }]);

    if (onLogMessage) {
      onLogMessage(`Staged row creation for table [${activeTableName}] with ID: ${newId}.`, 'success');
    }
  };

  // Staged delete row
  const handleDeleteRow = (rowId: number) => {
    // Check if row was newly added
    const isNew = stagedEdits.some(e => e.rowId === rowId && e.type === 'row-add');
    
    if (isNew) {
      // Remove entirely
      setLocalRows(prev => prev.filter(r => r.id !== rowId));
      setStagedEdits(prev => prev.filter(e => !(e.rowId === rowId && e.type === 'row-add')));
    } else {
      // Mark as deleted visually and track staged
      setLocalRows(prev => prev.filter(r => r.id !== rowId));
      setStagedEdits(prev => [
        ...prev.filter(e => e.rowId !== rowId),
        {
          type: 'row-delete',
          tableName: activeTableName,
          rowId
        }
      ]);
    }

    if (onLogMessage) {
      onLogMessage(`Staged row destruction of record #${rowId} in table [${activeTableName}].`, 'success');
    }
  };

  // Discard all staged changes
  const handleRollback = () => {
    setLocalRows(JSON.parse(JSON.stringify(originalRows)));
    setStagedEdits([]);
    setEditingCell(null);
    if (onLogMessage) {
      onLogMessage(`Spreadsheet modifications for [${activeTableName}] were successfully rolled back.`, 'success');
    }
  };

  // Save changes to backend via bulk /save API
  const handleSaveChanges = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: activeTableName,
          rows: localRows
        })
      });
      const data = await response.json();
      if (data.success) {
        setOriginalRows(JSON.parse(JSON.stringify(localRows)));
        setStagedEdits([]);
        if (onLogMessage) {
          onLogMessage(`Successfully committed and synchronized all active cell state changes representing table [${activeTableName}]`, 'success');
        }
        if (onRefreshSchema) {
          onRefreshSchema();
        }
      } else {
        throw new Error(data.error || 'Unknown write error');
      }
    } catch (err: any) {
      if (onLogMessage) {
        onLogMessage(`Failed to synchronize edits: ${err.message}`, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Find if cell has been modified
  const isCellModified = (rowId: number, colName: string) => {
    return stagedEdits.some(e => e.rowId === rowId && e.column === colName && e.type === 'cell-edit');
  };

  return (
    <div className="flex flex-col h-full bg-[#050814]/85">
      {/* Spreadsheet grid header ribbon */}
      <div className="px-4 py-2 border-b border-slate-900 bg-slate-950/60 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-amber-950/40 border border-amber-800/20 flex items-center justify-center text-amber-500">
            <Table className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-white text-xs font-semibold uppercase">{activeTableName}</span>
            <span className="text-[9px] text-slate-500 font-mono ml-2">({localRows.length} total rows loaded)</span>
          </div>
        </div>

        {/* Mutation controllers */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            id="spreadsheet-add-btn"
            onClick={handleAddRow}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 flex items-center gap-1 hover:text-white transition duration-200 cursor-pointer text-[10px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>

          {stagedEdits.length > 0 ? (
            <>
              <div className="h-4 w-px bg-slate-900 mx-1" />
              
              <div className="flex items-center gap-1 bg-amber-950/30 border border-amber-900/40 py-0.5 px-2 rounded text-[10px] text-amber-400 font-mono">
                <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
                {stagedEdits.length} staged change{stagedEdits.length > 1 ? 's' : ''}
              </div>

              <button
                id="spreadsheet-rollback-btn"
                onClick={handleRollback}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 hover:text-red-400 text-slate-400 rounded border border-slate-800 flex items-center gap-1 transition duration-200 cursor-pointer text-[10px]"
                title="Discard all pending changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </button>

              <button
                id="spreadsheet-commit-btn"
                onClick={handleSaveChanges}
                disabled={isSyncing}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center gap-1 transition duration-200 cursor-pointer text-[10px] shadow-sm shadow-blue-900/30 font-mono"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Commit EMR ({stagedEdits.length})
              </button>
            </>
          ) : null}
        </div>
      </div>

      {stagedEdits.length > 0 ? (
        <div className="bg-amber-950/10 border-b border-amber-950/30 px-4 py-2 flex items-center text-[10px] text-amber-400/90 font-mono gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Inline Spreadsheet Sandbox mode: edits are staged locally. Click <strong>Commit EMR</strong> to write permanent database edits.</span>
        </div>
      ) : null}

      {/* Spreadsheet main viewport */}
      <div className="flex-1 overflow-auto relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-[#050814]/70 flex items-center justify-center backdrop-blur-xs z-10">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
              <span className="text-xs text-slate-400 font-mono">Synchronizing spreadsheet grid rows...</span>
            </div>
          </div>
        ) : null}

        {localRows.length === 0 && !isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-500 gap-2 p-5 text-center">
            <AlertTriangle className="w-8 h-8 text-slate-600" />
            <span className="text-xs font-mono">No record objects found in database schema '{activeTableName}'.</span>
            <button
              onClick={handleAddRow}
              className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-mono rounded cursor-pointer"
            >
              Add First Record
            </button>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-[11px] border-collapse min-w-[700px] select-text">
            {/* Table headers */}
            <thead>
              <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 select-none">
                <th className="py-2.5 px-3 border-r border-slate-900 w-12 text-center">#</th>
                {tableMeta.columns.map(col => (
                  <th key={col.name} className="py-2.5 px-3 border-r border-slate-900 font-medium font-mono text-left group">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">{col.name}</span>
                      <span className="text-[8px] text-slate-600 font-normal ml-2">{col.type}</span>
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>

            {/* Table body rows */}
            <tbody className="divide-y divide-slate-900/60">
              {localRows.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-slate-900/40 transition-colors duration-100 group text-slate-300">
                  {/* Row index listing */}
                  <td className="py-1 px-3 border-r border-slate-900 text-slate-600 text-center select-none bg-slate-950/20">{rowIdx + 1}</td>
                  
                  {/* Row data cells */}
                  {tableMeta.columns.map(col => {
                    const isEditing = editingCell?.rowId === row.id && editingCell?.colName === col.name;
                    const isModified = isCellModified(row.id, col.name);
                    const cellValue = row[col.name];

                    return (
                      <td 
                        key={col.name} 
                        onClick={() => handleCellClick(row.id, col.name, cellValue)}
                        className={`p-1 border-r border-slate-900 max-w-xs overflow-hidden text-ellipsis cursor-pointer transition-all ${
                          isModified ? 'bg-amber-950/15 border-l border-l-amber-600' : ''
                        } ${col.name === 'id' ? 'bg-slate-950/10 text-slate-500 cursor-not-allowed select-none' : ''}`}
                      >
                        {isEditing ? (
                          <input
                            id={`spread-input-${row.id}-${col.name}`}
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleCellBlur(
                              row.id, 
                              col.name, 
                              col.type.startsWith('INT') || col.type.startsWith('DECIMAL')
                            )}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellBlur(
                                  row.id, 
                                  col.name, 
                                  col.type.startsWith('INT') || col.type.startsWith('DECIMAL')
                                );
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="w-full bg-slate-900 border border-blue-500 rounded text-xs py-0.5 px-1.5 focus:outline-none text-white font-mono"
                          />
                        ) : (
                          <div className="flex items-center justify-between min-h-6 px-1 text-xs font-mono">
                            <span className="truncate">
                              {cellValue === null || cellValue === undefined ? (
                                <span className="text-slate-600 italic">NULL</span>
                              ) : typeof cellValue === 'number' && col.type.startsWith('DECIMAL') ? (
                                `$${cellValue.toFixed(2)}`
                              ) : (
                                String(cellValue)
                              )}
                            </span>
                            {isModified ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5 shadow-sm shadow-amber-500/50" title="Staged Modification" />
                            ) : null}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Actions column */}
                  <td className="py-1 px-3 text-center border-l border-slate-955 bg-[#050814]/40 select-none">
                    <button
                      id={`delete-row-btn-${row.id}`}
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-500 rounded transition duration-200 inline-block cursor-pointer"
                      title="Staged deletion of this row"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
