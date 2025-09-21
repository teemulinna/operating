export { BaseCRMAdapter } from './base-crm-adapter';
export { JiraAdapter } from './jira-adapter';
export { AsanaAdapter } from './asana-adapter';
export { TrelloAdapter } from './trello-adapter';
export { CRMAdapterFactory, type SupportedCRMType } from './adapter-factory';

// Re-export types for convenience
export type { CRMProject, CRMConnectionTest } from './base-crm-adapter';