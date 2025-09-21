import { DatabaseService } from '../src/database/database.service';
import { DatabaseConnection } from '../src/database/connection';
import { Pool } from 'pg';

/**
 * Transaction Rollback and Isolation Testing Script
 * Validates that database transactions work correctly and rollback on failures
 */
class TransactionTester {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async runTransactionTests() {
    console.log('🔄 Starting Transaction Rollback Tests...\n');

    let testResults = {
      passed: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      await this.db.connect();
      console.log('✅ Database connected');

      // Test 1: Successful transaction
      console.log('\n📋 Test 1: Successful Transaction');
      try {
        const client = await this.db.getClient();
        try {
          await client.query('BEGIN');
          
          // Insert test department
          const deptResult = await client.query(
            'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id',
            ['Transaction Test Dept', 'Test department for transaction testing']
          );
          
          // Insert test employee
          await client.query(
            'INSERT INTO employees (first_name, last_name, email, position, department_id, salary) VALUES ($1, $2, $3, $4, $5, $6)',
            ['Transaction', 'Test', `transaction-test-${Date.now()}@example.com`, 'Test Position', deptResult.rows[0].id, 50000]
          );
          
          await client.query('COMMIT');
          console.log('✅ Successful transaction committed');
          testResults.passed++;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.log('❌ Successful transaction failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Successful transaction test failed');
      }

      // Test 2: Failed transaction with rollback
      console.log('\n🔄 Test 2: Failed Transaction with Rollback');
      try {
        const client = await this.db.getClient();
        let transactionFailed = false;
        
        try {
          await client.query('BEGIN');
          
          // Insert valid department
          const deptResult = await client.query(
            'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id',
            ['Rollback Test Dept', 'Test department that should be rolled back']
          );
          
          // Attempt to insert employee with invalid data (this should fail)
          await client.query(
            'INSERT INTO employees (first_name, last_name, email, position, department_id, salary) VALUES ($1, $2, $3, $4, $5, $6)',
            ['Rollback', 'Test', null, 'Test Position', deptResult.rows[0].id, 50000] // null email should cause constraint violation
          );
          
          await client.query('COMMIT');
          console.log('❌ Transaction should have failed but didn\'t');
          testResults.failed++;
          testResults.errors.push('Transaction should have failed due to null email');
        } catch (error) {
          await client.query('ROLLBACK');
          transactionFailed = true;
          console.log('✅ Transaction correctly failed and was rolled back');
          
          // Verify that the department was not created (rollback successful)
          const checkResult = await client.query(
            'SELECT COUNT(*) as count FROM departments WHERE name = $1',
            ['Rollback Test Dept']
          );
          
          if (parseInt(checkResult.rows[0].count) === 0) {
            console.log('✅ Rollback successful - no data persisted');
            testResults.passed++;
          } else {
            console.log('❌ Rollback failed - data was persisted');
            testResults.failed++;
            testResults.errors.push('Rollback did not properly clean up data');
          }
        } finally {
          client.release();
        }

        if (!transactionFailed) {
          testResults.failed++;
          testResults.errors.push('Transaction should have failed but did not');
        }
      } catch (error) {
        console.log('❌ Transaction rollback test setup failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Transaction rollback test setup failed');
      }

      // Test 3: Concurrent transaction isolation
      console.log('\n🔒 Test 3: Transaction Isolation');
      try {
        const client1 = await this.db.getClient();
        const client2 = await this.db.getClient();
        
        try {
          // Start transactions in both clients
          await client1.query('BEGIN');
          await client2.query('BEGIN');
          
          // Client 1 inserts a department
          const dept1Result = await client1.query(
            'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id',
            ['Isolation Test Dept 1', 'First isolation test department']
          );
          
          // Client 2 should not see this department yet (isolation)
          const visibilityCheck = await client2.query(
            'SELECT COUNT(*) as count FROM departments WHERE name = $1',
            ['Isolation Test Dept 1']
          );
          
          if (parseInt(visibilityCheck.rows[0].count) === 0) {
            console.log('✅ Transaction isolation working - uncommitted data not visible');
            testResults.passed++;
          } else {
            console.log('❌ Transaction isolation failed - uncommitted data visible');
            testResults.failed++;
            testResults.errors.push('Transaction isolation failed');
          }
          
          // Commit client 1 transaction
          await client1.query('COMMIT');
          
          // Now client 2 should see the department
          const postCommitCheck = await client2.query(
            'SELECT COUNT(*) as count FROM departments WHERE name = $1',
            ['Isolation Test Dept 1']
          );
          
          if (parseInt(postCommitCheck.rows[0].count) === 1) {
            console.log('✅ Post-commit visibility working correctly');
            testResults.passed++;
          } else {
            console.log('❌ Post-commit visibility failed');
            testResults.failed++;
            testResults.errors.push('Post-commit visibility failed');
          }
          
          await client2.query('COMMIT');
        } catch (error) {
          await client1.query('ROLLBACK').catch(() => {});
          await client2.query('ROLLBACK').catch(() => {});
          throw error;
        } finally {
          client1.release();
          client2.release();
        }
      } catch (error) {
        console.log('❌ Transaction isolation test failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Transaction isolation test failed');
      }

      // Test 4: Deadlock detection and resolution
      console.log('\n⚰️ Test 4: Deadlock Detection (if applicable)');
      try {
        // This test simulates a potential deadlock scenario
        const client1 = await this.db.getClient();
        const client2 = await this.db.getClient();
        
        try {
          await client1.query('BEGIN');
          await client2.query('BEGIN');
          
          // Create two departments for testing
          const dept1 = await client1.query(
            'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id',
            ['Deadlock Test A', 'Deadlock test department A']
          );
          await client1.query('COMMIT');
          
          await client1.query('BEGIN');
          const dept2 = await client2.query(
            'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id',
            ['Deadlock Test B', 'Deadlock test department B']
          );
          await client2.query('COMMIT');
          
          // Now try to create a deadlock scenario
          await client1.query('BEGIN');
          await client2.query('BEGIN');
          
          // Client 1 locks dept A, Client 2 locks dept B
          await client1.query(
            'UPDATE departments SET description = $1 WHERE id = $2',
            ['Updated by client 1', dept1.rows[0].id]
          );
          
          await client2.query(
            'UPDATE departments SET description = $1 WHERE id = $2',
            ['Updated by client 2', dept2.rows[0].id]
          );
          
          // Now try cross-updates that could cause deadlock
          const promises = [
            client1.query('UPDATE departments SET description = $1 WHERE id = $2', ['Cross update 1', dept2.rows[0].id]),
            client2.query('UPDATE departments SET description = $1 WHERE id = $2', ['Cross update 2', dept1.rows[0].id])
          ];
          
          try {
            await Promise.all(promises);
            await client1.query('COMMIT');
            await client2.query('COMMIT');
            console.log('✅ No deadlock occurred (or resolved automatically)');
            testResults.passed++;
          } catch (error) {
            // PostgreSQL should detect and resolve deadlocks
            if (error.message.includes('deadlock') || error.code === '40P01') {
              console.log('✅ Deadlock detected and handled by database');
              testResults.passed++;
            } else {
              console.log('❌ Unexpected error in deadlock test:', error.message);
              testResults.failed++;
              testResults.errors.push('Deadlock test failed unexpectedly');
            }
            await client1.query('ROLLBACK').catch(() => {});
            await client2.query('ROLLBACK').catch(() => {});
          }
        } catch (error) {
          await client1.query('ROLLBACK').catch(() => {});
          await client2.query('ROLLBACK').catch(() => {});
          throw error;
        } finally {
          client1.release();
          client2.release();
        }
      } catch (error) {
        console.log('❌ Deadlock detection test setup failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Deadlock detection test setup failed');
      }

      // Test 5: Foreign key constraint enforcement in transactions
      console.log('\n🔗 Test 5: Foreign Key Constraint Enforcement in Transactions');
      try {
        const client = await this.db.getClient();
        let constraintEnforced = false;
        
        try {
          await client.query('BEGIN');
          
          // Try to insert employee with non-existent department
          await client.query(
            'INSERT INTO employees (first_name, last_name, email, position, department_id, salary) VALUES ($1, $2, $3, $4, $5, $6)',
            ['FK', 'Test', `fk-test-${Date.now()}@example.com`, 'Test Position', '99999999-9999-9999-9999-999999999999', 50000]
          );
          
          await client.query('COMMIT');
          console.log('❌ Foreign key constraint not enforced in transaction');
          testResults.failed++;
          testResults.errors.push('Foreign key constraint not enforced in transaction');
        } catch (error) {
          await client.query('ROLLBACK');
          constraintEnforced = true;
          
          if (error.message.includes('foreign key') || error.code === '23503') {
            console.log('✅ Foreign key constraint properly enforced in transaction');
            testResults.passed++;
          } else {
            console.log('❌ Wrong error type for foreign key constraint:', error.message);
            testResults.failed++;
            testResults.errors.push('Wrong error type for foreign key constraint');
          }
        } finally {
          client.release();
        }
        
        if (!constraintEnforced) {
          testResults.failed++;
          testResults.errors.push('Foreign key constraint should have been enforced');
        }
      } catch (error) {
        console.log('❌ Foreign key constraint test setup failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Foreign key constraint test setup failed');
      }

      // Cleanup test data
      console.log('\n🧹 Cleaning up test data...');
      try {
        await this.db.query('DELETE FROM employees WHERE email LIKE \'%transaction-test%\' OR email LIKE \'%fk-test%\'');
        await this.db.query('DELETE FROM departments WHERE name LIKE \'%Test%\' OR name LIKE \'%Deadlock%\' OR name LIKE \'%Isolation%\'');
        console.log('✅ Test data cleaned up');
      } catch (error) {
        console.log('⚠️  Test data cleanup failed:', error.message);
      }

    } catch (error) {
      console.error('❌ Transaction testing failed:', error);
      testResults.failed++;
      testResults.errors.push(`Transaction testing error: ${error.message}`);
    } finally {
      await this.db.disconnect();
    }

    // Print results summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TRANSACTION ROLLBACK TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n🚨 ERRORS FOUND:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (testResults.failed === 0) {
      console.log('\n🎉 ALL TRANSACTION TESTS PASSED - DATABASE INTEGRITY CONFIRMED!');
    } else {
      console.log('\n⚠️  TRANSACTION ISSUES DETECTED - REVIEW REQUIRED');
    }

    return {
      success: testResults.failed === 0,
      results: testResults
    };
  }
}

// Self-executing test runner
if (require.main === module) {
  const tester = new TransactionTester();
  
  tester.runTransactionTests()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Transaction testing crashed:', error);
      process.exit(1);
    });
}

export { TransactionTester };