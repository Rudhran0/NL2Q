/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_SANDBOX_DATA, SANDBOX_SCHEMA } from './src/data.js';
import { DBColumn, DBTable, AISqlResponse, SecurityScore, QueryResult, ExecutionLog } from './src/types.js';

dotenv.config();

const isCjs = typeof __filename !== 'undefined' && typeof __dirname !== 'undefined';
const resolvedFilename = isCjs ? __filename : fileURLToPath(import.meta.url);
const resolvedDirname = isCjs ? __dirname : path.dirname(resolvedFilename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory state of the demo sandbox database
let sandboxState = JSON.parse(JSON.stringify(INITIAL_SANDBOX_DATA));

// In-Memory Logs and Session Database Status
const queryLogs: ExecutionLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    connectionId: 'demo-sandbox',
    connectionName: 'NL2Q Demo Sandbox (SQLite)',
    sql: 'SELECT * FROM customers ORDER BY lifetime_spent DESC LIMIT 3;',
    status: 'success',
    rowsAffected: 3,
    durationMs: 4,
    message: 'Successfully retrieved 3 rows'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    connectionId: 'demo-sandbox',
    connectionName: 'NL2Q Demo Sandbox (SQLite)',
    sql: 'SELECT category, COUNT(*), AVG(price) FROM products GROUP BY category;',
    status: 'success',
    rowsAffected: 4,
    durationMs: 8,
    message: 'Group by aggregation evaluated successfully'
  }
];

// Lazy-loaded stable GoogleGenAI instance helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('⚠️ GEMINI_API_KEY is not defined. AI functions will run in offline simulation mode.');
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Global active connections profiles lists
let savedProfiles = [
  { id: 'postgres-staging', name: 'Staging Aurora (PostgreSQL)', type: 'postgresql', isOnline: true },
  { id: 'mysql-prod', name: 'Production Core (MySQL)', type: 'mysql', isOnline: true },
  { id: 'sqlserver-local', name: 'MSSQL Warehousing Engine', type: 'sqlserver', isOnline: false }
];

// SQL Safety Audit Layer
function runSafetyAudit(sql: string): SecurityScore {
  const normalizedSql = sql.toUpperCase().trim();
  const violations: string[] = [];
  let isBlocked = false;

  // Destructive operations parsing
  if (normalizedSql.includes('DROP DATABASE')) {
    violations.push('Blocked: DROP DATABASE commands are strictly restricted in safe environment.');
    isBlocked = true;
  }
  if (normalizedSql.includes('DROP TABLE')) {
    violations.push('Blocked: DROP TABLE operations require DBA intervention or offline migrations.');
    isBlocked = true;
  }
  if (normalizedSql.includes('DROP SCHEMA')) {
    violations.push('Blocked: DROP SCHEMA modification is disabled under user policy.');
    isBlocked = true;
  }
  if (normalizedSql.includes('TRUNCATE')) {
    violations.push('Blocked: TRUNCATE wipes tables entirely. Please use targeted DELETE statements.');
    isBlocked = true;
  }

  // DELETE without WHERE check
  if (normalizedSql.includes('DELETE ') && normalizedSql.includes('FROM') && !normalizedSql.includes('WHERE')) {
    violations.push('Blocked: DELETE FROM target tables without a WHERE clause is forbidden to prevent complete data wipeouts.');
    isBlocked = true;
  }

  // Multi-statement Injection parsing
  if (sql.includes(';') && sql.split(';').filter(part => part.trim().length > 0).length > 1) {
    // If it contains a write statement inside a second query
    const statementList = sql.split(';').map(s => s.toUpperCase());
    const hasUnsafeSemicolon = statementList.some((s, idx) => {
      if (idx > 0 && (s.includes('DELETE') || s.includes('DROP') || s.includes('UPDATE') || s.includes('ALTER') || s.includes('INSERT'))) {
        return true;
      }
      return false;
    });
    if (hasUnsafeSemicolon) {
      violations.push('Blocked: Detected multi-statement semicolon query injection attempt.');
      isBlocked = true;
    }
  }

  // Alter statement check
  if (normalizedSql.includes('ALTER TABLE') && (normalizedSql.includes('DROP COLUMN') || normalizedSql.includes('RENAME TO'))) {
    violations.push('Warning: Schema alteration is disabled in safe sandbox read-write mode.');
    isBlocked = true;
  }

  let score = 100;
  let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical' = 'safe';

  if (isBlocked) {
    score = 10;
    riskLevel = 'critical';
  } else if (violations.length > 0) {
    score = 65;
    riskLevel = 'medium';
  } else if (normalizedSql.includes('UPDATE') || normalizedSql.includes('DELETE') || normalizedSql.includes('INSERT')) {
    score = 85;
    riskLevel = 'low'; // contains modifications but is validated safe
  }

  return {
    score,
    riskLevel,
    violations,
    isBlocked
  };
}

