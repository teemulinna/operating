import { DatabaseService } from '../src/database/database.service';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/employee_management_test';

// Global setup
beforeAll(async () => {
  const db = DatabaseService.getInstance();
  await db.connect();
});

// Global teardown
afterAll(async () => {
  await DatabaseService.disconnect();
});

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};