import axios from 'axios';

export interface SlackNotification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  recipient_id: string;
  context: any;
  metadata: any;
  created_at: string;
}

export class SlackService {
  private webhookUrl: string | null;
  private botToken: string | null;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
    this.botToken = process.env.SLACK_BOT_TOKEN || null;
  }

  public async sendNotification(notification: SlackNotification): Promise<boolean> {
    try {
      if (!this.webhookUrl && !this.botToken) {
        console.log('Slack notification (not sent - no webhook/token):', {
          title: notification.title,
          message: notification.message
        });
        return true;
      }

      const slackMessage = this.formatSlackMessage(notification);

      if (this.webhookUrl) {
        await this.sendViaWebhook(slackMessage);
      } else if (this.botToken) {
        await this.sendViaAPI(notification.recipient_id, slackMessage);
      }

      console.log('Slack notification sent successfully');
      return true;

    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  private async sendViaWebhook(message: any): Promise<void> {
    await axios.post(this.webhookUrl!, message);
  }

  private async sendViaAPI(recipientId: string, message: any): Promise<void> {
    // Get Slack user ID for the recipient
    const slackUserId = await this.getSlackUserId(recipientId);
    if (!slackUserId) {
      throw new Error(`No Slack user found for recipient ${recipientId}`);
    }

    await axios.post('https://slack.com/api/chat.postMessage', {
      channel: slackUserId,
      ...message
    }, {
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private formatSlackMessage(notification: SlackNotification): any {
    const priorityEmoji = this.getPriorityEmoji(notification.priority);
    const priorityColor = this.getPriorityColor(notification.priority);

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${priorityEmoji} ${notification.title}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: notification.message
        }
      }
    ];

    // Add context fields if available
    if (notification.context && Object.keys(notification.context).length > 0) {
      const fields = Object.entries(notification.context).map(([key, value]) => ({
        type: "mrkdwn",
        text: `*${this.formatKey(key)}:*\n${value}`
      }));

      blocks.push({
        type: "section",
        fields: fields.slice(0, 10) // Slack limits to 10 fields
      } as any);
    }

    // Add actions if available
    const actions = notification.metadata?.actions;
    if (actions && Array.isArray(actions) && actions.length > 0) {
      const elements = actions.slice(0, 5).map((action: any) => ({
        type: "button",
        text: {
          type: "plain_text",
          text: action.label,
          emoji: true
        },
        value: JSON.stringify({
          notificationId: notification.id,
          action: action.action,
          data: action.data
        }),
        action_id: `notification_${action.action}`
      }));

      blocks.push({
        type: "actions",
        elements
      } as any);
    }

    // Add footer with metadata
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📋 ID: ${notification.id} | 📅 ${new Date(notification.created_at).toLocaleString()} | 🏷️ ${notification.type}`
        }
      ]
    } as any);

    return {
      text: `${priorityEmoji} ${notification.title}`,
      attachments: [
        {
          color: priorityColor,
          blocks
        }
      ]
    };
  }

  private async getSlackUserId(recipientId: string): Promise<string | null> {
    try {
      // This would typically look up the user's Slack ID from your database
      // or use the Slack API to find the user by email
      
      // For now, we'll return a placeholder
      return `@user-${recipientId}`;
    } catch (error) {
      console.error('Error getting Slack user ID:', error);
      return null;
    }
  }

  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return 'ℹ️';
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  private formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .replace(/_/g, ' ');
  }

  public async testConnection(): Promise<boolean> {
    try {
      if (this.botToken) {
        const response = await axios.post('https://slack.com/api/auth.test', {}, {
          headers: {
            'Authorization': `Bearer ${this.botToken}`
          }
        });
        return response.data.ok === true;
      } else if (this.webhookUrl) {
        // Test webhook with a simple message
        await axios.post(this.webhookUrl, {
          text: "Connection test",
          username: "Resource Manager Bot"
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Slack connection test failed:', error);
      return false;
    }
  }

  // Method to handle interactive actions from Slack
  public async handleSlackAction(payload: any): Promise<void> {
    try {
      const action = payload.actions[0];
      const actionData = JSON.parse(action.value);
      
      // This would typically trigger the notification action handler
      console.log('Handling Slack action:', actionData);
      
      // Acknowledge the action
      return {
        response_type: 'ephemeral',
        text: `Action "${actionData.action}" processed for notification ${actionData.notificationId}`,
        replace_original: false
      } as any;
      
    } catch (error) {
      console.error('Error handling Slack action:', error);
      throw error;
    }
  }
}