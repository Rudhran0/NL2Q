/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DBConnection, SQLSnippet, DBSchema } from './types';

export const INITIAL_CONNECTIONS: DBConnection[] = [
  {
    id: 'demo-sandbox',
    name: 'NL2Q Demo Sandbox (SQLite)',
    type: 'sqlite',
    filename: ':memory:',
    isDemo: true
  },
  {
    id: 'postgres-staging',
    name: 'Staging Aurora (PostgreSQL)',
    type: 'postgresql',
    host: 'pg-staging-cluster.internal.net',
    port: 5432,
    username: 'nl2q_reader',
    database: 'analytics_db',
    isDemo: false
  },
  {
    id: 'mysql-prod',
    name: 'Production Core (MySQL)',
    type: 'mysql',
    host: 'db-prod-replica-east.infra.net',
    port: 3306,
    username: 'nl2q_readonly',
    database: 'master_sales',
    isDemo: false
  },
  {
    id: 'sqlserver-local',
    name: 'MSSQL Warehousing Engine',
    type: 'sqlserver',
    host: '10.0.4.88',
    port: 1433,
    username: 'bi_analyst_corp',
    database: 'dw_global_v2',
    isDemo: false
  }
];

export const BUILTIN_SNIPPETS: SQLSnippet[] = [
  {
    id: 'snip-1',
    name: 'Top Customers by Revenue',
    category: 'SELECT',
    description: 'Calculates overall spend per active customer and ranks them descending.',
    sql: `SELECT \n  c.id, \n  c.name, \n  c.email, \n  SUM(o.total_amount) as total_spent,\n  COUNT(o.id) as order_count\nFROM customers c\nJOIN orders o ON c.id = o.customer_id\nWHERE o.status = 'Completed'\nGROUP BY c.id, c.name, c.email\nORDER BY total_spent DESC\nLIMIT 5;`
  },
  {
    id: 'snip-2',
    name: 'Low Inventory Alert',
    category: 'SELECT',
    description: 'Finds products having stock below 20 items to trigger restocking alerts.',
    sql: `SELECT \n  id,\n  name,\n  sku,\n  category,\n  price,\n  stock\nFROM products\nWHERE stock < 20 \nORDER BY stock ASC;`
  },
  {
    id: 'snip-3',
    name: 'Add New VIP Customer',
    category: 'INSERT',
    description: 'Inserts standard boilerplate record into customers schema.',
    sql: `INSERT INTO customers (id, name, email, country, status, joined_date, lifetime_spent)\nVALUES (16, 'Devon Vance', 'devon@nl2q.io', 'United Kingdom', 'VIP', '2026-06-07', 2500.00);`
  },
  {
    id: 'snip-4',
    name: 'Update Order Status safely',
    category: 'UPDATE',
    description: 'Updates specified order status with appropriate safety parameters.',
    sql: `UPDATE orders \nSET status = 'Shipped' \nWHERE id = 3 \n  AND status = 'Processing';`
  },
  {
    id: 'snip-5',
    name: 'Recent Error Audits',
    category: 'SELECT',
    description: 'Filters historical audit logs strictly targeting high severity failures.',
    sql: `SELECT \n  timestamp, \n  severity, \n  action, \n  user_email\nFROM audit_logs\nWHERE severity IN ('Error', 'Critical')\nORDER BY timestamp DESC\nLIMIT 10;`
  }
];

