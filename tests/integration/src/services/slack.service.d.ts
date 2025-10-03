export const __esModule: boolean;
export class SlackService {
    webhookUrl: string | null;
    botToken: string | null;
    sendNotification(notification: any): Promise<boolean>;
    sendViaWebhook(message: any): Promise<void>;
    sendViaAPI(recipientId: any, message: any): Promise<void>;
    formatSlackMessage(notification: any): {
        text: string;
        attachments: {
            color: string;
            blocks: ({
                type: string;
                text: {
                    type: string;
                    text: string;
                    emoji: boolean;
                };
            } | {
                type: string;
                text: {
                    type: string;
                    text: any;
                    emoji?: undefined;
                };
            })[];
        }[];
    };
    getSlackUserId(recipientId: any): Promise<string | null>;
    getPriorityEmoji(priority: any): "🔴" | "🟠" | "🟡" | "🟢" | "ℹ️";
    getPriorityColor(priority: any): "#dc3545" | "#fd7e14" | "#ffc107" | "#28a745" | "#6c757d";
    formatKey(key: any): any;
    testConnection(): Promise<boolean>;
    handleSlackAction(payload: any): Promise<{
        response_type: string;
        text: string;
        replace_original: boolean;
    }>;
}
//# sourceMappingURL=slack.service.d.ts.map