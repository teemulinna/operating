"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrelloAdapter = void 0;
const axios_1 = require("axios");
const base_crm_adapter_1 = require("./base-crm-adapter");
class TrelloAdapter extends base_crm_adapter_1.BaseCRMAdapter {
    constructor(config) {
        super(config);
        this.apiKey = config.credentials.apiKey || process.env.TRELLO_API_KEY || '';
        this.token = config.credentials.token || process.env.TRELLO_TOKEN || '';
        this.boardId = config.credentials.boardId || process.env.TRELLO_BOARD_ID || '';
        if (!this.apiKey || !this.token) {
            throw new Error('Trello API key and token are required');
        }
        this.client = axios_1.default.create({
            baseURL: 'https://api.trello.com/1',
            timeout: 10000,
            params: {
                key: this.apiKey,
                token: this.token
            }
        });
    }
    async testConnection() {
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
        }
        catch (error) {
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
    async createProject(project) {
        try {
            // Get the first list in the board (typically "To Do" or "Backlog")
            const lists = await this.getBoardLists();
            const targetList = lists.find(list => !list.closed) || lists[0];
            if (!targetList) {
                throw new Error('No available lists found in the board');
            }
            const cardData = {
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
        }
        catch (error) {
            throw new Error(`Failed to create Trello card: ${error.response?.data || error.message}`);
        }
    }
    async updateProject(id, updates) {
        try {
            const updateData = {};
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
        }
        catch (error) {
            throw new Error(`Failed to update Trello card: ${error.response?.data || error.message}`);
        }
    }
    async getProject(id) {
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
        }
        catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw new Error(`Failed to get Trello card: ${error.response?.data || error.message}`);
        }
    }
    async listProjects(filters) {
        try {
            const params = {
                fields: 'id,name,desc,closed,dateLastActivity,due,labels,members',
                members: true,
                member_fields: 'id,fullName,username',
                labels: true
            };
            const response = await this.client.get(`/boards/${this.boardId}/cards`, { params });
            let cards = response.data;
            // Apply filters
            if (filters?.status?.length) {
                const statusFilters = filters.status.map(s => s.toLowerCase());
                cards = cards.filter(card => {
                    const cardStatus = this.getCardStatus(card);
                    return statusFilters.includes(cardStatus.toLowerCase());
                });
            }
            if (filters?.assignee) {
                cards = cards.filter(card => card.members.some(member => member.fullName.includes(filters.assignee) ||
                    member.username.includes(filters.assignee)));
            }
            if (filters?.labels?.length) {
                cards = cards.filter(card => card.labels.some(label => filters.labels.includes(label.name)));
            }
            // Apply pagination
            if (filters?.offset) {
                cards = cards.slice(filters.offset);
            }
            if (filters?.limit) {
                cards = cards.slice(0, filters.limit);
            }
            return cards.map(card => this.mapTrelloCardToProject(card));
        }
        catch (error) {
            throw new Error(`Failed to list Trello cards: ${error.response?.data || error.message}`);
        }
    }
    async deleteProject(id) {
        try {
            await this.client.delete(`/cards/${id}`);
            return true;
        }
        catch (error) {
            if (error.response?.status === 404) {
                return false;
            }
            throw new Error(`Failed to delete Trello card: ${error.response?.data || error.message}`);
        }
    }
    isConfigured() {
        return !!(this.apiKey && this.token && this.boardId);
    }
    async getBoardLists() {
        const response = await this.client.get(`/boards/${this.boardId}/lists`);
        return response.data;
    }
    findListByStatus(lists, status) {
        const statusMap = {
            'to do': ['to do', 'backlog', 'todo', 'new'],
            'in progress': ['in progress', 'doing', 'active', 'working'],
            'done': ['done', 'completed', 'finished', 'closed'],
            'review': ['review', 'testing', 'qa'],
        };
        const normalizedStatus = status.toLowerCase();
        for (const [key, values] of Object.entries(statusMap)) {
            if (values.includes(normalizedStatus)) {
                return lists.find(list => values.some(value => list.name.toLowerCase().includes(value))) || null;
            }
        }
        // If no match found, try direct name matching
        return lists.find(list => list.name.toLowerCase().includes(normalizedStatus)) || null;
    }
    getCardStatus(card) {
        if (card.closed)
            return 'Closed';
        // Try to determine status from list name
        const listName = card.list?.name?.toLowerCase() || '';
        if (listName.includes('done') || listName.includes('completed')) {
            return 'Done';
        }
        else if (listName.includes('progress') || listName.includes('doing')) {
            return 'In Progress';
        }
        else if (listName.includes('review') || listName.includes('testing')) {
            return 'Review';
        }
        else {
            return 'To Do';
        }
    }
    async addLabelsToCard(cardId, labelNames) {
        try {
            // Get board labels
            const labelsResponse = await this.client.get(`/boards/${this.boardId}/labels`);
            const boardLabels = labelsResponse.data;
            for (const labelName of labelNames) {
                let label = boardLabels.find((l) => l.name === labelName);
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
        }
        catch (error) {
            console.warn('Failed to add labels to card:', error);
        }
    }
    async updateCardLabels(cardId, newLabels) {
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
            const currentLabelNames = currentLabels.map((label) => label.name);
            const labelsToAdd = newLabels.filter(label => !currentLabelNames.includes(label));
            if (labelsToAdd.length > 0) {
                await this.addLabelsToCard(cardId, labelsToAdd);
            }
        }
        catch (error) {
            console.warn('Failed to update card labels:', error);
        }
    }
    async addMembersToCard(cardId, memberNames) {
        try {
            // Get board members
            const membersResponse = await this.client.get(`/boards/${this.boardId}/members`);
            const boardMembers = membersResponse.data;
            for (const memberName of memberNames) {
                const member = boardMembers.find((m) => m.fullName.includes(memberName) || m.username.includes(memberName));
                if (member) {
                    await this.client.post(`/cards/${cardId}/idMembers`, {
                        value: member.id
                    });
                }
            }
        }
        catch (error) {
            console.warn('Failed to add members to card:', error);
        }
    }
    async updateCardMembers(cardId, newMembers) {
        try {
            // Get current members
            const cardResponse = await this.client.get(`/cards/${cardId}/members`);
            const currentMembers = cardResponse.data;
            // Remove members that are no longer needed
            for (const member of currentMembers) {
                const shouldKeep = newMembers.some(name => member.fullName.includes(name) || member.username.includes(name));
                if (!shouldKeep) {
                    await this.client.delete(`/cards/${cardId}/idMembers/${member.id}`);
                }
            }
            // Add new members
            const currentMemberNames = currentMembers.map((member) => member.fullName);
            const membersToAdd = newMembers.filter(name => !currentMemberNames.some((current) => current.includes(name)));
            if (membersToAdd.length > 0) {
                await this.addMembersToCard(cardId, membersToAdd);
            }
        }
        catch (error) {
            console.warn('Failed to update card members:', error);
        }
    }
    mapTrelloCardToProject(card) {
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
exports.TrelloAdapter = TrelloAdapter;
