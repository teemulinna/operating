"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
async function globalSetup(config) {
    console.log('🚀 ResourceForge E2E Test Suite - Global Setup Starting...');
    try {
        console.log('📡 Checking server availability...');
        const backendHealthy = await checkServerHealth('http://localhost:3001/health');
        if (!backendHealthy) {
            console.warn('⚠️  Backend server not responding - tests may fail');
        }
        else {
            console.log('✅ Backend API server healthy');
        }
        const frontendHealthy = await checkServerHealth('http://localhost:3003');
        if (!frontendHealthy) {
            console.warn('⚠️  Frontend server not responding - tests may fail');
        }
        else {
            console.log('✅ Frontend server healthy');
        }
        console.log('🗄️  Preparing test database...');
        await prepareTestDatabase();
        console.log('🌐 Setting up browser context...');
        const browser = await test_1.chromium.launch();
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true,
        });
        await context.storageState({ path: 'tests/fixtures/auth-state.json' });
        await browser.close();
        console.log('✅ Global setup completed successfully');
    }
    catch (error) {
        console.error('❌ Global setup failed:', error);
        throw error;
    }
}
async function checkServerHealth(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            timeout: 10000
        });
        return response.ok;
    }
    catch (error) {
        return false;
    }
}
async function prepareTestDatabase() {
    try {
        const dbHealthy = await checkServerHealth('http://localhost:3001/api/employees');
        if (dbHealthy) {
            console.log('✅ Database connection verified');
        }
        else {
            console.log('ℹ️  Database endpoints not responding - using fallback data');
        }
    }
    catch (error) {
        console.warn('Database preparation warning:', error);
    }
}
exports.default = globalSetup;
//# sourceMappingURL=global-setup.js.map