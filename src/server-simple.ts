import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3001;

// Simple database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'employee_management',
  user: process.env.DB_USER || 'teemulinna',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple employees endpoint
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

// Simple projects endpoint  
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// Simple allocations endpoint
app.get('/api/allocations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        e.name as employee_name,
        p.name as project_name
      FROM resource_allocations a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN projects p ON a.project_id = p.id
      ORDER BY a.start_date DESC 
      LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch allocations' });
  }
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`Simple backend server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Employees API: http://localhost:${PORT}/api/employees`);
      console.log(`Projects API: http://localhost:${PORT}/api/projects`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();