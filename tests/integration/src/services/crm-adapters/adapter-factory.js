"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMAdapterFactory = void 0;
const jira_adapter_1 = require("./jira-adapter");
const asana_adapter_1 = require("./asana-adapter");
const trello_adapter_1 = require("./trello-adapter");
class CRMAdapterFactory {
    /**
     * Create or retrieve a CRM adapter instance
     */
    static getAdapter(config) {
        const cacheKey = `${config.type}-${config.id}`;
        if (this.adapters.has(cacheKey)) {
            return this.adapters.get(cacheKey);
        }
        const adapter = this.createAdapter(config);
        this.adapters.set(cacheKey, adapter);
        return adapter;
    }
    /**
     * Create a new CRM adapter instance
     */
    static createAdapter(config) {
        const normalizedType = this.normalizeCRMType(config.type);
        switch (normalizedType) {
            case 'jira':
                return new jira_adapter_1.JiraAdapter(config);
            case 'asana':
                return new asana_adapter_1.AsanaAdapter(config);
            case 'trello':
                return new trello_adapter_1.TrelloAdapter(config);
            default:
                throw new Error(`Unsupported CRM type: ${config.type}. Supported types: jira, asana, trello`);
        }
    }
    /**
     * Normalize CRM type to supported types
     */
    static normalizeCRMType(type) {
        const normalizedType = type.toLowerCase();
        // Map various type variations to supported types
        const typeMapping = {
            'jira': 'jira',
            'atlassian': 'jira',
            'asana': 'asana',
            'trello': 'trello'
        };
        const mapped = typeMapping[normalizedType];
        if (!mapped) {
            throw new Error(`Cannot map CRM type '${type}' to a supported adapter`);
        }
        return mapped;
    }
    /**
     * Check if a CRM type is supported
     */
    static isSupported(type) {
        try {
            this.normalizeCRMType(type);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get list of supported CRM types
     */
    static getSupportedTypes() {
        return ['jira', 'asana', 'trello'];
    }
    /**
     * Clear cached adapters (useful for testing or configuration changes)
     */
    static clearCache() {
        this.adapters.clear();
    }
    /**
     * Remove specific adapter from cache
     */
    static removeFromCache(config) {
        const cacheKey = `${config.type}-${config.id}`;
        this.adapters.delete(cacheKey);
    }
    /**
     * Test if an adapter can be created with the given configuration
     */
    static async validateConfiguration(config) {
        try {
            const adapter = this.createAdapter(config);
            if (!adapter.isConfigured()) {
                return {
                    valid: false,
                    error: 'Adapter configuration is incomplete. Check credentials and required fields.'
                };
            }
            return {
                valid: true,
                adapter
            };
        }
        catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}
exports.CRMAdapterFactory = CRMAdapterFactory;
CRMAdapterFactory.adapters = new Map();
