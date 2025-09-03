import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { performanceTestData, largeBatchData } from '../fixtures/testData';

test.describe('Performance Testing', () => {
  let pool: Pool;

  test.beforeAll(async () => {
    pool = new Pool({
      user: process.env.TEST_DB_USER || 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      database: process.env.TEST_DB_NAME || 'test_person_manager',
      password: process.env.TEST_DB_PASSWORD || 'password',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
    });
  });

  test.afterAll(async () => {
    await pool.end();
  });

  test.beforeEach(async ({ page }) => {
    await pool.query('DELETE FROM persons');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Search performance with large dataset', async ({ page, request }) => {
    // Insert large dataset
    console.log('Inserting performance test data...');
    
    // Use batch insert for better performance
    const values = performanceTestData.map((_, i) => 
      `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
    ).join(',');
    
    const params = performanceTestData.flatMap(person => [
      person.name, person.age, person.occupation, person.email, person.phone, person.address
    ]);

    await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ${values}
    `, params);

    console.log(`Inserted ${performanceTestData.length} records`);

    // Reload page to load data
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Measure search performance
    const startTime = Date.now();
    
    await page.fill('[data-testid="search-input"]', 'Performance Test User 1');
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const searchTime = endTime - startTime;

    console.log(`Search completed in ${searchTime}ms`);

    // Should complete search in reasonable time
    expect(searchTime).toBeLessThan(2000); // Less than 2 seconds

    // Should return correct results
    await expect(page.locator('[data-testid="person-row"]')).toHaveCount(1);
    await expect(page.locator('text=Performance Test User 1')).toBeVisible();
  });

  test('Pagination performance with large dataset', async ({ page }) => {
    // Insert test data
    const batchSize = 100;
    for (let i = 0; i < 500; i += batchSize) {
      const batch = performanceTestData.slice(i, Math.min(i + batchSize, 500));
      const values = batch.map((_, idx) => 
        `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`
      ).join(',');
      
      const params = batch.flatMap(person => [
        person.name, person.age, person.occupation, person.email, person.phone, person.address
      ]);

      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ${values}
      `, params);
    }

    console.log('Inserted 500 records for pagination testing');

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test first page load performance
    let startTime = Date.now();
    await page.waitForSelector('[data-testid="person-row"]');
    let pageLoadTime = Date.now() - startTime;

    console.log(`First page loaded in ${pageLoadTime}ms`);
    expect(pageLoadTime).toBeLessThan(1500);

    // Test pagination navigation performance
    for (let pageNum = 2; pageNum <= 5; pageNum++) {
      startTime = Date.now();
      await page.click('[data-testid="next-page-btn"]');
      await page.waitForLoadState('networkidle');
      const navTime = Date.now() - startTime;

      console.log(`Page ${pageNum} navigation took ${navTime}ms`);
      expect(navTime).toBeLessThan(1000); // Navigation should be fast
      
      await expect(page.locator('[data-testid="current-page"]')).toHaveText(pageNum.toString());
    }
  });

  test('Filtering performance with multiple criteria', async ({ page }) => {
    // Insert diverse test data
    const testData = [];
    for (let i = 0; i < 300; i++) {
      testData.push({
        name: `Test Person ${i}`,
        age: 20 + (i % 50),
        occupation: `Job ${i % 10}`,
        email: `test${i}@email.com`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        address: `${i} Test St`
      });
    }

    // Batch insert
    const values = testData.map((_, i) => 
      `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
    ).join(',');
    
    const params = testData.flatMap(person => [
      person.name, person.age, person.occupation, person.email, person.phone, person.address
    ]);

    await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ${values}
    `, params);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test multiple filter performance
    const startTime = Date.now();

    // Apply search filter
    await page.fill('[data-testid="search-input"]', 'Test Person');
    await page.waitForTimeout(300);

    // Apply age filter
    await page.fill('[data-testid="min-age-input"]', '30');
    await page.fill('[data-testid="max-age-input"]', '40');
    await page.waitForTimeout(300);

    // Apply sort
    await page.click('[data-testid="sort-age-btn"]');
    await page.waitForLoadState('networkidle');

    const filterTime = Date.now() - startTime;

    console.log(`Multi-filter operation took ${filterTime}ms`);
    expect(filterTime).toBeLessThan(3000); // Should complete in reasonable time

    // Verify results are filtered correctly
    const visibleRows = page.locator('[data-testid="person-row"]');
    const rowCount = await visibleRows.count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThan(300); // Should be filtered
  });

  test('Bulk operations performance', async ({ page, request }) => {
    // Insert test data
    for (const person of largeBatchData) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test bulk selection performance
    const startTime = Date.now();
    await page.check('[data-testid="select-all-checkbox"]');
    await page.waitForTimeout(100); // Allow UI to update

    const selectionTime = Date.now() - startTime;
    console.log(`Bulk selection took ${selectionTime}ms`);
    expect(selectionTime).toBeLessThan(1000);

    // Verify all are selected
    const checkboxes = page.locator('[data-testid="person-checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    // Check first few and last few (sampling for performance)
    await expect(checkboxes.first()).toBeChecked();
    await expect(checkboxes.last()).toBeChecked();

    // Test bulk delete performance
    const deleteStartTime = Date.now();
    await page.click('[data-testid="bulk-delete-btn"]');
    await page.click('[data-testid="confirm-bulk-delete-btn"]');
    await page.waitForLoadState('networkidle');

    const deleteTime = Date.now() - deleteStartTime;
    console.log(`Bulk delete took ${deleteTime}ms`);
    expect(deleteTime).toBeLessThan(5000); // Bulk operations can take longer

    // Verify deletion
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });

  test('Form performance with complex validation', async ({ page }) => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      await page.click('[data-testid="add-person-btn"]');
      await page.waitForSelector('[data-testid="person-form"]');

      // Fill form quickly
      await page.fill('[data-testid="name-input"]', `Test Person ${i}`);
      await page.fill('[data-testid="age-input"]', (20 + i).toString());
      await page.fill('[data-testid="occupation-input"]', `Job ${i}`);
      await page.fill('[data-testid="email-input"]', `test${i}@email.com`);
      await page.fill('[data-testid="phone-input"]', `+1-555-${String(i).padStart(4, '0')}`);
      await page.fill('[data-testid="address-input"]', `${i} Test St`);

      await page.click('[data-testid="save-person-btn"]');
      await page.waitForSelector('[data-testid="success-message"]');
      await page.waitForSelector('[data-testid="person-form"]', { state: 'hidden' });

      const endTime = Date.now();
      times.push(endTime - startTime);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`Form operations - Average: ${averageTime}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);

    // Performance should be consistent
    expect(averageTime).toBeLessThan(2000);
    expect(maxTime).toBeLessThan(3000);
  });

  test('Memory usage during large operations', async ({ page }) => {
    // This test monitors memory usage during operations
    let initialMemory: any;
    let peakMemory: any;

    // Get initial memory usage
    initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (!initialMemory) {
      console.log('Memory API not available, skipping memory test');
      return;
    }

    // Add large dataset
    for (let i = 0; i < 200; i++) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [`Test Person ${i}`, 20 + i, `Job ${i}`, `test${i}@email.com`, `+1-555-${String(i).padStart(4, '0')}`, `${i} Test St`]);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Monitor memory during operations
    const memoryChecks = [];

    for (let i = 0; i < 5; i++) {
      // Perform memory-intensive operations
      await page.fill('[data-testid="search-input"]', `Test Person ${i * 20}`);
      await page.waitForTimeout(500);
      
      await page.fill('[data-testid="search-input"]', '');
      await page.waitForTimeout(500);

      const currentMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      if (currentMemory) {
        memoryChecks.push(currentMemory);
      }
    }

    if (memoryChecks.length > 0) {
      const memoryIncrease = Math.max(...memoryChecks.map(m => m.usedJSHeapSize)) - initialMemory.usedJSHeapSize;
      console.log(`Memory increase during operations: ${memoryIncrease / 1024 / 1024}MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    }
  });

  test('API response time performance', async ({ page, request }) => {
    const responseTimes: number[] = [];

    // Test API response times
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      
      const response = await request.get('/api/persons?limit=10');
      expect(response.status()).toBe(200);
      
      const endTime = Date.now();
      responseTimes.push(endTime - startTime);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    console.log(`API Response times - Average: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);

    // API should respond quickly
    expect(avgResponseTime).toBeLessThan(500);
    expect(maxResponseTime).toBeLessThan(1000);
  });

  test('Database query performance with indexes', async ({ page }) => {
    // Insert large dataset with diverse data for index testing
    const testData = [];
    for (let i = 0; i < 1000; i++) {
      testData.push({
        name: `Person ${String(i).padStart(4, '0')}`,
        age: 18 + (i % 60),
        occupation: `Occupation ${i % 20}`,
        email: `person${i}@company${i % 10}.com`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        address: `${i} Street ${i % 100}, City ${i % 10}`
      });
    }

    console.log('Inserting 1000 records for index performance testing...');

    // Batch insert in chunks
    const chunkSize = 100;
    for (let i = 0; i < testData.length; i += chunkSize) {
      const chunk = testData.slice(i, i + chunkSize);
      const values = chunk.map((_, idx) => 
        `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`
      ).join(',');
      
      const params = chunk.flatMap(person => [
        person.name, person.age, person.occupation, person.email, person.phone, person.address
      ]);

      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ${values}
      `, params);
    }

    // Test various query patterns that should use indexes
    const queryTests = [
      { name: 'Name search', search: 'Person 0001' },
      { name: 'Occupation search', search: 'Occupation 5' },
      { name: 'Email search', search: 'person500@' },
    ];

    await page.reload();
    await page.waitForLoadState('networkidle');

    for (const queryTest of queryTests) {
      const startTime = Date.now();
      
      await page.fill('[data-testid="search-input"]', queryTest.search);
      await page.waitForLoadState('networkidle');
      
      const queryTime = Date.now() - startTime;
      
      console.log(`${queryTest.name} query took ${queryTime}ms`);
      expect(queryTime).toBeLessThan(1500); // Should be fast with indexes

      // Clear search for next test
      await page.fill('[data-testid="search-input"]', '');
      await page.waitForTimeout(300);
    }
  });

  test('Concurrent user simulation', async ({ browser }) => {
    // Simulate multiple concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    try {
      // Add some base data
      for (let i = 0; i < 50; i++) {
        await pool.query(`
          INSERT INTO persons (name, age, occupation, email, phone, address)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [`Concurrent User ${i}`, 25 + i, `Job ${i}`, `concurrent${i}@test.com`, `+1-555-${String(i).padStart(4, '0')}`, `${i} Concurrent St`]);
      }

      // Simulate concurrent operations
      const operations = pages.map(async (page, index) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const startTime = Date.now();

        // Each "user" performs different operations
        switch (index) {
          case 0:
            // User 1: Search operations
            for (let i = 0; i < 5; i++) {
              await page.fill('[data-testid="search-input"]', `Concurrent User ${i * 10}`);
              await page.waitForTimeout(300);
            }
            break;

          case 1:
            // User 2: Create operations
            for (let i = 0; i < 3; i++) {
              await page.click('[data-testid="add-person-btn"]');
              await page.fill('[data-testid="name-input"]', `New User ${index}-${i}`);
              await page.fill('[data-testid="age-input"]', (30 + i).toString());
              await page.fill('[data-testid="occupation-input"]', `Job ${i}`);
              await page.fill('[data-testid="email-input"]', `new${index}${i}@test.com`);
              await page.click('[data-testid="save-person-btn"]');
              await page.waitForSelector('[data-testid="success-message"]');
              await page.waitForSelector('[data-testid="person-form"]', { state: 'hidden' });
            }
            break;

          case 2:
            // User 3: Filter and pagination
            await page.fill('[data-testid="min-age-input"]', '30');
            await page.waitForTimeout(500);
            await page.click('[data-testid="next-page-btn"]');
            await page.waitForLoadState('networkidle');
            break;
        }

        return Date.now() - startTime;
      });

      const operationTimes = await Promise.all(operations);

      console.log('Concurrent operation times:', operationTimes);

      // All operations should complete in reasonable time even with concurrency
      operationTimes.forEach((time, index) => {
        expect(time).toBeLessThan(10000); // 10 seconds max
      });

    } finally {
      await Promise.all(contexts.map(ctx => ctx.close()));
    }
  });
});