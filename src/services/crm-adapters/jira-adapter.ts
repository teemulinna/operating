import axios, { AxiosInstance } from 'axios';
import { BaseCRMAdapter, CRMProject, CRMConnectionTest } from './base-crm-adapter';
import { CRMSystemConfig } from '../../types/pipeline';

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    created: string;
    updated: string;
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    labels: string[];
    priority?: {
      name: string;
    };
    duedate?: string;
  };
}

export class JiraAdapter extends BaseCRMAdapter {
  private client: AxiosInstance;
  private baseUrl: string;
  private projectKey: string;

  constructor(config: CRMSystemConfig) {
    super(config);
    this.baseUrl = config.apiUrl || process.env.JIRA_BASE_URL || '';
    this.projectKey = config.credentials.projectKey || 'PROJ';

    const token = config.credentials.apiToken || process.env.JIRA_API_TOKEN;
    const email = config.credentials.userEmail || process.env.JIRA_USER_EMAIL;

    if (!token || !email) {
      throw new Error('JIRA API token and user email are required');
    }

    this.client = axios.create({
      baseURL: `${this.baseUrl}/rest/api/3`,
      auth: {
        username: email,
        password: token
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async testConnection(): Promise<CRMConnectionTest> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.get('/myself');
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'JIRA connection successful',
        details: {
          responseTime,
          userInfo: {
            name: response.data.displayName,
            email: response.data.emailAddress,
            accountId: response.data.accountId,
          }
        }
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `JIRA connection failed: ${error.response?.data?.message || error.message}`,
        details: {
          responseTime,
          error: error.response?.status || 'Network Error'
        }
      };
    }
  }

  async createProject(project: {
    name: string;
    description?: string;
    assignees?: string[];
    labels?: string[];
    priority?: string;
    dueDate?: string;
  }): Promise<CRMProject> {
    try {
      const issueData = {
        fields: {
          project: {
            key: this.projectKey
          },
          summary: project.name,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: project.description || ''
                  }
                ]
              }
            ]
          },
          issuetype: {
            name: 'Task'
          },
          labels: project.labels || [],
          ...(project.priority && {
            priority: {
              name: project.priority
            }
          }),
          ...(project.dueDate && {
            duedate: project.dueDate
          })
        }
      };

      const response = await this.client.post('/issue', issueData);
      
      // Get the created issue to return full details
      const createdIssue = await this.client.get(`/issue/${response.data.key}`);
      return this.mapJiraIssueToProject(createdIssue.data);
    } catch (error: any) {
      throw new Error(`Failed to create JIRA issue: ${error.response?.data?.errorMessages?.[0] || error.message}`);
    }
  }

  async updateProject(id: string, updates: Partial<CRMProject>): Promise<CRMProject> {
    try {
      const updateData: any = {
        fields: {}
      };

      if (updates.name) {
        updateData.fields.summary = updates.name;
      }

      if (updates.description) {
        updateData.fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: updates.description
                }
              ]
            }
          ]
        };
      }

      if (updates.labels) {
        updateData.fields.labels = updates.labels;
      }

      if (updates.priority) {
        updateData.fields.priority = {
          name: updates.priority
        };
      }

      if (updates.dueDate) {
        updateData.fields.duedate = updates.dueDate;
      }

      await this.client.put(`/issue/${id}`, updateData);
      
      // Get the updated issue
      const updatedIssue = await this.client.get(`/issue/${id}`);
      return this.mapJiraIssueToProject(updatedIssue.data);
    } catch (error: any) {
      throw new Error(`Failed to update JIRA issue: ${error.response?.data?.errorMessages?.[0] || error.message}`);
    }
  }

  async getProject(id: string): Promise<CRMProject | null> {
    try {
      const response = await this.client.get(`/issue/${id}`);
      return this.mapJiraIssueToProject(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to get JIRA issue: ${error.response?.data?.errorMessages?.[0] || error.message}`);
    }
  }

  async listProjects(filters?: {
    status?: string[];
    assignee?: string;
    labels?: string[];
    limit?: number;
    offset?: number;
  }): Promise<CRMProject[]> {
    try {
      let jql = `project = ${this.projectKey}`;
      
      if (filters?.status?.length) {
        const statusList = filters.status.map(s => `"${s}"`).join(',');
        jql += ` AND status IN (${statusList})`;
      }

      if (filters?.assignee) {
        jql += ` AND assignee = "${filters.assignee}"`;
      }

      if (filters?.labels?.length) {
        const labelConditions = filters.labels.map(label => `labels = "${label}"`).join(' OR ');
        jql += ` AND (${labelConditions})`;
      }

      const params: any = {
        jql,
        fields: 'id,key,summary,description,status,created,updated,assignee,labels,priority,duedate',
        maxResults: filters?.limit || 50,
        startAt: filters?.offset || 0
      };

      const response = await this.client.get('/search', { params });
      
      return response.data.issues.map((issue: JiraIssue) => this.mapJiraIssueToProject(issue));
    } catch (error: any) {
      throw new Error(`Failed to list JIRA issues: ${error.response?.data?.errorMessages?.[0] || error.message}`);
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      await this.client.delete(`/issue/${id}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw new Error(`Failed to delete JIRA issue: ${error.response?.data?.errorMessages?.[0] || error.message}`);
    }
  }

  isConfigured(): boolean {
    const token = this.config.credentials.apiToken || process.env.JIRA_API_TOKEN;
    const email = this.config.credentials.userEmail || process.env.JIRA_USER_EMAIL;
    return !!(this.baseUrl && token && email);
  }

  private mapJiraIssueToProject(issue: JiraIssue): CRMProject {
    return {
      id: issue.key,
      name: issue.fields.summary,
      description: this.extractTextFromDescription(issue.fields.description),
      status: issue.fields.status.name,
      createdAt: issue.fields.created,
      updatedAt: issue.fields.updated,
      assignees: issue.fields.assignee ? [issue.fields.assignee.displayName] : [],
      labels: issue.fields.labels || [],
      priority: issue.fields.priority?.name,
      dueDate: issue.fields.duedate
    };
  }

  private extractTextFromDescription(description: any): string {
    if (!description) return '';
    
    // Handle Atlassian Document Format
    if (description.content) {
      return description.content
        .map((block: any) => {
          if (block.content) {
            return block.content.map((item: any) => item.text || '').join('');
          }
          return '';
        })
        .join('\n');
    }
    
    // Handle plain text
    if (typeof description === 'string') {
      return description;
    }
    
    return '';
  }
}