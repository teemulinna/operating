"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCRMAdapter = void 0;
class BaseCRMAdapter {
    constructor(config) {
        this.config = config;
    }
    /**
     * Get the CRM system type
     */
    getType() {
        return this.config.type;
    }
    /**
     * Get the CRM system name
     */
    getName() {
        return this.config.name;
    }
}
exports.BaseCRMAdapter = BaseCRMAdapter;
