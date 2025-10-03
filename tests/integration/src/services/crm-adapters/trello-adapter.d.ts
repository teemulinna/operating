export const __esModule: boolean;
export class TrelloAdapter extends base_crm_adapter_1.BaseCRMAdapter {
    apiKey: any;
    token: any;
    boardId: any;
    client: axios_1.AxiosInstance;
    testConnection(): Promise<{
        success: boolean;
        message: string;
        details: {
            responseTime: number;
            userInfo: {
                name: any;
                username: any;
                id: any;
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
        createdAt: string;
        updatedAt: any;
        assignees: any;
        labels: any;
        dueDate: any;
    }>;
    updateProject(id: any, updates: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: string;
        createdAt: string;
        updatedAt: any;
        assignees: any;
        labels: any;
        dueDate: any;
    }>;
    getProject(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: string;
        createdAt: string;
        updatedAt: any;
        assignees: any;
        labels: any;
        dueDate: any;
    } | null>;
    listProjects(filters: any): Promise<any>;
    deleteProject(id: any): Promise<boolean>;
    isConfigured(): boolean;
    getBoardLists(): Promise<any>;
    findListByStatus(lists: any, status: any): any;
    getCardStatus(card: any): "In Progress" | "Closed" | "Done" | "Review" | "To Do";
    addLabelsToCard(cardId: any, labelNames: any): Promise<void>;
    updateCardLabels(cardId: any, newLabels: any): Promise<void>;
    addMembersToCard(cardId: any, memberNames: any): Promise<void>;
    updateCardMembers(cardId: any, newMembers: any): Promise<void>;
    mapTrelloCardToProject(card: any): {
        id: any;
        name: any;
        description: any;
        status: string;
        createdAt: string;
        updatedAt: any;
        assignees: any;
        labels: any;
        dueDate: any;
    };
}
import base_crm_adapter_1 = require("./base-crm-adapter");
import axios_1 = require("axios");
//# sourceMappingURL=trello-adapter.d.ts.map