/**
 * Evaluates sandbox SQL queries using combined localized regex rules
 * and server-side Gemini context-aware database simulation loops.
 */
async function executeSandboxQuery(sql: string): Promise<QueryResult> {
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  const normalized = cleanSql.toUpperCase();
  const startTime = Date.now();

  // Try direct fast-path evaluation for local regex selectors
  try {
    // 1. SELECT * FROM <table> [LIMIT n]
    const selectAllMatch = cleanSql.match(/^SELECT\s+\*\s+FROM\s+(\w+)(?:\s+LIMIT\s+(\d+))?;?$/i);
    if (selectAllMatch) {
      const tableName = selectAllMatch[1].toLowerCase();
      const limit = selectAllMatch[2] ? parseInt(selectAllMatch[2], 10) : null;
      
      if (sandboxState[tableName]) {
        let rows = [...sandboxState[tableName]];
        if (limit !== null) {
          rows = rows.slice(0, limit);
        }
        return {
          columns: Object.keys(rows[0] || {}),
          rows,
          rowCount: rows.length,
          executionTimeMs: Date.now() - startTime
        };
      }
    }

    // 2. SELECT * FROM <table> WHERE <col> = <val>
    const selectWhereMatch = cleanSql.match(/^SELECT\s+\*\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*(['"]?)([^'"]+)\3;?$/i);
    if (selectWhereMatch) {
      const tableName = selectWhereMatch[1].toLowerCase();
      const columnName = selectWhereMatch[2].toLowerCase();
      const value = selectWhereMatch[4];

      if (sandboxState[tableName]) {
        const rows = sandboxState[tableName].filter((r: any) => {
          const cellVal = String(r[columnName] ?? '').toLowerCase();
          return cellVal === value.toLowerCase();
        });
        return {
          columns: Object.keys(sandboxState[tableName][0] || {}),
          rows,
          rowCount: rows.length,
          executionTimeMs: Date.now() - startTime
        };
      }
    }

    // 3. Simple INSERT INTO <table> ...
    const insertMatch = cleanSql.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\);?$/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      const columns = insertMatch[2].split(',').map(s => s.trim());
      const valuesRaw = insertMatch[3].split(',').map(s => s.trim());

      if (sandboxState[tableName]) {
        const newRow: Record<string, any> = {};
        // Find existing primary key maximum to auto-increment if needed
        const prevRows = sandboxState[tableName];
        let nextId = 1;
        if (prevRows.length > 0) {
          const maxId = Math.max(...prevRows.map((r: any) => typeof r.id === 'number' ? r.id : 0));
          nextId = maxId + 1;
        }
        newRow.id = nextId;

        columns.forEach((col, idx) => {
          let val: any = valuesRaw[idx];
          if (val.startsWith("'") && val.endsWith("'")) {
            val = val.slice(1, -1);
          } else if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          } else {
            const num = Number(val);
            if (!isNaN(num)) val = num;
          }
          newRow[col] = val;
        });

        // Ensure id is correct in schema
        newRow.id = nextId;

        sandboxState[tableName].push(newRow);
        return {
          columns: ['status', 'rows_inserted', 'inserted_id'],
          rows: [{ status: 'success', rows_inserted: 1, inserted_id: nextId }],
          rowCount: 1,
          executionTimeMs: Date.now() - startTime
        };
      }
    }

    // 4. Simple UPDATE <table> SET <col> = <val> WHERE id = <id_val>
    const updateMatch = cleanSql.match(/^UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=\s*(['"]?)([^'"]+)\3\s+WHERE\s+id\s*=\s*(\d+);?$/i);
    if (updateMatch) {
      const tableName = updateMatch[1].toLowerCase();
      const columnName = updateMatch[2].toLowerCase();
      const value = updateMatch[4];
      const targetId = parseInt(updateMatch[5], 10);

      if (sandboxState[tableName]) {
        let updatedCount = 0;
        sandboxState[tableName] = sandboxState[tableName].map((r: any) => {
          if (r.id === targetId) {
            let typedVal: any = value;
            if (typeof r[columnName] === 'number') {
              typedVal = Number(value);
            }
            updatedCount++;
            return { ...r, [columnName]: typedVal };
          }
          return r;
        });
        return {
          columns: ['status', 'rows_updated'],
          rows: [{ status: 'success', rows_updated: updatedCount }],
          rowCount: updatedCount,
          executionTimeMs: Date.now() - startTime
        };
      }
    }
  } catch (err) {
    console.error('Regex Query parser failure, fallback to AI compiler:', err);
  }

  // Fallback to Gemini AI acting as our sandboxed "Virtual RDBMS Compiler"
  // This supports robust execution of multi-table JOINs, subqueries, group by aggregates, and functions!
  const ai = getGeminiClient();
  if (!ai) {
    // Return standard error if AI not configured and request was complex
    throw new Error(`Execution Error: Table or complex SQL aggregate processing offline. Ensure GEMINI_API_KEY is configured for complete AI compilation of query: "${sql}"`);
  }

  try {
    const prompt = `
      You are an in-memory SQL execution compiler mimicking a PostgreSQL sandbox.
      Given the requested SQL query, execute it over the provided active dataset representing tables: customers, products, orders, order_items, and audit_logs.
      
      Active Schema:
      1. customers: id (INT), name (VARCHAR), email (VARCHAR), country (VARCHAR), status (VARCHAR), joined_date (DATE), lifetime_spent (DECIMAL)
      2. products: id (INT), name (VARCHAR), sku (VARCHAR), category (VARCHAR), price (DECIMAL), stock (INT), rating (DECIMAL)
      3. orders: id (INT), customer_id (INT), order_date (DATE), total_amount (DECIMAL), status (VARCHAR), payment_method (VARCHAR)
      4. order_items: id (INT), order_id (INT), product_id (INT), quantity (INT), unit_price (DECIMAL)
      5. audit_logs: id (INT), timestamp (TIMESTAMP), severity (VARCHAR), action (VARCHAR), user_email (VARCHAR), ip_address (VARCHAR)

      Current Dataset State JSON:
      ${JSON.stringify(sandboxState, null, 2)}

      Query to run:
      "${sql}"

      INSTRUCTIONS:
      Evaluate the query results accurately.
      If the query is a SELECT statement, return the corresponding data columns list and active simulated records rows list.
      If the query is an INSERT, UPDATE, or DELETE modification, compute the result, mutate the table row keys, and return the mutated row confirmation (e.g. { rows_affected: 1 }). Also return a specific field indicating state edits so the system synchronizes.
      
      Your output MUST be a strict JSON object that conforms EXACTLY to this schema structure:
      {
        "columns": ["col1", "col2", "col3"],
        "rows": [
          { "col1": "val1", "col2": 120, "col3": "2026-06-07" }
        ],
        "stateEdit": {
          "tableModified": "customers" | "products" | "orders" | "order_items" | "audit_logs" | null,
          "updatedTableData": [] // full updated array for modified table after query operations, or null
        }
      }

      Do NOT add any description, explanations or markdown wrappers outside the raw XML/JSON snippet itself.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            columns: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {} // arbitrary row columns objects
              }
            },
            stateEdit: {
              type: Type.OBJECT,
              properties: {
                tableModified: { type: Type.STRING },
                updatedTableData: {
                  type: Type.ARRAY,
                  items: { type: Type.OBJECT }
                }
              }
            }
          },
          required: ['columns', 'rows']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    
    // Maintain state persistence if Gemini modified data
    if (parsed.stateEdit && parsed.stateEdit.tableModified && parsed.stateEdit.updatedTableData) {
      const tbl = parsed.stateEdit.tableModified.toLowerCase();
      if (sandboxState[tbl]) {
        sandboxState[tbl] = parsed.stateEdit.updatedTableData;
      }
    }

    return {
      columns: parsed.columns || [],
      rows: parsed.rows || [],
      rowCount: (parsed.rows || []).length,
      executionTimeMs: Date.now() - startTime
    };

  } catch (error: any) {
    console.error('Gemini Exec Compiler Error:', error);
    throw new Error(`Virtual DBMS Execution Error: ${error.message || 'Error executing complex aggregation'}`);
  }
}

// REST ENDPOINTS

// 1. Connection Manager - test connection
app.post('/api/db/test', (req, res) => {
  const { host, port, username, database, type, filename } = req.body;
  
  if (type === 'sqlite') {
    return res.json({
      status: 'success',
      message: `Connection established. Local SQLite file "${filename || ':memory:'}" loaded cleanly.`,
      schema: SANDBOX_SCHEMA
    });
  }

  // Mock server status for external DB connectors
  setTimeout(() => {
    res.json({
      status: 'success',
      message: `Connected successfully to remote ${type} schema cluster. Synchronized 5 relational objects on hand.`,
      details: {
        host,
        port,
        version: type === 'postgresql' ? 'PostgreSQL 16.2 on AWS RDS' : 'MySQL Community v8.0.35',
        driver: 'NL2Q JDBC-Native Link Core',
        ssl: 'enabled (TLS v1.3)'
      },
      schema: SANDBOX_SCHEMA
    });
  }, 400);
});

// 2. SQL execution endpoint
app.post('/api/db/query', async (req, res) => {
  const { connectionId, sql } = req.body;
  
  if (!sql || sql.trim().length === 0) {
    return res.status(400).json({ error: 'SQL statements cannot be empty.' });
  }

  // Run security validation
  const safety = runSafetyAudit(sql);
  if (safety.isBlocked) {
    const errorMsg = `SAFETY EXCEPTION BLOCKED: ${safety.violations.join(' | ')}`;
    // Record log of blocked query
    const logId = 'log-' + Math.random().toString(36).substr(2, 9);
    queryLogs.push({
      id: logId,
      timestamp: new Date().toISOString(),
      connectionId: connectionId || 'demo-sandbox',
      connectionName: connectionId === 'demo-sandbox' ? 'NL2Q Demo Sandbox (SQLite)' : 'Active Workspace Profile',
      sql,
      status: 'error',
      rowsAffected: 0,
      durationMs: 0,
      message: errorMsg
    });

    return res.json({
      success: false,
      safety,
      error: errorMsg,
      executionLogs: queryLogs.slice(-20) // send recent 20 logs
    });
  }

  try {
    const result = await executeSandboxQuery(sql);

    // Save success log
    const logId = 'log-' + Math.random().toString(36).substr(2, 9);
    queryLogs.push({
      id: logId,
      timestamp: new Date().toISOString(),
      connectionId: connectionId || 'demo-sandbox',
      connectionName: connectionId === 'demo-sandbox' ? 'NL2Q Demo Sandbox (SQLite)' : 'Active Workspace Profile',
      sql,
      status: 'success',
      rowsAffected: result.rowCount,
      durationMs: result.executionTimeMs,
      message: `Rows affected: ${result.rowCount}. Evaluated successfully in ${result.executionTimeMs}ms.`
    });

    res.json({
      success: true,
      result,
      safety,
      executionLogs: queryLogs.slice(-20)
    });

  } catch (err: any) {
    // Record failure log
    const logId = 'log-' + Math.random().toString(36).substr(2, 9);
    queryLogs.push({
      id: logId,
      timestamp: new Date().toISOString(),
      connectionId: connectionId || 'demo-sandbox',
      connectionName: connectionId === 'demo-sandbox' ? 'NL2Q Demo Sandbox (SQLite)' : 'Active Workspace Profile',
      sql,
      status: 'error',
      rowsAffected: 0,
      durationMs: 2,
      message: err.message || 'Unexpected SQL runtime violation'
    });

    res.json({
      success: false,
      error: err.message || 'Syntax violation during evaluation',
      safety,
      executionLogs: queryLogs.slice(-20)
    });
  }
});

// 3. Spreadsheet edit save mutations
app.post('/api/db/save', (req, res) => {
  const { table, rows } = req.body; // updated full table rows
  const tblName = String(table).toLowerCase();

  if (sandboxState[tblName]) {
    sandboxState[tblName] = rows;
    
    // Add logs
    queryLogs.push({
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      connectionId: 'demo-sandbox',
      connectionName: 'NL2Q Demo Sandbox (SQLite)',
      sql: `-- Spreadsheet Direct Update on [${tblName}] table; synchronizing grid dimensions`,
      status: 'success',
      rowsAffected: rows.length,
      durationMs: 3,
      message: `Spreadsheet edit synced: committed ${rows.length} records safely.`
    });

    return res.json({
      success: true,
      message: `Successfully synchronized ${rows.length} grid records into table '${tblName}' database cache.`,
      executionLogs: queryLogs.slice(-20)
    });
  }

  res.status(404).json({ error: `Table '${tblName}' not found in active Sandbox connection.` });
});

// 4. Natural Language to SQL converter endpoints
app.post('/api/ai/generate-sql', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'User natural language query text is required.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Simulating when offline
    const responseSim: AISqlResponse = {
      sql: `SELECT \n  c.id, \n  c.name, \n  SUM(o.total_amount) as total_spent\nFROM customers c\nJOIN orders o ON c.id = o.customer_id\nWHERE c.status = 'VIP'\nGROUP BY c.id, c.name\nORDER BY total_spent DESC;`,
      explanation: 'Joined customers and orders tables on key matching customer ID. Filtered rows by VIP customer status, grouped by names to compute total payment sums, and ordered by highest spenders descending.',
      confidenceScore: 92,
      safetyScore: { score: 100, riskLevel: 'safe', violations: [], isBlocked: false },
      suggestedOptimizations: ['Create index on customer_id in orders table.', 'Denormalize status on customers filter.']
    };
    return res.json(responseSim);
  }

  try {
    const systemPrompt = `
      You are an expert PostgreSQL & AI-Database IDE Assistant compiling clean database queries.
      Analyze the user instructions and design a professional-grade SQL query based on this Sandbox Data schema.
      
      Interactive Schema:
      1. Table "customers": id (INT, PRIMARY KEY), name (VARCHAR), email (VARCHAR), country (VARCHAR), status (VARCHAR - VIP, Active, Churned, Pending), joined_date (DATE), lifetime_spent (DECIMAL)
      2. Table "products": id (INT, PRIMARY KEY), name (VARCHAR), sku (VARCHAR), category (VARCHAR - Electronics, Furniture, Accessories, Apparel, Food & Beverage), price (DECIMAL), stock (INT), rating (DECIMAL)
      3. Table "orders": id (INT, PRIMARY KEY), customer_id (INT, FK to customers.id), order_date (DATE), total_amount (DECIMAL), status (VARCHAR - Completed, Processing, Shipped), payment_method (VARCHAR)
      4. Table "order_items": id (INT, PRIMARY KEY), order_id (INT, FK to orders.id), product_id (INT, FK to products.id), quantity (INT), unit_price (DECIMAL)
      5. Table "audit_logs": id (INT, PRIMARY KEY), timestamp (TIMESTAMP), severity (VARCHAR - Info, Warning, Error, Critical), action (VARCHAR), user_email (VARCHAR), ip_address (VARCHAR)

      Create a valid, optimized SQL dialect matching the request. Ensure strict join conditions.
      Validate the SQL generated for security and safety.
      
      Respond STRICTLY in a JSON code output format mirroring the keys:
      {
        "sql": "SELECT ...",
        "explanation": "Human explanatory summary detailing which keys were intersected and calculations performed.",
        "confidenceScore": 95, // Integer index representation
        "suggestedOptimizations": [
          "Create indexing on columns orders.customer_id for massive scan optimization.",
          "Use EXPLAIN ANALYZE if index size hits bounds."
        ]
      }

      Do not wrap the JSON output with markdown wrappers or notes.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sql: { type: Type.STRING },
            explanation: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
            suggestedOptimizations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['sql', 'explanation', 'confidenceScore']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const safety = runSafetyAudit(parsed.sql || '');

    res.json({
      ...parsed,
      safetyScore: safety
    });

  } catch (error: any) {
    res.status(500).json({ error: `AI Generation Error: ${error.message || 'Unable to parse request intent.'}` });
  }
});

// 5. Query explanation endpoint
app.post('/api/ai/explain', async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL query text is required.' });

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      explanation: 'Offline Demo Mode: This query joins orders onto customers, calculating aggregation metrics.',
      complexity: 'Medium',
      indexScans: ['idx_customers_lifetime_spent'],
      optimizedSql: sql
    });
  }

  try {
    const prompt = `
      Explain the following SQL query. Output structural breakdown of index scans, joining overhead, predicted analytical complex score (Low, Medium, High).
      Provide an optimized alternative SQL statement if possible.

      SQL Statement:
      "${sql}"

      Expected Output Format (JSON):
      {
        "explanation": "Markdown description outlining steps.",
        "complexity": "Low" | "Medium" | "High",
        "indexScans": ["list of tables/columns that would benefit from index overlays"],
        "optimizedSql": "Prettified/Optimized query text equivalent"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            complexity: { type: Type.STRING },
            indexScans: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            optimizedSql: { type: Type.STRING }
          },
          required: ['explanation', 'complexity', 'indexScans', 'optimizedSql']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json(parsed);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DB Chat interaction routing
app.post('/api/ai/chat', async (req, res) => {
  const { messages, activeTable } = req.body;
  
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      reply: "Hello! I am NL2Q's DB assistant. I am currently running in Offline mode. Please provide your Google Gemini API Key in the **Settings > Secrets** panel to fully enable real-time interactive AI DBA features!"
    });
  }

  try {
    const tableStructureContext = JSON.stringify(SANDBOX_SCHEMA.tables, null, 2);
    const systemInstruction = `
      You are an expert AI Database Administrator (DBA), Solutions Architect, and SQL Compiler assistant embedded inside "NL2Q Workbench".
      The user is building queries in their workspace editor. Help them answer questions, discover tables, suggest complex calculations or refactorings.
      
      Available Sandbox DB Tables:
      ${tableStructureContext}

      Active Table in viewer: ${activeTable || 'None selected'}
      
      Always provide precise advice, formatted with SQL keywords in Markdown block snippets. Be friendly, engineering-focused, and direct.
    `;

    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction
      }
    });

    res.json({ reply: response.text });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Initialize Database stats dashboard query indices
app.get('/api/analytics/stats', (req, res) => {
  const totalDatabases = savedProfiles.length + 1; // including sandbox Local
  const totalTables = SANDBOX_SCHEMA.tables.length;
  const totalQueriesCount = queryLogs.length;
  const successCount = queryLogs.filter(l => l.status === 'success').length;
  const successRate = totalQueriesCount > 0 ? Math.round((successCount / totalQueriesCount) * 100) : 100;
  
  const totalTime = queryLogs.reduce((acc, current) => acc + current.durationMs, 0);
  const avgQueryTimeMs = queryLogs.length > 0 ? Number((totalTime / queryLogs.length).toFixed(1)) : 2.5;

  res.json({
    totalDatabases,
    totalTables,
    totalQueries: totalQueriesCount,
    successRate,
    avgQueryTimeMs,
    mostUsedTables: [
      { name: 'customers', count: queryLogs.filter(l => l.sql.toLowerCase().includes('customers')).length },
      { name: 'orders', count: queryLogs.filter(l => l.sql.toLowerCase().includes('orders')).length },
      { name: 'products', count: queryLogs.filter(l => l.sql.toLowerCase().includes('products')).length },
      { name: 'order_items', count: queryLogs.filter(l => l.sql.toLowerCase().includes('order_items')).length },
      { name: 'audit_logs', count: queryLogs.filter(l => l.sql.toLowerCase().includes('audit_logs')).length }
    ].sort((a,b) => b.count - a.count)
  });
});

// VITE SERVER HYBRID BRIDGE PIPELINE SETUP
async function startWebPipeline() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NL2Q Workbench Running on: http://localhost:${PORT}`);
    console.log(`Running in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startWebPipeline();
