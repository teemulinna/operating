export const __esModule: boolean;
export class AsanaAdapter extends base_crm_adapter_1.BaseCRMAdapter {
    workspaceGid: any;
    projectGid: any;
    client: axios_1.AxiosInstance;
    testConnection(): Promise<{
        success: boolean;
        message: string;
        details: {
            responseTime: number;
            userInfo: {
                name: any;
                email: any;
                gid: any;
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
        status: string;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        dueDate: any;
    }>;
    updateProject(id: any, updates: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: string;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        dueDate: any;
    }>;
    getProject(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: string;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        dueDate: any;
    } | null>;
    listProjects(filters: any): Promise<any>;
    deleteProject(id: any): Promise<boolean>;
    isConfigured(): boolean;
    addTagsToTask(taskGid: any, tags: any): Promise<void>;
    updateTaskTags(taskGid: any, newTags: any): Promise<void>;
    mapAsanaTaskToProject(task: any): {
        id: any;
        name: any;
        description: any;
        status: string;
        createdAt: any;
        updatedAt: any;
        assignees: any[];
        labels: any;
        dueDate: any;
    };
}
import base_crm_adapter_1 = require("./base-crm-adapter");
import axios_1 = require("axios");
//# sourceMappingURL=asana-adapter.d.ts.map