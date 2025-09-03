import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { csvTestData, mockPersons } from '../fixtures/testData';
import fs from 'fs';
import path from 'path';

test.describe('CSV Import/Export End-to-End', () => {
  let pool: Pool;
  const testFilesDir = path.join(__dirname, '../fixtures/csv-files');

  test.beforeAll(async () => {
    pool = new Pool({
      user: process.env.TEST_DB_USER || 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      database: process.env.TEST_DB_NAME || 'test_person_manager',
      password: process.env.TEST_DB_PASSWORD || 'password',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
    });

    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  test.afterAll(async () => {
    await pool.end();
    
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await pool.query('DELETE FROM persons');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete CSV import workflow: File upload → Parse → Validate → Database insert → UI update', async ({ page }) => {
    // Create test CSV file
    const csvFilePath = path.join(testFilesDir, 'test-import.csv');
    fs.writeFileSync(csvFilePath, csvTestData);

    // Step 1: User clicks import button
    await page.click('[data-testid="import-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-import-modal"]');

    // Step 2: User selects CSV file
    const fileInput = page.locator('[data-testid="csv-file-input"]');
    await fileInput.setInputFiles(csvFilePath);

    // Step 3: Preview should show parsed data
    await page.waitForSelector('[data-testid="csv-preview-table"]');
    
    // Verify preview shows correct data
    const previewRows = page.locator('[data-testid="csv-preview-row"]');
    await expect(previewRows).toHaveCount(3);
    await expect(page.locator('[data-testid="csv-preview-table"]')).toContainText('CSV User 1');
    await expect(page.locator('[data-testid="csv-preview-table"]')).toContainText('csv1@email.com');

    // Step 4: Verify column mapping is correct
    await expect(page.locator('[data-testid="column-mapping-name"]')).toHaveValue('name');
    await expect(page.locator('[data-testid="column-mapping-email"]')).toHaveValue('email');
    await expect(page.locator('[data-testid="column-mapping-age"]')).toHaveValue('age');

    // Step 5: Start import process
    await page.click('[data-testid="start-import-btn"]');
    
    // Step 6: Wait for import completion
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="csv-import-modal"]')).not.toBeVisible();

    // Step 7: Verify data appears in UI
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);
    await expect(page.locator('text=CSV User 1')).toBeVisible();
    await expect(page.locator('text=csv1@email.com')).toBeVisible();

    // Step 8: Verify data was inserted into database
    const dbResult = await pool.query('SELECT * FROM persons ORDER BY name');
    expect(dbResult.rows).toHaveLength(3);
    expect(dbResult.rows[0].name).toBe('CSV User 1');
    expect(dbResult.rows[0].email).toBe('csv1@email.com');
    expect(dbResult.rows[0].age).toBe(25);
  });

  test('CSV import validation and error handling', async ({ page }) => {
    // Create CSV with invalid data
    const invalidCsvData = `name,age,occupation,email,phone,address
"Valid User",25,"Developer","valid@email.com","+1-555-0001","123 Valid St"
"",30,"Designer","invalid1@email.com","+1-555-0002","456 Invalid St"
"Invalid Age User",-5,"Manager","invalid2@email.com","+1-555-0003","789 Invalid St"
"Invalid Email User",35,"Analyst","not-an-email","+1-555-0004","321 Invalid St"`;

    const csvFilePath = path.join(testFilesDir, 'invalid-import.csv');
    fs.writeFileSync(csvFilePath, invalidCsvData);

    // Upload invalid CSV
    await page.click('[data-testid="import-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-import-modal"]');
    
    const fileInput = page.locator('[data-testid="csv-file-input"]');
    await fileInput.setInputFiles(csvFilePath);
    
    await page.waitForSelector('[data-testid="csv-preview-table"]');
    
    // Start import process
    await page.click('[data-testid="start-import-btn"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="import-errors"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-errors"]')).toContainText('Empty name');
    await expect(page.locator('[data-testid="import-errors"]')).toContainText('Invalid age');
    await expect(page.locator('[data-testid="import-errors"]')).toContainText('Invalid email');

    // Should show partial import results
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('1 successful');
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('3 failed');

    // Only valid record should be imported
    await page.click('[data-testid="close-import-modal-btn"]');
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(1);
    await expect(page.locator('text=Valid User')).toBeVisible();

    // Verify database has only valid record
    const dbResult = await pool.query('SELECT * FROM persons');
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].name).toBe('Valid User');
  });

  test('CSV export workflow: Database → API → CSV generation → File download', async ({ page }) => {
    // Setup: Add test data to database
    for (const person of mockPersons.slice(0, 3)) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 1: User clicks export button
    await page.click('[data-testid="export-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-export-modal"]');

    // Step 2: User configures export options
    await page.check('[data-testid="export-include-name"]');
    await page.check('[data-testid="export-include-age"]');
    await page.check('[data-testid="export-include-occupation"]');
    await page.check('[data-testid="export-include-email"]');
    await page.check('[data-testid="export-include-phone"]');
    await page.check('[data-testid="export-include-address"]');

    // Step 3: Start export process
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="start-export-btn"]');

    // Step 4: Wait for file download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('persons-export.csv');

    // Step 5: Verify downloaded file content
    const downloadPath = path.join(testFilesDir, 'downloaded-export.csv');
    await download.saveAs(downloadPath);

    const downloadedContent = fs.readFileSync(downloadPath, 'utf-8');
    
    // Verify CSV structure and content
    const lines = downloadedContent.trim().split('\n');
    expect(lines).toHaveLength(4); // Header + 3 data rows
    
    const header = lines[0];
    expect(header).toContain('name,age,occupation,email,phone,address');
    
    // Verify data rows contain expected information
    expect(downloadedContent).toContain('John Doe');
    expect(downloadedContent).toContain('john.doe@email.com');
    expect(downloadedContent).toContain('Software Engineer');
  });

  test('CSV export with filters applied', async ({ page }) => {
    // Add diverse test data
    const testData = [
      { name: 'Young Engineer', age: 25, occupation: 'Software Engineer', email: 'young@eng.com', phone: '+1-555-0001', address: '123 Young St' },
      { name: 'Senior Engineer', age: 45, occupation: 'Software Engineer', email: 'senior@eng.com', phone: '+1-555-0002', address: '456 Senior St' },
      { name: 'Data Scientist', age: 35, occupation: 'Data Scientist', email: 'data@sci.com', phone: '+1-555-0003', address: '789 Data St' },
    ];

    for (const person of testData) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Apply filter before export
    await page.fill('[data-testid="search-input"]', 'Engineer');
    await page.waitForTimeout(500);

    // Should show only engineers
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(2);

    // Export filtered data
    await page.click('[data-testid="export-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-export-modal"]');

    // Should show export options for filtered data
    await expect(page.locator('[data-testid="export-record-count"]')).toContainText('2 records');

    await page.check('[data-testid="export-include-name"]');
    await page.check('[data-testid="export-include-occupation"]');
    await page.check('[data-testid="export-include-email"]');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="start-export-btn"]');

    const download = await downloadPromise;
    const downloadPath = path.join(testFilesDir, 'filtered-export.csv');
    await download.saveAs(downloadPath);

    const downloadedContent = fs.readFileSync(downloadPath, 'utf-8');
    
    // Should contain only engineers
    expect(downloadedContent).toContain('Young Engineer');
    expect(downloadedContent).toContain('Senior Engineer');
    expect(downloadedContent).not.toContain('Data Scientist');

    // Should have 3 lines (header + 2 data rows)
    const lines = downloadedContent.trim().split('\n');
    expect(lines).toHaveLength(3);
  });

  test('Large CSV import performance and progress tracking', async ({ page }) => {
    // Create large CSV file
    let largeCsvData = 'name,age,occupation,email,phone,address\n';
    for (let i = 1; i <= 500; i++) {
      largeCsvData += `"Large Import User ${i}",${20 + (i % 50)},"Job ${i % 10}","large${i}@import.com","+1-555-${String(i).padStart(4, '0')}","${i} Large St"\n`;
    }

    const largeCsvPath = path.join(testFilesDir, 'large-import.csv');
    fs.writeFileSync(largeCsvPath, largeCsvData);

    // Upload large CSV
    await page.click('[data-testid="import-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-import-modal"]');
    
    const fileInput = page.locator('[data-testid="csv-file-input"]');
    await fileInput.setInputFiles(largeCsvPath);
    
    await page.waitForSelector('[data-testid="csv-preview-table"]');
    
    // Should show preview of first few rows
    const previewRows = page.locator('[data-testid="csv-preview-row"]');
    await expect(previewRows).toHaveCount(5); // Preview limit
    
    // Should show total record count
    await expect(page.locator('[data-testid="csv-total-records"]')).toContainText('500 records');

    // Start import
    await page.click('[data-testid="start-import-btn"]');
    
    // Should show progress bar
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-progress-text"]')).toBeVisible();

    // Wait for completion (may take longer)
    await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible({ timeout: 30000 });
    
    // Should show completion summary
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('500 successful');
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('0 failed');

    await page.click('[data-testid="close-import-modal-btn"]');

    // Verify database contains all records
    const countResult = await pool.query('SELECT COUNT(*) FROM persons');
    expect(parseInt(countResult.rows[0].count)).toBe(500);
  });

  test('CSV import with duplicate handling', async ({ page }) => {
    // First, add existing data
    await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['Existing User', 30, 'Existing Job', 'existing@email.com', '+1-555-0000', '000 Existing St']);

    // Create CSV with duplicate and new data
    const duplicateCsvData = `name,age,occupation,email,phone,address
"New User 1",25,"Developer","new1@email.com","+1-555-0001","123 New St"
"Existing User",35,"Updated Job","existing@email.com","+1-555-0002","456 Updated St"
"New User 2",28,"Designer","new2@email.com","+1-555-0003","789 New St"`;

    const csvFilePath = path.join(testFilesDir, 'duplicate-import.csv');
    fs.writeFileSync(csvFilePath, duplicateCsvData);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify existing data
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(1);
    await expect(page.locator('text=Existing User')).toBeVisible();

    // Import CSV with duplicates
    await page.click('[data-testid="import-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-import-modal"]');
    
    const fileInput = page.locator('[data-testid="csv-file-input"]');
    await fileInput.setInputFiles(csvFilePath);
    
    await page.waitForSelector('[data-testid="csv-preview-table"]');

    // Select duplicate handling strategy
    await page.selectOption('[data-testid="duplicate-handling-select"]', 'skip');
    
    await page.click('[data-testid="start-import-btn"]');
    
    // Should show import results with duplicate handling
    await expect(page.locator('[data-testid="import-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('2 successful'); // New users
    await expect(page.locator('[data-testid="import-summary"]')).toContainText('1 skipped'); // Duplicate

    await page.click('[data-testid="close-import-modal-btn"]');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should have original + 2 new users = 3 total
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);
    await expect(page.locator('text=New User 1')).toBeVisible();
    await expect(page.locator('text=New User 2')).toBeVisible();
    
    // Original user should be unchanged
    await expect(page.locator('text=Existing Job')).toBeVisible(); // Original occupation
  });

  test('CSV export with custom formatting and date fields', async ({ page }) => {
    // Add data with created_at timestamps
    const person = mockPersons[0];
    await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [person.name, person.age, person.occupation, person.email, person.phone, person.address, new Date('2023-01-15T10:30:00Z')]);

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="export-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-export-modal"]');

    // Configure export with date formatting
    await page.check('[data-testid="export-include-name"]');
    await page.check('[data-testid="export-include-email"]');
    await page.check('[data-testid="export-include-created-date"]');
    
    await page.selectOption('[data-testid="date-format-select"]', 'YYYY-MM-DD');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="start-export-btn"]');

    const download = await downloadPromise;
    const downloadPath = path.join(testFilesDir, 'formatted-export.csv');
    await download.saveAs(downloadPath);

    const downloadedContent = fs.readFileSync(downloadPath, 'utf-8');
    
    // Should contain formatted date
    expect(downloadedContent).toContain('2023-01-15');
    expect(downloadedContent).toContain(person.name);
    expect(downloadedContent).toContain(person.email);
  });

  test('Error recovery during CSV operations', async ({ page, context }) => {
    const csvData = `name,age,occupation,email,phone,address
"Test User 1",25,"Developer","test1@email.com","+1-555-0001","123 Test St"
"Test User 2",30,"Designer","test2@email.com","+1-555-0002","456 Test St"`;

    const csvFilePath = path.join(testFilesDir, 'error-test.csv');
    fs.writeFileSync(csvFilePath, csvData);

    // Mock API failure during import
    await context.route('**/api/persons/import', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error during import' })
      });
    });

    await page.click('[data-testid="import-csv-btn"]');
    await page.waitForSelector('[data-testid="csv-import-modal"]');
    
    const fileInput = page.locator('[data-testid="csv-file-input"]');
    await fileInput.setInputFiles(csvFilePath);
    
    await page.waitForSelector('[data-testid="csv-preview-table"]');
    await page.click('[data-testid="start-import-btn"]');

    // Should show error message
    await expect(page.locator('[data-testid="import-error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-error-message"]')).toContainText('Server error');

    // Should allow retry
    await expect(page.locator('[data-testid="retry-import-btn"]')).toBeVisible();

    // Remove the route mock to allow retry to succeed
    await context.unroute('**/api/persons/import');

    await page.click('[data-testid="retry-import-btn"]');
    
    // Should succeed on retry
    await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible({ timeout: 10000 });
  });
});