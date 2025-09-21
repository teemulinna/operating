import nodemailer, { Transporter } from 'nodemailer';

export interface EmailNotification {
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

export class EmailService {
  private transporter!: Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('Email credentials not configured. Email notifications will be logged only.');
      return;
    }

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  public async sendNotification(notification: EmailNotification): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('Email notification (not sent):', {
          to: notification.recipient_id,
          subject: notification.title,
          message: notification.message
        });
        return true;
      }

      // Get recipient email address
      const recipientEmail = await this.getRecipientEmail(notification.recipient_id);
      if (!recipientEmail) {
        console.warn(`No email address found for user ${notification.recipient_id}`);
        return false;
      }

      const emailHtml = this.generateEmailHtml(notification);
      const emailText = this.generateEmailText(notification);

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipientEmail,
        subject: this.generateSubject(notification),
        text: emailText,
        html: emailHtml
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;

    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  private async getRecipientEmail(userId: string): Promise<string | null> {
    try {
      // This would typically query the database
      // For now, we'll use a placeholder
      return `user-${userId}@company.com`;
    } catch (error) {
      console.error('Error getting recipient email:', error);
      return null;
    }
  }

  private generateSubject(notification: EmailNotification): string {
    const priorityPrefix = notification.priority === 'critical' ? '🔴 CRITICAL: ' :
                          notification.priority === 'high' ? '🟠 HIGH: ' :
                          notification.priority === 'medium' ? '🟡 ' : '';
    
    return `${priorityPrefix}${notification.title}`;
  }

  private generateEmailHtml(notification: EmailNotification): string {
    const priorityColor = this.getPriorityColor(notification.priority);
    const priorityBadge = this.getPriorityBadge(notification.priority);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid ${priorityColor}; padding-bottom: 20px; margin-bottom: 30px; }
          .priority-badge { 
            display: inline-block; 
            padding: 4px 12px; 
            border-radius: 20px; 
            background: ${priorityColor}; 
            color: white; 
            font-size: 12px; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin-bottom: 10px; 
          }
          .title { font-size: 24px; font-weight: bold; margin: 0; color: #2c3e50; }
          .message { 
            font-size: 16px; 
            margin: 20px 0; 
            padding: 20px; 
            background: #f8f9fa; 
            border-left: 4px solid ${priorityColor}; 
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            font-size: 14px; 
            color: #666; 
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: ${priorityColor};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 10px 10px 0;
          }
          .metadata {
            background: #f1f3f4;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="priority-badge">${priorityBadge}</div>
            <h1 class="title">${notification.title}</h1>
          </div>
          
          <div class="message">
            ${notification.message.replace(/\n/g, '<br>')}
          </div>
          
          ${this.generateContextSection(notification)}
          ${this.generateActionsSection(notification)}
          
          <div class="footer">
            <p>
              <strong>Notification ID:</strong> ${notification.id}<br>
              <strong>Sent:</strong> ${new Date(notification.created_at).toLocaleString()}<br>
              <strong>Type:</strong> ${notification.type}
            </p>
            <p>
              You are receiving this notification based on your notification preferences. 
              <a href="${process.env.APP_URL}/settings/notifications">Manage your preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailText(notification: EmailNotification): string {
    const priorityBadge = this.getPriorityBadge(notification.priority);
    
    let text = `${priorityBadge}: ${notification.title}\n\n`;
    text += `${notification.message}\n\n`;
    
    if (notification.context && Object.keys(notification.context).length > 0) {
      text += 'Additional Information:\n';
      Object.entries(notification.context).forEach(([key, value]) => {
        text += `- ${key}: ${value}\n`;
      });
      text += '\n';
    }
    
    text += `Notification ID: ${notification.id}\n`;
    text += `Sent: ${new Date(notification.created_at).toLocaleString()}\n`;
    text += `Type: ${notification.type}\n\n`;
    text += `Manage your notification preferences: ${process.env.APP_URL}/settings/notifications`;
    
    return text;
  }

  private generateContextSection(notification: EmailNotification): string {
    if (!notification.context || Object.keys(notification.context).length === 0) {
      return '';
    }

    let contextHtml = '<div class="metadata"><h3>Additional Information</h3><ul>';
    Object.entries(notification.context).forEach(([key, value]) => {
      contextHtml += `<li><strong>${this.formatKey(key)}:</strong> ${value}</li>`;
    });
    contextHtml += '</ul></div>';
    
    return contextHtml;
  }

  private generateActionsSection(notification: EmailNotification): string {
    const actions = notification.metadata?.actions;
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return '';
    }

    let actionsHtml = '<div class="actions"><h3>Available Actions</h3>';
    actions.forEach((action: any) => {
      const actionUrl = `${process.env.APP_URL}/notifications/${notification.id}/actions/${action.action}`;
      actionsHtml += `<a href="${actionUrl}" class="button">${action.label}</a>`;
    });
    actionsHtml += '</div>';
    
    return actionsHtml;
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

  private getPriorityBadge(priority: string): string {
    switch (priority) {
      case 'critical': return '🔴 CRITICAL';
      case 'high': return '🟠 HIGH';
      case 'medium': return '🟡 MEDIUM';
      case 'low': return '🟢 LOW';
      default: return 'INFO';
    }
  }

  private formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .replace(/_/g, ' ');
  }

  public async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}