export const __esModule: boolean;
export class CRMAdapterFactory {
    static getAdapter(config: any): any;
    static createAdapter(config: any): jira_adapter_1.JiraAdapter | asana_adapter_1.AsanaAdapter | trello_adapter_1.TrelloAdapter;
    static normalizeCRMType(type: any): any;
    static isSupported(type: any): boolean;
    static getSupportedTypes(): string[];
    static clearCache(): void;
    static removeFromCache(config: any): void;
    static validateConfiguration(config: any): Promise<{
        valid: boolean;
        adapter: jira_adapter_1.JiraAdapter | asana_adapter_1.AsanaAdapter | trello_adapter_1.TrelloAdapter;
        error?: undefined;
    } | {
        valid: boolean;
        error: any;
        adapter?: undefined;
    }>;
}
export namespace CRMAdapterFactory {
    let adapters: Map<any, any>;
}
import jira_adapter_1 = require("./jira-adapter");
import asana_adapter_1 = require("./asana-adapter");
import trello_adapter_1 = require("./trello-adapter");
//# sourceMappingURL=adapter-factory.d.ts.map