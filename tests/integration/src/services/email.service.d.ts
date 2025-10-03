export const __esModule: boolean;
export class EmailService {
    initializeTransporter(): void;
    transporter: any;
    sendNotification(notification: any): Promise<boolean>;
    getRecipientEmail(userId: any): Promise<string | null>;
    generateSubject(notification: any): string;
    generateEmailHtml(notification: any): string;
    generateEmailText(notification: any): string;
    generateContextSection(notification: any): string;
    generateActionsSection(notification: any): string;
    getPriorityColor(priority: any): "#dc3545" | "#fd7e14" | "#ffc107" | "#28a745" | "#6c757d";
    getPriorityBadge(priority: any): "INFO" | "🔴 CRITICAL" | "🟠 HIGH" | "🟡 MEDIUM" | "🟢 LOW";
    formatKey(key: any): any;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=email.service.d.ts.map