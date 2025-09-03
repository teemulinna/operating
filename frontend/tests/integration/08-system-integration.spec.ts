import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { mockPersons, performanceTestData } from '../fixtures/testData';

test.describe('System Integration Tests - Complete End-to-End Verification', () => {
  let pool: Pool;

  test.beforeAll(async () => {
    pool = new Pool({
      user: process.env.TEST_DB_USER || 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      database: process.env.TEST_DB_NAME || 'test_person_manager',
      password: process.env.TEST_DB_PASSWORD || 'password',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
    });

    // Verify database schema is correct
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'persons'
      ORDER BY ordinal_position
    `);

    const expectedColumns = ['id', 'name', 'age', 'occupation', 'email', 'phone', 'address', 'created_at', 'updated_at'];
    const actualColumns = schemaResult.rows.map(row => row.column_name);
    
    expectedColumns.forEach(col => {
      expect(actualColumns).toContain(col);
    });

    console.log('✅ Database schema verified');
  });

  test.afterAll(async () => {
    await pool.end();
  });

  test.beforeEach(async ({ page }) => {
    await pool.query('DELETE FROM persons');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Full system smoke test: All components work together', async ({ page, request }) => {
    console.log('🔥 Running system smoke test...');

    // 1. Verify API health
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.status()).toBe(200);

    // 2. Verify database connection via API
    const dbHealthResponse = await request.get('/api/health/db');
    expect(dbHealthResponse.status()).toBe(200);

    // 3. Verify frontend loads correctly
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="person-manager"]')).toBeVisible();

    // 4. Test basic CRUD through the full stack
    const person = mockPersons[0];

    // CREATE
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', person.name);
    await page.fill('[data-testid="age-input"]', person.age.toString());
    await page.fill('[data-testid="occupation-input"]', person.occupation);
    await page.fill('[data-testid="email-input"]', person.email);
    await page.fill('[data-testid="phone-input"]', person.phone || '');
    await page.fill('[data-testid="address-input"]', person.address || '');
    await page.click('[data-testid="save-person-btn"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // READ - verify in UI
    await expect(page.locator(`text=${person.name}`)).toBeVisible();

    // READ - verify in API
    const getResponse = await request.get('/api/persons');
    const apiData = await getResponse.json();
    expect(apiData.data).toHaveLength(1);
    expect(apiData.data[0].name).toBe(person.name);

    // READ - verify in database
    const dbResult = await pool.query('SELECT * FROM persons WHERE email = $1', [person.email]);
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].name).toBe(person.name);

    const personId = dbResult.rows[0].id;

    // UPDATE
    await page.click(`[data-testid="edit-person-btn"]:near([data-testid="person-row"]:has-text("${person.name}"))`);
    const updatedName = `${person.name} Updated`;
    await page.fill('[data-testid="name-input"]', updatedName);
    await page.click('[data-testid="save-person-btn"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();

    // Verify update in database
    const updateResult = await pool.query('SELECT * FROM persons WHERE id = $1', [personId]);
    expect(updateResult.rows[0].name).toBe(updatedName);

    // DELETE
    await page.click(`[data-testid="delete-person-btn"]:near([data-testid="person-row"]:has-text("${updatedName}"))`);
    await page.click('[data-testid="confirm-delete-btn"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();

    // Verify deletion in database
    const deleteResult = await pool.query('SELECT * FROM persons WHERE id = $1', [personId]);
    expect(deleteResult.rows).toHaveLength(0);

    console.log('✅ System smoke test passed');
  });

  test('Data consistency across all layers', async ({ page, request }) => {
    console.log('🔍 Testing data consistency...');

    // Insert data via API
    const person1 = mockPersons[0];
    const createResponse = await request.post('/api/persons', { data: person1 });
    const apiPerson = await createResponse.json();

    // Insert data via database directly
    const person2 = mockPersons[1];
    const dbResult = await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [person2.name, person2.age, person2.occupation, person2.email, person2.phone, person2.address]);
    const dbPerson = dbResult.rows[0];

    // Refresh frontend
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify both persons appear in UI
    await expect(page.locator(`text=${person1.name}`)).toBeVisible();
    await expect(page.locator(`text=${person2.name}`)).toBeVisible();

    // Verify via API
    const listResponse = await request.get('/api/persons');
    const listData = await listResponse.json();
    expect(listData.data).toHaveLength(2);

    const apiNames = listData.data.map((p: any) => p.name);
    expect(apiNames).toContain(person1.name);
    expect(apiNames).toContain(person2.name);

    // Verify timestamps are consistent
    expect(apiPerson.created_at).toBeDefined();
    expect(apiPerson.updated_at).toBeDefined();
    expect(new Date(apiPerson.created_at)).toBeInstanceOf(Date);

    // Update via UI and verify consistency
    await page.click(`[data-testid="edit-person-btn"]:near([data-testid="person-row"]:has-text("${person1.name}"))`);
    const updatedName = `${person1.name} - Consistency Test`;
    await page.fill('[data-testid="name-input"]', updatedName);
    await page.click('[data-testid="save-person-btn"]');

    // Wait for update
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Verify update in all layers
    await expect(page.locator(`text=${updatedName}`)).toBeVisible(); // UI

    const updatedApiResponse = await request.get(`/api/persons/${apiPerson.id}`); // API
    const updatedApiData = await updatedApiResponse.json();
    expect(updatedApiData.name).toBe(updatedName);

    const updatedDbResult = await pool.query('SELECT * FROM persons WHERE id = $1', [apiPerson.id]); // DB
    expect(updatedDbResult.rows[0].name).toBe(updatedName);
    expect(updatedDbResult.rows[0].updated_at).not.toEqual(updatedDbResult.rows[0].created_at);

    console.log('✅ Data consistency verified');
  });

  test('System performance under concurrent load', async ({ browser }) => {
    console.log('⚡ Testing system under load...');

    // Add base data
    for (let i = 0; i < 50; i++) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [`Load Test User ${i}`, 25 + (i % 40), `Job ${i % 5}`, `load${i}@test.com`, `+1-555-${String(i).padStart(4, '0')}`, `${i} Load St`]);
    }

    // Create multiple browser contexts to simulate concurrent users
    const contexts = [];
    const pages = [];

    try {
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }

      const startTime = Date.now();

      // Simulate concurrent operations
      const operations = pages.map(async (page, index) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Different operations per user
        switch (index % 3) {
          case 0:
            // Search operations
            for (let i = 0; i < 3; i++) {
              await page.fill('[data-testid="search-input"]', `Load Test User ${i * 5}`);
              await page.waitForTimeout(200);
            }
            break;

          case 1:
            // Create operations
            await page.click('[data-testid="add-person-btn"]');
            await page.fill('[data-testid="name-input"]', `Concurrent User ${index}`);
            await page.fill('[data-testid="age-input"]', (30 + index).toString());
            await page.fill('[data-testid="occupation-input"]', `Concurrent Job ${index}`);
            await page.fill('[data-testid="email-input"]', `concurrent${index}@test.com`);
            await page.click('[data-testid="save-person-btn"]');
            await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
            break;

          case 2:
            // Pagination operations
            for (let i = 0; i < 3; i++) {
              if (await page.locator('[data-testid="next-page-btn"]').isEnabled()) {
                await page.click('[data-testid="next-page-btn"]');
                await page.waitForLoadState('networkidle');
              }
            }
            break;
        }

        return Date.now();
      });

      const endTimes = await Promise.all(operations);
      const totalTime = Math.max(...endTimes) - startTime;

      console.log(`Concurrent operations completed in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify system integrity after load
      const finalCount = await pool.query('SELECT COUNT(*) FROM persons');
      expect(parseInt(finalCount.rows[0].count)).toBeGreaterThan(50); // Base + created

    } finally {
      await Promise.all(contexts.map(ctx => ctx.close()));
    }

    console.log('✅ System performance test passed');
  });

  test('Error propagation and recovery across layers', async ({ page, context }) => {
    console.log('🚨 Testing error handling...');

    // Test 1: Database constraint error propagation
    const person = mockPersons[0];
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', person.name);
    await page.fill('[data-testid="age-input"]', person.age.toString());
    await page.fill('[data-testid="occupation-input"]', person.occupation);
    await page.fill('[data-testid="email-input"]', person.email);
    await page.click('[data-testid="save-person-btn"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Try to create duplicate
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', 'Different Name');
    await page.fill('[data-testid="age-input"]', '35');
    await page.fill('[data-testid="occupation-input"]', 'Different Job');
    await page.fill('[data-testid="email-input"]', person.email); // Duplicate email
    await page.click('[data-testid="save-person-btn"]');

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('already exists');

    // Test 2: Network error handling
    await context.route('**/api/persons', route => route.abort('failed'));

    await page.fill('[data-testid="email-input"]', 'unique@email.com');
    await page.click('[data-testid="save-person-btn"]');

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');

    // Test 3: Recovery after network restoration
    await context.unroute('**/api/persons');
    
    await page.click('[data-testid="retry-btn"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    console.log('✅ Error handling test passed');
  });

  test('Security and data validation across all entry points', async ({ page, request }) => {
    console.log('🔒 Testing security measures...');

    // Test 1: Input sanitization
    const maliciousInput = '<script>alert("XSS")</script>';
    
    await page.click('[data-testid="add-person-btn"]');
    await page.fill('[data-testid="name-input"]', maliciousInput);
    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="occupation-input"]', 'Test');
    await page.fill('[data-testid="email-input"]', 'test@email.com');
    await page.click('[data-testid="save-person-btn"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Verify XSS is prevented - script should not execute
    // Instead, it should be treated as plain text
    const displayedContent = await page.locator('[data-testid="person-row"]').first().textContent();
    expect(displayedContent).not.toContain('<script>');

    // Test 2: SQL injection prevention via API
    const sqlInjection = "'; DROP TABLE persons; --";
    const sqlResponse = await request.get(`/api/persons?search=${encodeURIComponent(sqlInjection)}`);
    expect(sqlResponse.status()).not.toBe(500); // Should not cause server error

    // Verify table still exists
    const tableCheck = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'persons'");
    expect(tableCheck.rows).toHaveLength(1);

    // Test 3: Input validation
    const invalidData = {
      name: '',
      age: -1,
      occupation: 'Test',
      email: 'invalid-email',
      phone: 'invalid-phone',
      address: 'Test'
    };

    const validationResponse = await request.post('/api/persons', { data: invalidData });
    expect(validationResponse.status()).toBe(400);

    const validationError = await validationResponse.json();
    expect(validationError.message).toBeDefined();

    console.log('✅ Security test passed');
  });

  test('System backup and recovery simulation', async ({ page }) => {
    console.log('💾 Testing backup/recovery scenario...');

    // Add test data
    for (const person of mockPersons.slice(0, 3)) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify data is present
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);

    // Simulate backup by exporting data
    const backupData = await pool.query('SELECT * FROM persons ORDER BY id');
    const backup = backupData.rows;

    // Simulate system failure by clearing data
    await pool.query('DELETE FROM persons');

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify data is gone
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Simulate recovery by restoring data
    for (const record of backup) {
      await pool.query(`
        INSERT INTO persons (id, name, age, occupation, email, phone, address, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [record.id, record.name, record.age, record.occupation, record.email, record.phone, record.address, record.created_at, record.updated_at]);
    }

    // Reset sequence
    await pool.query('SELECT setval(pg_get_serial_sequence(\'persons\', \'id\'), (SELECT MAX(id) FROM persons))');

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify recovery
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(3);
    for (const person of mockPersons.slice(0, 3)) {
      await expect(page.locator(`text=${person.name}`)).toBeVisible();
    }

    console.log('✅ Backup/recovery test passed');
  });

  test('System monitoring and health checks', async ({ page, request }) => {
    console.log('📊 Testing system monitoring...');

    // Test API health endpoints
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    expect(healthData.timestamp).toBeDefined();

    // Test database health
    const dbHealthResponse = await request.get('/api/health/database');
    if (dbHealthResponse.status() === 200) {
      const dbHealthData = await dbHealthResponse.json();
      expect(dbHealthData.database).toBe('connected');
    }

    // Test metrics endpoint
    const metricsResponse = await request.get('/api/metrics');
    if (metricsResponse.status() === 200) {
      const metricsData = await metricsResponse.json();
      expect(metricsData.uptime).toBeDefined();
      expect(metricsData.requests_total).toBeDefined();
    }

    // Verify frontend error boundary
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000); // Allow time for any errors

    // Filter out expected/acceptable errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon.ico') && 
      !error.includes('Development mode') &&
      !error.includes('WebSocket')
    );

    if (criticalErrors.length > 0) {
      console.warn('Console errors detected:', criticalErrors);
    }

    console.log('✅ System monitoring test completed');
  });

  test('End-to-end performance benchmark', async ({ page }) => {
    console.log('🏁 Running performance benchmark...');

    const metrics = {
      pageLoad: 0,
      dataLoad: 0,
      crud: [],
      search: [],
      pagination: []
    };

    // Page load performance
    const pageLoadStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    metrics.pageLoad = Date.now() - pageLoadStart;

    // Data load performance
    for (let i = 0; i < 100; i++) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [`Perf User ${i}`, 25 + (i % 40), `Job ${i % 10}`, `perf${i}@test.com`, `+1-555-${String(i).padStart(4, '0')}`, `${i} Perf St`]);
    }

    const dataLoadStart = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    metrics.dataLoad = Date.now() - dataLoadStart;

    // CRUD operations performance
    for (let i = 0; i < 3; i++) {
      const crudStart = Date.now();
      
      // Create
      await page.click('[data-testid="add-person-btn"]');
      await page.fill('[data-testid="name-input"]', `CRUD Test ${i}`);
      await page.fill('[data-testid="age-input"]', (30 + i).toString());
      await page.fill('[data-testid="occupation-input"]', `CRUD Job ${i}`);
      await page.fill('[data-testid="email-input"]', `crud${i}@test.com`);
      await page.click('[data-testid="save-person-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      metrics.crud.push(Date.now() - crudStart);
    }

    // Search performance
    for (let i = 0; i < 5; i++) {
      const searchStart = Date.now();
      await page.fill('[data-testid="search-input"]', `Perf User ${i * 10}`);
      await page.waitForLoadState('networkidle');
      metrics.search.push(Date.now() - searchStart);
    }

    // Pagination performance
    await page.fill('[data-testid="search-input"]', ''); // Clear search
    await page.waitForTimeout(300);

    for (let i = 0; i < 3; i++) {
      const pageStart = Date.now();
      if (await page.locator('[data-testid="next-page-btn"]').isEnabled()) {
        await page.click('[data-testid="next-page-btn"]');
        await page.waitForLoadState('networkidle');
        metrics.pagination.push(Date.now() - pageStart);
      }
    }

    // Log performance results
    console.log('📈 Performance Metrics:');
    console.log(`Page Load: ${metrics.pageLoad}ms`);
    console.log(`Data Load (100 records): ${metrics.dataLoad}ms`);
    console.log(`CRUD Operations (avg): ${metrics.crud.reduce((a, b) => a + b, 0) / metrics.crud.length}ms`);
    console.log(`Search Operations (avg): ${metrics.search.reduce((a, b) => a + b, 0) / metrics.search.length}ms`);
    console.log(`Pagination (avg): ${metrics.pagination.reduce((a, b) => a + b, 0) / metrics.pagination.length}ms`);

    // Performance assertions
    expect(metrics.pageLoad).toBeLessThan(3000); // 3 seconds
    expect(metrics.dataLoad).toBeLessThan(2000); // 2 seconds
    expect(metrics.crud.every(time => time < 3000)).toBe(true); // 3 seconds per CRUD op
    expect(metrics.search.every(time => time < 2000)).toBe(true); // 2 seconds per search
    expect(metrics.pagination.every(time => time < 1500)).toBe(true); // 1.5 seconds per page

    console.log('✅ Performance benchmark completed');
  });
});