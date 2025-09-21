import { CRMSystemConfig } from '../../types/pipeline';
import { BaseCRMAdapter } from './base-crm-adapter';
import { JiraAdapter } from './jira-adapter';
import { AsanaAdapter } from './asana-adapter';
import { TrelloAdapter } from './trello-adapter';

export type SupportedCRMType = 'jira' | 'asana' | 'trello';

export class CRMAdapterFactory {
  private static adapters: Map<string, BaseCRMAdapter> = new Map();

  /**
   * Create or retrieve a CRM adapter instance
   */
  static getAdapter(config: CRMSystemConfig): BaseCRMAdapter {
    const cacheKey = `${config.type}-${config.id}`;
    
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey)!;
    }

    const adapter = this.createAdapter(config);
    this.adapters.set(cacheKey, adapter);
    return adapter;
  }

  /**
   * Create a new CRM adapter instance
   */
  private static createAdapter(config: CRMSystemConfig): BaseCRMAdapter {
    const normalizedType = this.normalizeCRMType(config.type);

    switch (normalizedType) {
      case 'jira':
        return new JiraAdapter(config);
      
      case 'asana':
        return new AsanaAdapter(config);
      
      case 'trello':
        return new TrelloAdapter(config);
      
      default:
        throw new Error(`Unsupported CRM type: ${config.type}. Supported types: jira, asana, trello`);
    }
  }

  /**
   * Normalize CRM type to supported types
   */
  private static normalizeCRMType(type: string): SupportedCRMType {
    const normalizedType = type.toLowerCase();
    
    // Map various type variations to supported types
    const typeMapping: { [key: string]: SupportedCRMType } = {
      'jira': 'jira',
      'atlassian': 'jira',
      'asana': 'asana',
      'trello': 'trello'
    };

    const mapped = typeMapping[normalizedType];
    if (!mapped) {
      throw new Error(`Cannot map CRM type '${type}' to a supported adapter`);
    }

    return mapped;
  }

  /**
   * Check if a CRM type is supported
   */
  static isSupported(type: string): boolean {
    try {
      this.normalizeCRMType(type);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of supported CRM types
   */
  static getSupportedTypes(): SupportedCRMType[] {
    return ['jira', 'asana', 'trello'];
  }

  /**
   * Clear cached adapters (useful for testing or configuration changes)
   */
  static clearCache(): void {
    this.adapters.clear();
  }

  /**
   * Remove specific adapter from cache
   */
  static removeFromCache(config: CRMSystemConfig): void {
    const cacheKey = `${config.type}-${config.id}`;
    this.adapters.delete(cacheKey);
  }

  /**
   * Test if an adapter can be created with the given configuration
   */
  static async validateConfiguration(config: CRMSystemConfig): Promise<{
    valid: boolean;
    error?: string;
    adapter?: BaseCRMAdapter;
  }> {
    try {
      const adapter = this.createAdapter(config);
      
      if (!adapter.isConfigured()) {
        return {
          valid: false,
          error: 'Adapter configuration is incomplete. Check credentials and required fields.'
        };
      }

      return {
        valid: true,
        adapter
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}