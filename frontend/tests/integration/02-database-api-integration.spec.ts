import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { mockPersons, largeBatchData } from '../fixtures/testData';

test.describe('Database to API Integration', () => {
  let pool: Pool;

  test.beforeAll(async () => {
    // Setup database connection
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

  test.beforeEach(async () => {
    // Clean database before each test
    await pool.query('DELETE FROM persons');
  });

  test('API creates person and stores correctly in database', async ({ request }) => {
    const person = mockPersons[0];

    // Create person via API
    const response = await request.post('/api/persons', {
      data: person
    });

    expect(response.status()).toBe(201);
    const createdPerson = await response.json();
    expect(createdPerson.id).toBeDefined();
    expect(createdPerson.name).toBe(person.name);

    // Verify in database
    const dbResult = await pool.query('SELECT * FROM persons WHERE id = $1', [createdPerson.id]);
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].name).toBe(person.name);
    expect(dbResult.rows[0].email).toBe(person.email);
    expect(dbResult.rows[0].age).toBe(person.age);
  });

  test('API retrieves person correctly from database', async ({ request }) => {
    // Insert person directly into database
    const person = mockPersons[0];
    const dbResult = await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);

    const insertedPerson = dbResult.rows[0];

    // Retrieve via API
    const response = await request.get(`/api/persons/${insertedPerson.id}`);
    expect(response.status()).toBe(200);

    const retrievedPerson = await response.json();
    expect(retrievedPerson.id).toBe(insertedPerson.id);
    expect(retrievedPerson.name).toBe(person.name);
    expect(retrievedPerson.email).toBe(person.email);
  });

  test('API updates person and reflects changes in database', async ({ request }) => {
    // Insert person
    const person = mockPersons[0];
    const dbResult = await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);

    const insertedPerson = dbResult.rows[0];

    // Update via API
    const updatedData = {
      ...person,
      name: 'Updated Name',
      age: 35
    };

    const updateResponse = await request.put(`/api/persons/${insertedPerson.id}`, {
      data: updatedData
    });

    expect(updateResponse.status()).toBe(200);

    // Verify in database
    const updatedDbResult = await pool.query('SELECT * FROM persons WHERE id = $1', [insertedPerson.id]);
    expect(updatedDbResult.rows[0].name).toBe('Updated Name');
    expect(updatedDbResult.rows[0].age).toBe(35);
    expect(updatedDbResult.rows[0].updated_at).not.toBe(insertedPerson.updated_at);
  });

  test('API deletes person and removes from database', async ({ request }) => {
    // Insert person
    const person = mockPersons[0];
    const dbResult = await pool.query(`
      INSERT INTO persons (name, age, occupation, email, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);

    const insertedPerson = dbResult.rows[0];

    // Delete via API
    const deleteResponse = await request.delete(`/api/persons/${insertedPerson.id}`);
    expect(deleteResponse.status()).toBe(204);

    // Verify removed from database
    const checkResult = await pool.query('SELECT * FROM persons WHERE id = $1', [insertedPerson.id]);
    expect(checkResult.rows).toHaveLength(0);
  });

  test('API search queries database correctly', async ({ request }) => {
    // Insert test data
    for (const person of mockPersons) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    // Test search by name
    const searchResponse = await request.get('/api/persons?search=John');
    expect(searchResponse.status()).toBe(200);

    const searchResults = await searchResponse.json();
    expect(searchResults.data.length).toBe(1);
    expect(searchResults.data[0].name).toContain('John');

    // Test search by occupation
    const occupationResponse = await request.get('/api/persons?search=Engineer');
    const occupationResults = await occupationResponse.json();
    expect(occupationResults.data.length).toBeGreaterThan(0);
    expect(occupationResults.data.some((p: any) => p.occupation.includes('Engineer'))).toBe(true);
  });

  test('API pagination works with database queries', async ({ request }) => {
    // Insert large dataset
    for (const person of largeBatchData.slice(0, 25)) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    // Test first page
    const page1Response = await request.get('/api/persons?page=1&limit=10');
    expect(page1Response.status()).toBe(200);
    
    const page1Data = await page1Response.json();
    expect(page1Data.data).toHaveLength(10);
    expect(page1Data.total).toBe(25);
    expect(page1Data.page).toBe(1);
    expect(page1Data.totalPages).toBe(3);

    // Test second page
    const page2Response = await request.get('/api/persons?page=2&limit=10');
    const page2Data = await page2Response.json();
    expect(page2Data.data).toHaveLength(10);
    expect(page2Data.page).toBe(2);

    // Verify different data on different pages
    expect(page1Data.data[0].id).not.toBe(page2Data.data[0].id);
  });

  test('API handles database constraints correctly', async ({ request }) => {
    const person = mockPersons[0];

    // Create person
    const createResponse = await request.post('/api/persons', {
      data: person
    });
    expect(createResponse.status()).toBe(201);

    // Try to create duplicate email (should fail)
    const duplicateResponse = await request.post('/api/persons', {
      data: {
        ...person,
        name: 'Different Name'
      }
    });
    expect(duplicateResponse.status()).toBe(400);

    const error = await duplicateResponse.json();
    expect(error.message).toContain('email');
  });

  test('API transaction rollback on database errors', async ({ request }) => {
    // This test simulates a scenario where multiple operations should be atomic
    const persons = mockPersons.slice(0, 3);

    // Create a batch request that should partially fail
    const batchData = [
      persons[0],
      persons[1],
      { ...persons[2], age: -5 } // Invalid age should cause failure
    ];

    const batchResponse = await request.post('/api/persons/batch', {
      data: { persons: batchData }
    });

    expect(batchResponse.status()).toBe(400);

    // Verify no persons were created (transaction rolled back)
    const countResult = await pool.query('SELECT COUNT(*) FROM persons');
    expect(parseInt(countResult.rows[0].count)).toBe(0);
  });

  test('Database indexes improve query performance', async ({ request }) => {
    // Insert performance test data
    for (const person of largeBatchData) {
      await pool.query(`
        INSERT INTO persons (name, age, occupation, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [person.name, person.age, person.occupation, person.email, person.phone, person.address]);
    }

    // Test search performance (should use indexes)
    const startTime = Date.now();
    
    const searchResponse = await request.get('/api/persons?search=User&sortBy=name&sortOrder=asc');
    expect(searchResponse.status()).toBe(200);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Should complete reasonably quickly with indexes
    expect(responseTime).toBeLessThan(1000); // Less than 1 second

    const results = await searchResponse.json();
    expect(results.data.length).toBeGreaterThan(0);
  });
});