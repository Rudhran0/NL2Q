/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DBColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isForeign: boolean;
  foreignTable?: string;
  foreignColumn?: string;
}

export interface DBTable {
  name: string;
  rowCount: number;
  columns: DBColumn[];
  indexes: string[];
  sizeKb: number;
}

export interface DBSchema {
  tables: DBTable[];
  views: Array<{ name: string; definition: string }>;
  procedures: Array<{ name: string; definition: string }>;
  functions: Array<{ name: string; definition: string }>;
}

export interface DBConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver';
  host?: string;
  port?: number;
  username?: string;
  database?: string;
  filename?: string;
  isDemo?: boolean;
}

export interface QueryTab {
  id: string;
  title: string;
  connectionId: string;
  sql: string;
  nlInput: string;
  results?: QueryResult;
  isExecuting: boolean;
  cursorPosition?: { line: number; col: number };
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  executionTimeMs: number;
  rowCount: number;
  columnsMeta?: DBColumn[];
}

export interface SecurityScore {
  score: number; // 0 to 100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  violations: string[];
  isBlocked: boolean;
}

export interface AISqlResponse {
  sql: string;
  explanation: string;
  confidenceScore: number;
  safetyScore: SecurityScore;
  suggestedOptimizations?: string[];
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  connectionId: string;
  connectionName: string;
  sql: string;
  status: 'success' | 'error';
  rowsAffected: number;
  durationMs: number;
  message: string;
}

export interface SQLSnippet {
  id: string;
  name: string;
  sql: string;
  category: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'UTILITY';
  description?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  createdAt: string;
}

export interface DatabaseStats {
  totalDatabases: number;
  totalTables: number;
  totalQueries: number;
  successRate: number;
  avgQueryTimeMs: number;
  mostUsedTables: Array<{ name: string; count: number }>;
}
