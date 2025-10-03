"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_service_1 = require("../src/database/database.service");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'employee_test';
beforeAll(async () => {
    const db = database_service_1.DatabaseService.getInstance();
    await db.connect();
});
afterAll(async () => {
    await database_service_1.DatabaseService.disconnect();
});
jest.setTimeout(30000);
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
};
//# sourceMappingURL=setup.js.map