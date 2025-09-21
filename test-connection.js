const { DatabaseService } = require('./dist/database/database.service');
const { AllocationService } = require('./dist/services/allocation.service');

async function testConnection() {
  try {
    console.log('1. Creating database instance...');
    const db = DatabaseService.getInstance();

    console.log('2. Connecting to database...');
    await db.connect();

    console.log('3. Testing simple query...');
    const result = await db.query('SELECT 1 as test');
    console.log('Query result:', result.rows);

    console.log('4. Checking table schemas...');
    const schemas = await db.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('employees', 'departments', 'projects', 'resource_allocations')
        AND column_name = 'id'
      ORDER BY table_name;
    `);
    console.log('ID Column Types:', schemas.rows);

    console.log('5. Creating allocation service...');
    const allocationService = new AllocationService(db);

    console.log('6. Test successful!');

    await db.disconnect();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection();