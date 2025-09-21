# CRM Integration Adapters

This directory contains real CRM integration adapters that replace the mock implementations in the CRM integration service.

## Supported CRM Systems

### JIRA (Atlassian)
- **Authentication**: Basic authentication with API token
- **Features**: Create, update, get, list, and delete issues
- **Configuration**:
  - `apiUrl`: Your JIRA instance URL (e.g., `https://yourcompany.atlassian.net`)
  - `credentials.apiToken`: Your JIRA API token
  - `credentials.userEmail`: Your email address
  - `credentials.projectKey`: JIRA project key

### Asana
- **Authentication**: Personal Access Token or OAuth2
- **Features**: Create, update, get, list, and delete tasks
- **Configuration**:
  - `credentials.accessToken`: Your Asana Personal Access Token
  - `credentials.workspaceGid`: Your workspace GID
  - `credentials.projectGid`: (Optional) Specific project GID

### Trello
- **Authentication**: API Key and Token
- **Features**: Create, update, get, list, and delete cards
- **Configuration**:
  - `credentials.apiKey`: Your Trello API key
  - `credentials.token`: Your Trello token
  - `credentials.boardId`: Your default board ID

## Usage

The adapters are automatically instantiated through the `CRMAdapterFactory` based on the CRM system configuration:

```typescript
import { CRMAdapterFactory } from './services/crm-adapters';

// Get adapter instance
const adapter = CRMAdapterFactory.getAdapter(crmSystemConfig);

// Test connection
const result = await adapter.testConnection();

// Create project
const project = await adapter.createProject({
  name: 'New Project',
  description: 'Project description',
  priority: 'High',
  labels: ['urgent', 'client-work']
});
```

## Environment Variables

Add these environment variables to your `.env` file:

```env
# JIRA Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_API_TOKEN=your_jira_api_token
JIRA_USER_EMAIL=your_email@example.com

# Asana Configuration
ASANA_ACCESS_TOKEN=your_asana_personal_access_token
ASANA_WORKSPACE_GID=your_workspace_gid

# Trello Configuration
TRELLO_API_KEY=your_trello_api_key
TRELLO_TOKEN=your_trello_token
TRELLO_BOARD_ID=your_default_board_id
```

## Architecture

- **BaseCRMAdapter**: Abstract base class defining the common interface
- **CRMAdapterFactory**: Factory class for creating and caching adapter instances
- **Specific Adapters**: JIRA, Asana, and Trello implementations
- **Error Handling**: Comprehensive error handling with fallbacks
- **Caching**: Adapter instances are cached for performance

## Testing

Run the adapter tests:

```bash
npm test -- tests/unit/services/crm-adapters.test.ts
```

## Integration

The adapters integrate seamlessly with the existing CRM integration service:
- Real connection testing (replaces mock on line 161)
- Real project creation with actual CRM IDs (replaces mock on line 203)
- Real project synchronization from CRM (replaces mock on line 212)

## Error Handling

All adapters include:
- Network timeout handling (10 second timeout)
- API error response parsing
- Fallback error messages
- Connection validation

## Rate Limiting

Each CRM system has its own rate limits:
- **JIRA**: 10 requests per second per IP
- **Asana**: 150 requests per minute per user
- **Trello**: 300 requests per 10 seconds per token

The adapters handle rate limiting gracefully with appropriate error messages.