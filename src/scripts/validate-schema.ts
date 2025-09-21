#!/usr/bin/env ts-node

import dotenv from 'dotenv';
dotenv.config();

import { SchemaValidator } from '../database/schema-validator';
import { DatabaseFactory } from '../database/database-factory';

async function validateSchema() {
  try {
    console.log('🔍 Starting database schema validation...\n');

    const validator = await SchemaValidator.create();
    const results = await validator.validateSchema();

    console.log('📊 Schema Validation Results:');
    console.log('=' .repeat(50));

    // Foreign Keys
    console.log('\n🔗 Foreign Key Constraints:');
    if (results.foreignKeys.isValid) {
      console.log('✅ All foreign key constraints are properly defined');
    } else {
      console.log('❌ Missing foreign key constraints:');
      results.foreignKeys.missingConstraints.forEach((constraint: string) => {
        console.log(`   - ${constraint}`);
      });
    }

    // Indexes
    console.log('\n📈 Database Indexes:');
    if (results.indexes.isValid) {
      console.log('✅ All required indexes are present');
    } else {
      console.log('❌ Missing indexes:');
      results.indexes.missingIndexes.forEach((index: string) => {
        console.log(`   - ${index}`);
      });
    }

    // Data Consistency
    console.log('\n🔍 Data Consistency:');
    if (results.dataConsistency.isValid) {
      console.log('✅ All relationships maintain data consistency');
    } else {
      console.log('❌ Data consistency issues:');
      results.dataConsistency.inconsistencies.forEach((issue: string) => {
        console.log(`   - ${issue}`);
      });
    }

    console.log('\n' + '=' .repeat(50));
    if (results.isValid) {
      console.log('🎉 Schema validation PASSED - Database is healthy!');
    } else {
      console.log('⚠️  Schema validation FAILED - Issues need to be resolved');
      
      // Offer to fix issues
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const shouldFix = await new Promise<boolean>((resolve) => {
        readline.question('Would you like to automatically fix the issues? (y/N): ', (answer: string) => {
          readline.close();
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
      });

      if (shouldFix) {
        console.log('\n🔧 Attempting to fix schema issues...');
        await validator.fixMissingConstraints();
        console.log('✅ Schema fixes applied successfully');
        
        // Re-validate
        const newResults = await validator.validateSchema();
        if (newResults.isValid) {
          console.log('🎉 Schema is now healthy after fixes!');
        } else {
          console.log('⚠️  Some issues still remain - manual intervention may be required');
        }
      }
    }

  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  } finally {
    await DatabaseFactory.closeAll();
  }
}

if (require.main === module) {
  validateSchema();
}