export const SANDBOX_SCHEMA: DBSchema = {
  tables: [
    {
      name: 'customers',
      rowCount: 15,
      sizeKb: 64,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true, isForeign: false },
        { name: 'name', type: 'VARCHAR(100)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'email', type: 'VARCHAR(120)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'country', type: 'VARCHAR(60)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'status', type: 'VARCHAR(20)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'joined_date', type: 'DATE', nullable: false, isPrimary: false, isForeign: false },
        { name: 'lifetime_spent', type: 'DECIMAL(10,2)', nullable: false, isPrimary: false, isForeign: false }
      ],
      indexes: ['idx_customer_email', 'idx_customer_status']
    },
    {
      name: 'products',
      rowCount: 12,
      sizeKb: 48,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true, isForeign: false },
        { name: 'name', type: 'VARCHAR(100)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'sku', type: 'VARCHAR(30)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'category', type: 'VARCHAR(50)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'price', type: 'DECIMAL(10,2)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'stock', type: 'INTEGER', nullable: false, isPrimary: false, isForeign: false },
        { name: 'rating', type: 'DECIMAL(2,1)', nullable: true, isPrimary: false, isForeign: false }
      ],
      indexes: ['idx_product_sku', 'idx_product_category']
    },
    {
      name: 'orders',
      rowCount: 15,
      sizeKb: 80,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true, isForeign: false },
        { name: 'customer_id', type: 'INTEGER', nullable: false, isPrimary: false, isForeign: true, foreignTable: 'customers', foreignColumn: 'id' },
        { name: 'order_date', type: 'DATE', nullable: false, isPrimary: false, isForeign: false },
        { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'status', type: 'VARCHAR(20)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'payment_method', type: 'VARCHAR(30)', nullable: false, isPrimary: false, isForeign: false }
      ],
      indexes: ['idx_order_customer_id', 'idx_order_status']
    },
    {
      name: 'order_items',
      rowCount: 20,
      sizeKb: 96,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true, isForeign: false },
        { name: 'order_id', type: 'INTEGER', nullable: false, isPrimary: false, isForeign: true, foreignTable: 'orders', foreignColumn: 'id' },
        { name: 'product_id', type: 'INTEGER', nullable: false, isPrimary: false, isForeign: true, foreignTable: 'products', foreignColumn: 'id' },
        { name: 'quantity', type: 'INTEGER', nullable: false, isPrimary: false, isForeign: false },
        { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false, isPrimary: false, isForeign: false }
      ],
      indexes: ['idx_item_order_id', 'idx_item_product_id']
    },
    {
      name: 'audit_logs',
      rowCount: 12,
      sizeKb: 112,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false, isPrimary: true, isForeign: false },
        { name: 'timestamp', type: 'TIMESTAMP', nullable: false, isPrimary: false, isForeign: false },
        { name: 'severity', type: 'VARCHAR(15)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'action', type: 'VARCHAR(100)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'user_email', type: 'VARCHAR(120)', nullable: false, isPrimary: false, isForeign: false },
        { name: 'ip_address', type: 'VARCHAR(45)', nullable: false, isPrimary: false, isForeign: false }
      ],
      indexes: ['idx_audit_timestamp', 'idx_audit_severity']
    }
  ],
  views: [
    {
      name: 'v_customer_summary',
      definition: `CREATE VIEW v_customer_summary AS\nSELECT \n  c.id, \n  c.name, \n  COUNT(o.id) as orders_count, \n  COALESCE(SUM(o.total_amount), 0) as total_spent\nFROM customers c\nLEFT JOIN orders o ON c.id = o.customer_id\nGROUP BY c.id, c.name;`
    },
    {
      name: 'v_revenue_by_category',
      definition: `CREATE VIEW v_revenue_by_category AS\nSELECT \n  p.category,\n  COUNT(oi.id) as units_sold,\n  SUM(oi.quantity * oi.unit_price) as total_revenue\nFROM products p\nJOIN order_items oi ON p.id = oi.product_id\nGROUP BY p.category;`
    }
  ],
  procedures: [
    {
      name: 'sp_apply_promotional_discount',
      definition: `CREATE PROCEDURE sp_apply_promotional_discount(IN orderId INT, IN pct DECIMAL(3,2))\nBEGIN\n  UPDATE orders \n  SET total_amount = total_amount * (1.0 - pct) \n  WHERE id = orderId;\nEND;`
    }
  ],
  functions: [
    {
      name: 'fn_calculate_sales_tax',
      definition: `CREATE FUNCTION fn_calculate_sales_tax(amount DECIMAL(10,2), country VARCHAR(50))\nRETURNS DECIMAL(10,2)\nBEGIN\n  IF country = 'Canada' THEN RETURN amount * 0.13;\n  ELSEIF country = 'United Kingdom' THEN RETURN amount * 0.20;\n  ELSE RETURN amount * 0.08;\n  END IF;\nEND;`
    }
  ]
};

