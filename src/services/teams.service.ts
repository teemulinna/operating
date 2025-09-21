import axios from 'axios';

export interface TeamsNotification {
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

export class TeamsService {
  private webhookUrl: string | null;

  constructor() {
    this.webhookUrl = process.env.TEAMS_WEBHOOK_URL || null;
  }

  public async sendNotification(notification: TeamsNotification): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        console.log('Teams notification (not sent - no webhook):', {
          title: notification.title,
          message: notification.message
        });
        return true;
      }

      const teamsMessage = this.formatTeamsMessage(notification);
      await axios.post(this.webhookUrl, teamsMessage);

      console.log('Teams notification sent successfully');
      return true;

    } catch (error) {
      console.error('Failed to send Teams notification:', error);
      return false;
    }
  }

  private formatTeamsMessage(notification: TeamsNotification): any {
    const priorityColor = this.getPriorityColor(notification.priority);
    const priorityEmoji = this.getPriorityEmoji(notification.priority);

    const card = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: priorityColor,
      summary: `${priorityEmoji} ${notification.title}`,
      sections: [
        {
          activityTitle: `${priorityEmoji} ${notification.title}`,
          activitySubtitle: `Priority: ${notification.priority.toUpperCase()}`,
          text: notification.message,
          facts: [
            {
              name: "Notification ID",
              value: notification.id
            },
            {
              name: "Type",
              value: notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            },
            {
              name: "Created",
              value: new Date(notification.created_at).toLocaleString()
            }
          ]
        }
      ]
    };

    // Add context facts if available
    if (notification.context && Object.keys(notification.context).length > 0) {
      const contextFacts = Object.entries(notification.context)
        .slice(0, 8) // Teams limits facts
        .map(([key, value]) => ({
          name: this.formatKey(key),
          value: String(value)
        }));
      
      card.sections[0].facts.push(...contextFacts);
    }

    // Add actions if available
    const actions = notification.metadata?.actions;
    if (actions && Array.isArray(actions) && actions.length > 0) {
      const potentialActions = actions.slice(0, 4).map((action: any) => ({
        "@type": "OpenUri",
        name: action.label,
        targets: [
          {
            os: "default",
            uri: `${process.env.APP_URL}/notifications/${notification.id}/actions/${action.action}`
          }
        ]
      }));

      (card as any).potentialAction = potentialActions;
    } else {
      // Default action to view notification
      (card as any).potentialAction = [
        {
          "@type": "OpenUri",
          name: "View Details",
          targets: [
            {
              os: "default",
              uri: `${process.env.APP_URL}/notifications/${notification.id}`
            }
          ]
        }
      ];
    }

    return card;
  }

  public async sendAdaptiveCard(notification: TeamsNotification): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        console.log('Teams adaptive card (not sent - no webhook):', {
          title: notification.title,
          message: notification.message
        });
        return true;
      }

      const adaptiveCard = this.formatAdaptiveCard(notification);
      await axios.post(this.webhookUrl, adaptiveCard);

      console.log('Teams adaptive card sent successfully');
      return true;

    } catch (error) {
      console.error('Failed to send Teams adaptive card:', error);
      return false;
    }
  }

  private formatAdaptiveCard(notification: TeamsNotification): any {
    const priorityColor = this.getPriorityColorName(notification.priority);
    const priorityEmoji = this.getPriorityEmoji(notification.priority);

    const card = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          contentUrl: null,
          content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.3",
            body: [
              {
                type: "Container",
                style: priorityColor,
                items: [
                  {
                    type: "TextBlock",
                    text: `${priorityEmoji} ${notification.title}`,
                    weight: "Bolder",
                    size: "Large",
                    color: "Light"
                  },
                  {
                    type: "TextBlock",
                    text: `Priority: ${notification.priority.toUpperCase()}`,
                    weight: "Lighter",
                    color: "Light"
                  }
                ]
              },
              {
                type: "TextBlock",
                text: notification.message,
                wrap: true,
                spacing: "Medium"
              }
            ]
          }
        }
      ]
    };

    // Add context information
    if (notification.context && Object.keys(notification.context).length > 0) {
      const factSet = {
        type: "FactSet",
        facts: Object.entries(notification.context)
          .slice(0, 10)
          .map(([key, value]) => ({
            title: this.formatKey(key),
            value: String(value)
          }))
      };

      (card.attachments[0].content.body as any[]).push(factSet);
    }

    // Add metadata facts
    const metadataFacts = {
      type: "FactSet",
      facts: [
        {
          title: "Notification ID",
          value: notification.id
        },
        {
          title: "Type",
          value: notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        },
        {
          title: "Created",
          value: new Date(notification.created_at).toLocaleString()
        }
      ]
    };

    (card.attachments[0].content.body as any[]).push(metadataFacts);

    // Add actions
    const actions = notification.metadata?.actions;
    if (actions && Array.isArray(actions) && actions.length > 0) {
      const cardActions = actions.slice(0, 4).map((action: any) => ({
        type: "Action.OpenUrl",
        title: action.label,
        url: `${process.env.APP_URL}/notifications/${notification.id}/actions/${action.action}`
      }));

      (card.attachments[0].content as any).actions = cardActions;
    } else {
      (card.attachments[0].content as any).actions = [
        {
          type: "Action.OpenUrl",
          title: "View Details",
          url: `${process.env.APP_URL}/notifications/${notification.id}`
        }
      ];
    }

    return card;
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

  private getPriorityColorName(priority: string): string {
    switch (priority) {
      case 'critical': return 'attention';
      case 'high': return 'warning';
      case 'medium': return 'accent';
      case 'low': return 'good';
      default: return 'default';
    }
  }

  private formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .replace(/_/g, ' ');
  }

  public async testConnection(): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        return false;
      }

      const testCard = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: "#28a745",
        summary: "Connection Test",
        sections: [
          {
            activityTitle: "Connection Test",
            text: "This is a test message to verify the Teams webhook connection.",
            facts: [
              {
                name: "Test Time",
                value: new Date().toLocaleString()
              },
              {
                name: "Status",
                value: "Success"
              }
            ]
          }
        ]
      };

      await axios.post(this.webhookUrl, testCard);
      return true;
      
    } catch (error) {
      console.error('Teams connection test failed:', error);
      return false;
    }
  }

  public async sendBulkNotification(notifications: TeamsNotification[]): Promise<boolean> {
    try {
      if (!this.webhookUrl || notifications.length === 0) {
        return false;
      }

      // Create a digest card for multiple notifications
      const digestCard = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: "#007acc",
        summary: `Resource Management Digest - ${notifications.length} notifications`,
        sections: [
          {
            activityTitle: `📊 Resource Management Digest`,
            activitySubtitle: `${notifications.length} new notifications`,
            text: "Multiple notifications have been received:",
            facts: [] as Array<{ name: string; value: string }>
          }
        ]
      };

      // Add a fact for each notification type count
      const typeCounts = notifications.reduce((acc: Record<string, number>, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
      }, {});

      digestCard.sections[0].facts = Object.entries(typeCounts).map(([type, count]) => ({
        name: this.formatKey(type),
        value: `${count} notification${count > 1 ? 's' : ''}`
      }));

      // Add priority breakdown
      const priorityCounts = notifications.reduce((acc: Record<string, number>, notif) => {
        acc[notif.priority] = (acc[notif.priority] || 0) + 1;
        return acc;
      }, {});

      Object.entries(priorityCounts).forEach(([priority, count]) => {
        const emoji = this.getPriorityEmoji(priority);
        digestCard.sections[0].facts.push({
          name: `${emoji} ${priority.toUpperCase()}`,
          value: `${count} notification${count > 1 ? 's' : ''}`
        });
      });

      // Add action to view all
      (digestCard as any).potentialAction = [
        {
          "@type": "OpenUri",
          name: "View All Notifications",
          targets: [
            {
              os: "default",
              uri: `${process.env.APP_URL}/notifications`
            }
          ]
        }
      ];

      await axios.post(this.webhookUrl, digestCard);
      console.log(`Teams digest sent successfully for ${notifications.length} notifications`);
      return true;

    } catch (error) {
      console.error('Failed to send Teams bulk notification:', error);
      return false;
    }
  }
}