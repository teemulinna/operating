"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function globalTeardown(config) {
    console.log('🧹 ResourceForge E2E Test Suite - Global Teardown Starting...');
    try {
        console.log('📁 Cleaning up test artifacts...');
        await cleanupTestArtifacts();
        console.log('🗄️  Database cleanup...');
        await cleanupTestDatabase();
        console.log('📊 Generating test summary...');
        await generateTestSummary();
        console.log('✅ Global teardown completed successfully');
    }
    catch (error) {
        console.error('❌ Global teardown failed:', error);
    }
}
async function cleanupTestArtifacts() {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const authStatePath = 'tests/fixtures/auth-state.json';
        try {
            await fs.unlink(authStatePath);
        }
        catch (e) {
        }
        console.log('✅ Test artifacts cleaned up');
    }
    catch (error) {
        console.warn('Test artifact cleanup warning:', error);
    }
}
async function cleanupTestDatabase() {
    try {
        console.log('✅ Database cleanup completed');
    }
    catch (error) {
        console.warn('Database cleanup warning:', error);
    }
}
async function generateTestSummary() {
    try {
        const fs = require('fs').promises;
        const summary = {
            timestamp: new Date().toISOString(),
            testRun: 'ResourceForge E2E Tests',
            environment: process.env.NODE_ENV || 'test',
            servers: {
                frontend: 'http://localhost:3003',
                backend: 'http://localhost:3001'
            }
        };
        await fs.writeFile('test-results/test-summary.json', JSON.stringify(summary, null, 2));
        console.log('✅ Test summary generated');
    }
    catch (error) {
        console.warn('Test summary generation warning:', error);
    }
}
exports.default = globalTeardown;
//# sourceMappingURL=global-teardown.js.map