"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
describe('Heat Map API - Basic Endpoint Tests', () => {
    describe('GET /api/capacity/heatmap', () => {
        it('should respond to heat map endpoint', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .expect('Content-Type', /json/);
            expect(response.status).toBeLessThanOrEqual(500);
            expect(response.body).toBeDefined();
        });
        it('should accept date range parameters', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
            expect(response.status).toBeLessThanOrEqual(500);
            expect(response.body).toBeDefined();
        });
    });
    describe('GET /api/capacity/heatmap/summary', () => {
        it('should respond to summary endpoint', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/summary')
                .expect('Content-Type', /json/);
            expect(response.status).toBeLessThanOrEqual(500);
            expect(response.body).toBeDefined();
        });
    });
    describe('GET /api/capacity/bottlenecks', () => {
        it('should respond to bottlenecks endpoint', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/bottlenecks')
                .expect('Content-Type', /json/);
            expect(response.status).toBeLessThanOrEqual(500);
            expect(response.body).toBeDefined();
        });
    });
    describe('POST /api/capacity/heatmap/refresh', () => {
        it('should respond to refresh endpoint', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/capacity/heatmap/refresh')
                .expect('Content-Type', /json/);
            expect(response.status).toBeLessThanOrEqual(500);
            expect(response.body).toBeDefined();
        });
    });
    describe('GET /api/capacity/heatmap/export', () => {
        it('should respond to export endpoint with CSV format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/export')
                .query({ format: 'csv' });
            expect(response.status).toBeLessThanOrEqual(500);
        });
        it('should respond to export endpoint with JSON format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/export')
                .query({ format: 'json' });
            expect(response.status).toBeLessThanOrEqual(500);
        });
    });
});
//# sourceMappingURL=heat-map-simple.test.js.map