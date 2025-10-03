export const __esModule: boolean;
export class JiraAdapter extends base_crm_adapter_1.BaseCRMAdapter {
    baseUrl: any;
    projectKey: any;
    client: axios_1.AxiosInstance;
    testConnection(): Promise<{
        success: boolean;
        message: string;
        details: {
            responseTime: number;
            userInfo: {
                name: any;
                email: any;
                accountId: any;
            };
            error?: undefined;
        };
    } | {
        success: boolean;
        message: string;
        details: {
            responseTime: number;
            error: any;
            userInfo?: undefined;
        };
    }>;
    createProject(project: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        priority: any;
        dueDate: any;
    }>;
    updateProject(id: any, updates: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        priority: any;
        dueDate: any;
    }>;
    getProject(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        priority: any;
        dueDate: any;
    } | null>;
    listProjects(filters: any): Promise<any>;
    deleteProject(id: any): Promise<boolean>;
    isConfigured(): boolean;
    mapJiraIssueToProject(issue: any): {
        id: any;
        name: any;
        description: any;
        status: any;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        priority: any;
        dueDate: any;
    };
    extractTextFromDescription(description: any): any;
}
import base_crm_adapter_1 = require("./base-crm-adapter");
import axios_1 = require("axios");
//# sourceMappingURL=jira-adapter.d.ts.map