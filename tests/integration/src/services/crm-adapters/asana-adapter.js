"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsanaAdapter = void 0;
const axios_1 = require("axios");
const base_crm_adapter_1 = require("./base-crm-adapter");
class AsanaAdapter extends base_crm_adapter_1.BaseCRMAdapter {
    constructor(config) {
        super(config);
        const token = config.credentials.accessToken || process.env.ASANA_ACCESS_TOKEN;
        this.workspaceGid = config.credentials.workspaceGid || process.env.ASANA_WORKSPACE_GID || '';
        this.projectGid = config.credentials.projectGid;
        if (!token) {
            throw new Error('Asana access token is required');
        }
        this.client = axios_1.default.create({
            baseURL: 'https://app.asana.com/api/1.0',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }
    async testConnection() {
        const startTime = Date.now();
        try {
            const response = await this.client.get('/users/me');
            const responseTime = Date.now() - startTime;
            return {
                success: true,
                message: 'Asana connection successful',
                details: {
                    responseTime,
                    userInfo: {
                        name: response.data.data.name,
                        email: response.data.data.email,
                        gid: response.data.data.gid,
                    }
                }
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                message: `Asana connection failed: ${error.response?.data?.errors?.[0]?.message || error.message}`,
                details: {
                    responseTime,
                    error: error.response?.status || 'Network Error'
                }
            };
        }
    }
    async createProject(project) {
        try {
            const taskData = {
                data: {
                    name: project.name,
                    notes: project.description || '',
                    ...(this.projectGid && {
                        projects: [this.projectGid]
                    })
                }
            };
            if (project.dueDate) {
                taskData.data.due_on = project.dueDate;
            }
            const response = await this.client.post('/tasks', taskData);
            const taskGid = response.data.data.gid;
            // Add tags if specified
            if (project.labels?.length) {
                await this.addTagsToTask(taskGid, project.labels);
            }
            // Get the created task to return full details
            const createdTask = await this.client.get(`/tasks/${taskGid}`, {
                params: {
                    opt_fields: 'gid,name,notes,completed,created_at,modified_at,assignee.gid,assignee.name,tags.gid,tags.name,due_on'
                }
            });
            return this.mapAsanaTaskToProject(createdTask.data.data);
        }
        catch (error) {
            throw new Error(`Failed to create Asana task: ${error.response?.data?.errors?.[0]?.message || error.message}`);
        }
    }
    async updateProject(id, updates) {
        try {
            const updateData = {
                data: {}
            };
            if (updates.name) {
                updateData.data.name = updates.name;
            }
            if (updates.description) {
                updateData.data.notes = updates.description;
            }
            if (updates.dueDate) {
                updateData.data.due_on = updates.dueDate;
            }
            if (updates.status) {
                updateData.data.completed = updates.status.toLowerCase() === 'completed' || updates.status.toLowerCase() === 'done';
            }
            await this.client.put(`/tasks/${id}`, updateData);
            // Handle tags separately
            if (updates.labels) {
                await this.updateTaskTags(id, updates.labels);
            }
            // Get the updated task
            const updatedTask = await this.client.get(`/tasks/${id}`, {
                params: {
                    opt_fields: 'gid,name,notes,completed,created_at,modified_at,assignee.gid,assignee.name,tags.gid,tags.name,due_on'
                }
            });
            return this.mapAsanaTaskToProject(updatedTask.data.data);
        }
        catch (error) {
            throw new Error(`Failed to update Asana task: ${error.response?.data?.errors?.[0]?.message || error.message}`);
        }
    }
    async getProject(id) {
        try {
            const response = await this.client.get(`/tasks/${id}`, {
                params: {
                    opt_fields: 'gid,name,notes,completed,created_at,modified_at,assignee.gid,assignee.name,tags.gid,tags.name,due_on'
                }
            });
            return this.mapAsanaTaskToProject(response.data.data);
        }
        catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw new Error(`Failed to get Asana task: ${error.response?.data?.errors?.[0]?.message || error.message}`);
        }
    }
    async listProjects(filters) {
        try {
            const params = {
                opt_fields: 'gid,name,notes,completed,created_at,modified_at,assignee.gid,assignee.name,tags.gid,tags.name,due_on',
                limit: filters?.limit || 50
            };
            let endpoint = `/workspaces/${this.workspaceGid}/tasks/search`;
            if (this.projectGid) {
                endpoint = `/projects/${this.projectGid}/tasks`;
            }
            // Add filters
            if (filters?.status?.length) {
                const isCompleted = filters.status.some(s => s.toLowerCase() === 'completed' || s.toLowerCase() === 'done');
                params.completed = isCompleted;
            }
            if (filters?.assignee) {
                params.assignee = filters.assignee;
            }
            const response = await this.client.get(endpoint, { params });
            return response.data.data.map((task) => this.mapAsanaTaskToProject(task));
        }
        catch (error) {
            throw new Error(`Failed to list Asana tasks: ${error.response?.data?.errors?.[0]?.message || error.message}`);
        }
    }
    async deleteProject(id) {
        try {
            await this.client.delete(`/tasks/${id}`);
            return true;
        }
        catch (error) {
            if (error.response?.status === 404) {
                return false;
            }
            throw new Error(`Failed to delete Asana task: ${error.response?.data?.errors?.[0]?.message || error.message}`);
        }
    }
    isConfigured() {
        const token = this.config.credentials.accessToken || process.env.ASANA_ACCESS_TOKEN;
        return !!(token && this.workspaceGid);
    }
    async addTagsToTask(taskGid, tags) {
        for (const tagName of tags) {
            try {
                // First, try to find existing tag
                const tagsResponse = await this.client.get(`/workspaces/${this.workspaceGid}/tags`, {
                    params: { opt_fields: 'gid,name' }
                });
                let tagGid = tagsResponse.data.data.find((tag) => tag.name === tagName)?.gid;
                // Create tag if it doesn't exist
                if (!tagGid) {
                    const createTagResponse = await this.client.post('/tags', {
                        data: {
                            name: tagName,
                            workspace: this.workspaceGid
                        }
                    });
                    tagGid = createTagResponse.data.data.gid;
                }
                // Add tag to task
                await this.client.post(`/tasks/${taskGid}/addTag`, {
                    data: { tag: tagGid }
                });
            }
            catch (error) {
                console.warn(`Failed to add tag ${tagName} to task:`, error);
            }
        }
    }
    async updateTaskTags(taskGid, newTags) {
        try {
            // Get current tags
            const taskResponse = await this.client.get(`/tasks/${taskGid}`, {
                params: { opt_fields: 'tags.gid,tags.name' }
            });
            const currentTags = taskResponse.data.data.tags || [];
            // Remove tags that are no longer needed
            for (const tag of currentTags) {
                if (!newTags.includes(tag.name)) {
                    await this.client.post(`/tasks/${taskGid}/removeTag`, {
                        data: { tag: tag.gid }
                    });
                }
            }
            // Add new tags
            const currentTagNames = currentTags.map((tag) => tag.name);
            const tagsToAdd = newTags.filter(tag => !currentTagNames.includes(tag));
            if (tagsToAdd.length > 0) {
                await this.addTagsToTask(taskGid, tagsToAdd);
            }
        }
        catch (error) {
            console.warn('Failed to update task tags:', error);
        }
    }
    mapAsanaTaskToProject(task) {
        return {
            id: task.gid,
            name: task.name,
            description: task.notes || '',
            status: task.completed ? 'Completed' : 'In Progress',
            createdAt: task.created_at,
            updatedAt: task.modified_at,
            assignees: task.assignee ? [task.assignee.name] : [],
            labels: task.tags ? task.tags.map(tag => tag.name) : [],
            dueDate: task.due_on
        };
    }
}
exports.AsanaAdapter = AsanaAdapter;
