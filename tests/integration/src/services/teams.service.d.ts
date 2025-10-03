export const __esModule: boolean;
export class TeamsService {
    webhookUrl: string | null;
    sendNotification(notification: any): Promise<boolean>;
    formatTeamsMessage(notification: any): {
        "@type": string;
        "@context": string;
        themeColor: string;
        summary: string;
        sections: {
            activityTitle: string;
            activitySubtitle: string;
            text: any;
            facts: {
                name: string;
                value: any;
            }[];
        }[];
    };
    sendAdaptiveCard(notification: any): Promise<boolean>;
    formatAdaptiveCard(notification: any): {
        type: string;
        attachments: {
            contentType: string;
            contentUrl: null;
            content: {
                $schema: string;
                type: string;
                version: string;
                body: ({
                    type: string;
                    style: string;
                    items: ({
                        type: string;
                        text: string;
                        weight: string;
                        size: string;
                        color: string;
                    } | {
                        type: string;
                        text: string;
                        weight: string;
                        color: string;
                        size?: undefined;
                    })[];
                    text?: undefined;
                    wrap?: undefined;
                    spacing?: undefined;
                } | {
                    type: string;
                    text: any;
                    wrap: boolean;
                    spacing: string;
                    style?: undefined;
                    items?: undefined;
                })[];
            };
        }[];
    };
    getPriorityEmoji(priority: any): "🔴" | "🟠" | "🟡" | "🟢" | "ℹ️";
    getPriorityColor(priority: any): "#dc3545" | "#fd7e14" | "#ffc107" | "#28a745" | "#6c757d";
    getPriorityColorName(priority: any): "good" | "warning" | "default" | "attention" | "accent";
    formatKey(key: any): any;
    testConnection(): Promise<boolean>;
    sendBulkNotification(notifications: any): Promise<boolean>;
}
//# sourceMappingURL=teams.service.d.ts.map