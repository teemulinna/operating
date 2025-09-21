#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface StitchDesign {
  id: string;
  title: string;
  description: string;
  platform: 'mobile' | 'web';
  components: any[];
  createdAt: string;
  updatedAt: string;
}

interface StitchGenerationRequest {
  prompt: string;
  platform: 'mobile' | 'web';
  style?: string;
  colorScheme?: string;
}

class StitchMCPServer {
  private server: Server;
  private apiBaseUrl: string;
  private apiKey: string;

  constructor() {
    this.server = new Server(
      {
        name: 'stitch-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiBaseUrl = process.env.STITCH_API_URL || 'https://app-companion-430619.appspot.com/api';
    this.apiKey = process.env.STITCH_API_KEY || '';

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_design',
            description: 'Generate a UI design using Google Stitch AI',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Description of the UI design to generate',
                },
                platform: {
                  type: 'string',
                  enum: ['mobile', 'web'],
                  description: 'Target platform for the design',
                },
                style: {
                  type: 'string',
                  description: 'Design style (e.g., modern, minimalist, colorful)',
                },
                colorScheme: {
                  type: 'string',
                  description: 'Color scheme preference',
                },
              },
              required: ['prompt', 'platform'],
            },
          },
          {
            name: 'get_design',
            description: 'Retrieve a specific design by ID',
            inputSchema: {
              type: 'object',
              properties: {
                designId: {
                  type: 'string',
                  description: 'The ID of the design to retrieve',
                },
              },
              required: ['designId'],
            },
          },
          {
            name: 'list_designs',
            description: 'List all designs in the user\'s account',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of designs to return',
                  default: 10,
                },
                platform: {
                  type: 'string',
                  enum: ['mobile', 'web'],
                  description: 'Filter by platform',
                },
              },
            },
          },
          {
            name: 'export_design',
            description: 'Export a design in various formats',
            inputSchema: {
              type: 'object',
              properties: {
                designId: {
                  type: 'string',
                  description: 'The ID of the design to export',
                },
                format: {
                  type: 'string',
                  enum: ['json', 'figma', 'react', 'html'],
                  description: 'Export format',
                },
              },
              required: ['designId', 'format'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_design':
            return await this.generateDesign(args as unknown as StitchGenerationRequest);
          case 'get_design':
            return await this.getDesign(args as unknown as { designId: string });
          case 'list_designs':
            return await this.listDesigns(args as unknown as { limit?: number; platform?: string });
          case 'export_design':
            return await this.exportDesign(args as unknown as { designId: string; format: string });
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  private async generateDesign(request: StitchGenerationRequest) {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY environment variable is required');
    }

    const response = await axios.post(
      `${this.apiBaseUrl}/generate`,
      {
        prompt: request.prompt,
        platform: request.platform,
        style: request.style,
        colorScheme: request.colorScheme,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      content: [
        {
          type: 'text',
          text: `Design generated successfully!\n\nDesign ID: ${response.data.id}\nTitle: ${response.data.title}\nPlatform: ${response.data.platform}\nComponents: ${response.data.components.length} components generated`,
        },
      ],
    };
  }

  private async getDesign(args: { designId: string }) {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY environment variable is required');
    }

    const response = await axios.get(
      `${this.apiBaseUrl}/designs/${args.designId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const design: StitchDesign = response.data;
    return {
      content: [
        {
          type: 'text',
          text: `Design Details:\n\nID: ${design.id}\nTitle: ${design.title}\nDescription: ${design.description}\nPlatform: ${design.platform}\nComponents: ${design.components.length}\nCreated: ${design.createdAt}\nUpdated: ${design.updatedAt}`,
        },
      ],
    };
  }

  private async listDesigns(args: { limit?: number; platform?: string }) {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY environment variable is required');
    }

    const params = new URLSearchParams();
    if (args.limit) params.append('limit', args.limit.toString());
    if (args.platform) params.append('platform', args.platform);

    const response = await axios.get(
      `${this.apiBaseUrl}/designs?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const designs: StitchDesign[] = response.data.designs || [];
    const designList = designs.map(design => 
      `- ${design.title} (${design.platform}) - ID: ${design.id}`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${designs.length} designs:\n\n${designList}`,
        },
      ],
    };
  }

  private async exportDesign(args: { designId: string; format: string }) {
    if (!this.apiKey) {
      throw new Error('STITCH_API_KEY environment variable is required');
    }

    const response = await axios.post(
      `${this.apiBaseUrl}/designs/${args.designId}/export`,
      {
        format: args.format,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      content: [
        {
          type: 'text',
          text: `Design exported successfully!\n\nFormat: ${args.format}\nExport URL: ${response.data.downloadUrl}\nExpires: ${response.data.expiresAt}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Stitch MCP server running on stdio');
  }
}

// Start the server
const server = new StitchMCPServer();
server.run().catch(console.error);