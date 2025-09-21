import axios, { AxiosInstance } from 'axios';
import { BaseCRMAdapter, CRMProject, CRMConnectionTest } from './base-crm-adapter';
import { CRMSystemConfig } from '../../types/pipeline';

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  dateLastActivity: string;
  due?: string;
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
  members: {
    id: string;
    fullName: string;
    username: string;
  }[];
  list: {
    id: string;
    name: string;
  };
}

interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
}

export class TrelloAdapter extends BaseCRMAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private token: string;
  private boardId: string;

  constructor(config: CRMSystemConfig) {
    super(config);
    
    this.apiKey = config.credentials.apiKey || process.env.TRELLO_API_KEY || '';
    this.token = config.credentials.token || process.env.TRELLO_TOKEN || '';
    this.boardId = config.credentials.boardId || process.env.TRELLO_BOARD_ID || '';

    if (!this.apiKey || !this.token) {
      throw new Error('Trello API key and token are required');
    }

    this.client = axios.create({
      baseURL: 'https://api.trello.com/1',
      timeout: 10000,
      params: {
        key: this.apiKey,
        token: this.token
      }
    });
  }

  async testConnection(): Promise<CRMConnectionTest> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.get('/members/me');
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Trello connection successful',
        details: {
          responseTime,
          userInfo: {
            name: response.data.fullName,
            username: response.data.username,
            id: response.data.id,
          }
        }
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `Trello connection failed: ${error.response?.data || error.message}`,
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
      // Get the first list in the board (typically "To Do" or "Backlog")
      const lists = await this.getBoardLists();
      const targetList = lists.find(list => !list.closed) || lists[0];
      
      if (!targetList) {
        throw new Error('No available lists found in the board');
      }

      const cardData: any = {
        name: project.name,
        desc: project.description || '',
        idList: targetList.id
      };

      if (project.dueDate) {
        cardData.due = new Date(project.dueDate).toISOString();
      }

      const response = await this.client.post('/cards', cardData);
      const cardId = response.data.id;

      // Add labels if specified
      if (project.labels?.length) {
        await this.addLabelsToCard(cardId, project.labels);
      }

      // Add members if specified
      if (project.assignees?.length) {
        await this.addMembersToCard(cardId, project.assignees);
      }

      // Get the created card to return full details
      const createdCard = await this.client.get(`/cards/${cardId}`, {
        params: {
          fields: 'id,name,desc,closed,dateLastActivity,due,labels,members',
          members: true,
          member_fields: 'id,fullName,username',
          labels: true
        }
      });

      return this.mapTrelloCardToProject(createdCard.data);
    } catch (error: any) {
      throw new Error(`Failed to create Trello card: ${error.response?.data || error.message}`);
    }
  }

  async updateProject(id: string, updates: Partial<CRMProject>): Promise<CRMProject> {
    try {
      const updateData: any = {};

      if (updates.name) {
        updateData.name = updates.name;
      }

      if (updates.description) {
        updateData.desc = updates.description;
      }

      if (updates.dueDate) {
        updateData.due = new Date(updates.dueDate).toISOString();
      }

      if (updates.status) {
        // Move card to appropriate list based on status
        const lists = await this.getBoardLists();
        const targetList = this.findListByStatus(lists, updates.status);
        if (targetList) {
          updateData.idList = targetList.id;
        }
      }

      await this.client.put(`/cards/${id}`, updateData);

      // Handle labels separately
      if (updates.labels) {
        await this.updateCardLabels(id, updates.labels);
      }

      // Handle members separately
      if (updates.assignees) {
        await this.updateCardMembers(id, updates.assignees);
      }
      
      // Get the updated card
      const updatedCard = await this.client.get(`/cards/${id}`, {
        params: {
          fields: 'id,name,desc,closed,dateLastActivity,due,labels,members',
          members: true,
          member_fields: 'id,fullName,username',
          labels: true
        }
      });

      return this.mapTrelloCardToProject(updatedCard.data);
    } catch (error: any) {
      throw new Error(`Failed to update Trello card: ${error.response?.data || error.message}`);
    }
  }

  async getProject(id: string): Promise<CRMProject | null> {
    try {
      const response = await this.client.get(`/cards/${id}`, {
        params: {
          fields: 'id,name,desc,closed,dateLastActivity,due,labels,members',
          members: true,
          member_fields: 'id,fullName,username',
          labels: true
        }
      });
      return this.mapTrelloCardToProject(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to get Trello card: ${error.response?.data || error.message}`);
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
      const params: any = {
        fields: 'id,name,desc,closed,dateLastActivity,due,labels,members',
        members: true,
        member_fields: 'id,fullName,username',
        labels: true
      };

      const response = await this.client.get(`/boards/${this.boardId}/cards`, { params });
      let cards: TrelloCard[] = response.data;

      // Apply filters
      if (filters?.status?.length) {
        const statusFilters = filters.status.map(s => s.toLowerCase());
        cards = cards.filter(card => {
          const cardStatus = this.getCardStatus(card);
          return statusFilters.includes(cardStatus.toLowerCase());
        });
      }

      if (filters?.assignee) {
        cards = cards.filter(card => 
          card.members.some(member => 
            member.fullName.includes(filters.assignee!) || 
            member.username.includes(filters.assignee!)
          )
        );
      }

      if (filters?.labels?.length) {
        cards = cards.filter(card =>
          card.labels.some(label => filters.labels!.includes(label.name))
        );
      }

      // Apply pagination
      if (filters?.offset) {
        cards = cards.slice(filters.offset);
      }

      if (filters?.limit) {
        cards = cards.slice(0, filters.limit);
      }
      
      return cards.map(card => this.mapTrelloCardToProject(card));
    } catch (error: any) {
      throw new Error(`Failed to list Trello cards: ${error.response?.data || error.message}`);
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      await this.client.delete(`/cards/${id}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw new Error(`Failed to delete Trello card: ${error.response?.data || error.message}`);
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.token && this.boardId);
  }

  private async getBoardLists(): Promise<TrelloList[]> {
    const response = await this.client.get(`/boards/${this.boardId}/lists`);
    return response.data;
  }

  private findListByStatus(lists: TrelloList[], status: string): TrelloList | null {
    const statusMap: { [key: string]: string[] } = {
      'to do': ['to do', 'backlog', 'todo', 'new'],
      'in progress': ['in progress', 'doing', 'active', 'working'],
      'done': ['done', 'completed', 'finished', 'closed'],
      'review': ['review', 'testing', 'qa'],
    };

    const normalizedStatus = status.toLowerCase();
    
    for (const [key, values] of Object.entries(statusMap)) {
      if (values.includes(normalizedStatus)) {
        return lists.find(list => 
          values.some(value => list.name.toLowerCase().includes(value))
        ) || null;
      }
    }

    // If no match found, try direct name matching
    return lists.find(list => 
      list.name.toLowerCase().includes(normalizedStatus)
    ) || null;
  }

  private getCardStatus(card: TrelloCard): string {
    if (card.closed) return 'Closed';
    
    // Try to determine status from list name
    const listName = card.list?.name?.toLowerCase() || '';
    
    if (listName.includes('done') || listName.includes('completed')) {
      return 'Done';
    } else if (listName.includes('progress') || listName.includes('doing')) {
      return 'In Progress';
    } else if (listName.includes('review') || listName.includes('testing')) {
      return 'Review';
    } else {
      return 'To Do';
    }
  }

  private async addLabelsToCard(cardId: string, labelNames: string[]): Promise<void> {
    try {
      // Get board labels
      const labelsResponse = await this.client.get(`/boards/${this.boardId}/labels`);
      const boardLabels = labelsResponse.data;

      for (const labelName of labelNames) {
        let label = boardLabels.find((l: any) => l.name === labelName);
        
        // Create label if it doesn't exist
        if (!label) {
          const colors = ['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          
          const createLabelResponse = await this.client.post('/labels', {
            name: labelName,
            color: randomColor,
            idBoard: this.boardId
          });
          label = createLabelResponse.data;
        }

        // Add label to card
        await this.client.post(`/cards/${cardId}/idLabels`, {
          value: label.id
        });
      }
    } catch (error) {
      console.warn('Failed to add labels to card:', error);
    }
  }

  private async updateCardLabels(cardId: string, newLabels: string[]): Promise<void> {
    try {
      // Get current labels
      const cardResponse = await this.client.get(`/cards/${cardId}/labels`);
      const currentLabels = cardResponse.data;

      // Remove labels that are no longer needed
      for (const label of currentLabels) {
        if (!newLabels.includes(label.name)) {
          await this.client.delete(`/cards/${cardId}/idLabels/${label.id}`);
        }
      }

      // Add new labels
      const currentLabelNames = currentLabels.map((label: any) => label.name);
      const labelsToAdd = newLabels.filter(label => !currentLabelNames.includes(label));
      if (labelsToAdd.length > 0) {
        await this.addLabelsToCard(cardId, labelsToAdd);
      }
    } catch (error) {
      console.warn('Failed to update card labels:', error);
    }
  }

  private async addMembersToCard(cardId: string, memberNames: string[]): Promise<void> {
    try {
      // Get board members
      const membersResponse = await this.client.get(`/boards/${this.boardId}/members`);
      const boardMembers = membersResponse.data;

      for (const memberName of memberNames) {
        const member = boardMembers.find((m: any) => 
          m.fullName.includes(memberName) || m.username.includes(memberName)
        );
        
        if (member) {
          await this.client.post(`/cards/${cardId}/idMembers`, {
            value: member.id
          });
        }
      }
    } catch (error) {
      console.warn('Failed to add members to card:', error);
    }
  }

  private async updateCardMembers(cardId: string, newMembers: string[]): Promise<void> {
    try {
      // Get current members
      const cardResponse = await this.client.get(`/cards/${cardId}/members`);
      const currentMembers = cardResponse.data;

      // Remove members that are no longer needed
      for (const member of currentMembers) {
        const shouldKeep = newMembers.some(name => 
          member.fullName.includes(name) || member.username.includes(name)
        );
        
        if (!shouldKeep) {
          await this.client.delete(`/cards/${cardId}/idMembers/${member.id}`);
        }
      }

      // Add new members
      const currentMemberNames = currentMembers.map((member: any) => member.fullName);
      const membersToAdd = newMembers.filter(name => 
        !currentMemberNames.some((current: string) => current.includes(name))
      );
      
      if (membersToAdd.length > 0) {
        await this.addMembersToCard(cardId, membersToAdd);
      }
    } catch (error) {
      console.warn('Failed to update card members:', error);
    }
  }

  private mapTrelloCardToProject(card: TrelloCard): CRMProject {
    return {
      id: card.id,
      name: card.name,
      description: card.desc || '',
      status: this.getCardStatus(card),
      createdAt: new Date(card.dateLastActivity).toISOString(),
      updatedAt: card.dateLastActivity,
      assignees: card.members ? card.members.map(member => member.fullName) : [],
      labels: card.labels ? card.labels.map(label => label.name) : [],
      dueDate: card.due || undefined
    };
  }
}