export const INITIAL_SANDBOX_DATA: Record<string, Record<string, any>[]> = {
  customers: [
    { id: 1, name: 'Alice Smith', email: 'alice@verdict.com', country: 'United States', status: 'VIP', joined_date: '2024-01-15', lifetime_spent: 1820.50 },
    { id: 2, name: 'Bob Johnson', email: 'bob@techhive.io', country: 'Canada', status: 'Active', joined_date: '2024-03-22', lifetime_spent: 340.00 },
    { id: 3, name: 'Carlos Gomez', email: 'carlos@estates.es', country: 'Spain', status: 'Active', joined_date: '2024-07-09', lifetime_spent: 720.15 },
    { id: 4, name: 'Diane Foster', email: 'diane@clinical.org', country: 'United States', status: 'Churned', joined_date: '2023-11-12', lifetime_spent: 90.00 },
    { id: 5, name: 'Emeka Okafor', email: 'emeka@delta.ng', country: 'Nigeria', status: 'Active', joined_date: '2025-02-01', lifetime_spent: 1250.00 },
    { id: 6, name: 'Fiona Gallagher', email: 'fiona@chicago.edu', country: 'United States', status: 'VIP', joined_date: '2025-04-18', lifetime_spent: 2200.30 },
    { id: 7, name: 'Guillaume Dupont', email: 'guillaume@luxe.fr', country: 'France', status: 'Pending', joined_date: '2026-05-30', lifetime_spent: 0.00 },
    { id: 8, name: 'Haruto Tanaka', email: 'haruto@kyoto-dyn.jp', country: 'Japan', status: 'Active', joined_date: '2025-01-14', lifetime_spent: 880.00 },
    { id: 9, name: 'Isabella Ross', email: 'isabella@milano.it', country: 'Italy', status: 'VIP', joined_date: '2024-10-05', lifetime_spent: 1540.00 },
    { id: 10, name: 'Kofi Mensah', email: 'kofi@goldcoast.gh', country: 'Ghana', status: 'Active', joined_date: '2025-03-08', lifetime_spent: 450.70 },
    { id: 11, name: 'Liam Neeson', email: 'taken@action.co.uk', country: 'United Kingdom', status: 'Active', joined_date: '2024-02-19', lifetime_spent: 610.00 },
    { id: 12, name: 'Maria Silva', email: 'maria@rio.br', country: 'Brazil', status: 'Churned', joined_date: '2023-08-25', lifetime_spent: 120.00 },
    { id: 13, name: 'Niels Bohr', email: 'quantum@physics.dk', country: 'Denmark', status: 'Active', joined_date: '2024-11-30', lifetime_spent: 980.00 },
    { id: 14, name: 'Olivia Wang', email: 'olivia@shanghai.cn', country: 'China', status: 'VIP', joined_date: '2024-05-12', lifetime_spent: 3100.00 },
    { id: 15, name: 'Pavel Durov', email: 'telegram@durov.ae', country: 'UAE', status: 'Active', joined_date: '2025-05-01', lifetime_spent: 500.00 }
  ],
  products: [
    { id: 1, name: 'Quantum Apex Keyboard', sku: 'KB-QNT-01', category: 'Electronics', price: 189.99, stock: 45, rating: 4.8 },
    { id: 2, name: 'OmniDesk Ergonomic Chair', sku: 'FUR-OMN-02', category: 'Furniture', price: 450.00, stock: 12, rating: 4.6 },
    { id: 3, name: 'Nexus Core Noise-Cancelling Headphones', sku: 'HP-NXS-09', category: 'Electronics', price: 299.99, stock: 85, rating: 4.9 },
    { id: 4, name: 'Solaris Smart Water Vessel', sku: 'BOT-SLR-04', category: 'Accessories', price: 59.95, stock: 150, rating: 4.2 },
    { id: 5, name: 'NeoFit Breathable Jacket', sku: 'APP-NEO-05', category: 'Apparel', price: 120.00, stock: 30, rating: 4.5 },
    { id: 6, name: 'Aether Light Ambient Panel', sku: 'PST-AET-21', category: 'Electronics', price: 89.00, stock: 8, rating: 4.7 },
    { id: 7, name: 'Helios Ultra-Short Throw Projector', sku: 'PRJ-HLS-88', category: 'Electronics', price: 1499.00, stock: 5, rating: 4.9 },
    { id: 8, name: 'Chronos Mechanical Watch', sku: 'WTC-CHRN-07', category: 'Accessories', price: 350.00, stock: 18, rating: 4.4 },
    { id: 9, name: 'Zenith Organic Roasted Beans', sku: 'COF-ZEN-11', category: 'Food & Beverage', price: 24.50, stock: 310, rating: 4.8 },
    { id: 10, name: 'Apex Leather Portfolio', sku: 'BAG-APX-44', category: 'Apparel', price: 145.00, stock: 24, rating: 4.3 },
    { id: 11, name: 'Svelte Gym Gym Bag', sku: 'BAG-SVL-02', category: 'Accessories', price: 75.00, stock: 42, rating: 4.1 },
    { id: 12, name: 'Carbon Fiber Laptop Stand', sku: 'FUR-CRB-10', category: 'Furniture', price: 85.00, stock: 60, rating: 4.6 }
  ],
  orders: [
    { id: 1, customer_id: 1, order_date: '2026-01-20', total_amount: 489.98, status: 'Completed', payment_method: 'Stripe' },
    { id: 2, customer_id: 2, order_date: '2026-02-15', total_amount: 340.00, status: 'Completed', payment_method: 'Apple Pay' },
    { id: 3, customer_id: 3, order_date: '2026-03-02', total_amount: 189.99, status: 'Processing', payment_method: 'Stripe' },
    { id: 4, customer_id: 5, order_date: '2026-03-10', total_amount: 1250.00, status: 'Completed', payment_method: 'Wire Transfer' },
    { id: 5, customer_id: 6, order_date: '2026-03-18', total_amount: 1499.00, status: 'Completed', payment_method: 'Stripe' },
    { id: 6, customer_id: 8, order_date: '2026-04-01', total_amount: 880.00, status: 'Completed', payment_method: 'PayPal' },
    { id: 7, customer_id: 9, order_date: '2026-04-12', total_amount: 599.98, status: 'Completed', payment_method: 'Stripe' },
    { id: 8, customer_id: 11, order_date: '2026-04-20', total_amount: 610.00, status: 'Shipped', payment_method: 'Google Pay' },
    { id: 9, customer_id: 13, order_date: '2026-05-02', total_amount: 980.00, status: 'Completed', payment_method: 'Stripe' },
    { id: 10, customer_id: 14, order_date: '2026-05-15', total_amount: 1589.99, status: 'Completed', payment_method: 'Wire Transfer' },
    { id: 11, customer_id: 15, order_date: '2026-05-22', total_amount: 500.00, status: 'Processing', payment_method: 'Apple Pay' },
    { id: 12, customer_id: 1, order_date: '2026-05-27', total_amount: 1330.52, status: 'Completed', payment_method: 'Stripe' },
    { id: 13, customer_id: 6, order_date: '2026-06-01', total_amount: 701.30, status: 'Processing', payment_method: 'Stripe' },
    { id: 14, customer_id: 14, order_date: '2026-06-03', total_amount: 1510.01, status: 'Completed', payment_method: 'Wire Transfer' },
    { id: 15, customer_id: 10, order_date: '2026-06-05', total_amount: 450.70, status: 'Completed', payment_method: 'PayPal' }
  ],
  order_items: [
    { id: 1, order_id: 1, product_id: 1, quantity: 1, unit_price: 189.99 },
    { id: 2, order_id: 1, product_id: 3, quantity: 1, unit_price: 299.99 },
    { id: 3, order_id: 2, product_id: 2, quantity: 1, unit_price: 340.00 },
    { id: 4, order_id: 3, product_id: 1, quantity: 1, unit_price: 189.99 },
    { id: 5, order_id: 4, product_id: 7, quantity: 1, unit_price: 1250.00 },
    { id: 6, order_id: 5, product_id: 7, quantity: 1, unit_price: 1499.00 },
    { id: 7, order_id: 6, product_id: 2, quantity: 1, unit_price: 450.00 },
    { id: 8, order_id: 6, product_id: 8, quantity: 1, unit_price: 350.00 },
    { id: 9, order_id: 6, product_id: 12, quantity: 1, unit_price: 80.00 },
    { id: 10, order_id: 7, product_id: 3, quantity: 2, unit_price: 299.99 },
    { id: 11, order_id: 8, product_id: 2, quantity: 1, unit_price: 450.00 },
    { id: 12, order_id: 8, product_id: 10, quantity: 1, unit_price: 145.00 },
    { id: 13, order_id: 8, product_id: 11, quantity: 1, unit_price: 15.00 },
    { id: 14, order_id: 9, product_id: 1, quantity: 1, unit_price: 189.99 },
    { id: 15, order_id: 9, product_id: 3, quantity: 2, unit_price: 299.99 },
    { id: 16, order_id: 9, product_id: 4, quantity: 3, unit_price: 59.95 },
    { id: 17, order_id: 10, product_id: 7, quantity: 1, unit_price: 1499.00 },
    { id: 18, order_id: 10, product_id: 6, quantity: 1, unit_price: 90.99 },
    { id: 19, order_id: 11, product_id: 8, quantity: 1, unit_price: 350.00 },
    { id: 20, order_id: 11, product_id: 10, quantity: 1, unit_price: 150.00 }
  ],
  audit_logs: [
    { id: 1, timestamp: '2026-06-07T01:10:00Z', severity: 'Info', action: 'Connection established', user_email: 'ram@nl2q.io', ip_address: '192.168.1.45' },
    { id: 2, timestamp: '2026-06-07T01:12:15Z', severity: 'Info', action: 'Schema synchronized successfully', user_email: 'ram@nl2q.io', ip_address: '192.168.1.45' },
    { id: 3, timestamp: '2026-06-07T02:04:30Z', severity: 'Warning', action: 'Unoptimized query threshold flagged on order_items scan', user_email: 'analytic_node@infra_service', ip_address: '10.0.8.2' },
    { id: 4, timestamp: '2026-06-07T02:30:11Z', severity: 'Info', action: 'SQL execution completed: SELECT * FROM customers LIMIT 100', user_email: 'ram@nl2q.io', ip_address: '192.168.1.45' },
    { id: 5, timestamp: '2026-06-07T03:55:00Z', severity: 'Error', action: 'Access denied for user root@% (incorrect privilege mapping for DB table delete_records)', user_email: 'sec_agent@nl2q.io', ip_address: '172.16.89.14' },
    { id: 6, timestamp: '2026-06-07T04:15:32Z', severity: 'Info', action: 'Saved new SQL Snippet: Top Customers ranking', user_email: 'ram@nl2q.io', ip_address: '192.168.1.45' },
    { id: 7, timestamp: '2026-06-07T05:01:05Z', severity: 'Critical', action: 'SQL Safety layer intercepted dangerous execute: DROP TABLE products', user_email: 'ram@nl2q.io', ip_address: '192.168.1.45' },
    { id: 8, timestamp: '2026-06-07T05:20:45Z', severity: 'Info', action: 'Export generated successfully format=CSV size=820B', user_email: 'ram@nl2q.io', ip_address: '192.168.1.45' },
    { id: 9, timestamp: '2026-06-07T06:40:12Z', severity: 'Info', action: 'Interactive sandbox row addition recorded', user_email: 'ram@nl2q.io', ip_address: '192.168.1.45' }
  ]
};
