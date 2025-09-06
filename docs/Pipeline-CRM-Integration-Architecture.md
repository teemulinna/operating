# Pipeline CRM Integration Architecture Documentation

## Overview

The Project Pipeline Integration feature provides comprehensive CRM integration capabilities for pipeline-based resource planning. This system enables bidirectional data synchronization between the employee management system and external CRM platforms, with advanced resource demand forecasting and scenario planning integration.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   CRM Systems   │◄──►│  Integration    │◄──►│   Resource      │
│   (External)    │    │     Layer       │    │  Management     │
│                 │    │                 │    │    System       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Scenario       │◄──►│   Pipeline      │◄──►│   Analytics     │
│  Planning       │    │  Management     │    │   & Reporting   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

#### 1. Pipeline Management Service (`/src/services/pipeline-management.service.ts`)
- CRUD operations for pipeline projects
- Resource demand calculation
- Risk assessment and probability tracking
- Pipeline analytics and forecasting

#### 2. CRM Integration Service (`/src/services/crm-integration.service.ts`)
- Multi-CRM system support (Salesforce, HubSpot, Pipedrive, Dynamics)
- Bidirectional data synchronization
- Conflict resolution and data mapping
- Real-time sync monitoring

#### 3. Pipeline-Scenario Integration Service (`/src/services/pipeline-scenario-integration.service.ts`)
- Scenario generation from pipeline data
- Resource demand forecasting
- What-if analysis capabilities
- Combined analytics across pipeline and scenarios

### Database Schema

#### Core Tables

##### `pipeline_projects`
Stores sales pipeline opportunities with resource requirements
```sql
- id (UUID, PK)
- crm_id (VARCHAR) - External CRM record ID
- crm_source (VARCHAR) - Source CRM system
- name, description, client_name, client_contact
- stage (ENUM: lead, prospect, opportunity, proposal, negotiation, won, lost, on-hold)
- priority (ENUM: low, medium, high, critical)
- probability (INTEGER 0-100)
- estimated_value (DECIMAL)
- estimated_start_date, estimated_duration
- required_skills (JSONB array)
- risk_factors (JSONB array)
- sync_status (ENUM: synced, pending, failed, conflict)
```

##### `pipeline_resource_demands`
Detailed resource requirements for each pipeline project
```sql
- id (UUID, PK)
- pipeline_project_id (FK)
- skill_category, experience_level
- required_count, allocation_percentage
- start_date, end_date, hourly_rate
- is_critical, alternatives (JSONB)
```

##### `crm_systems`
CRM system configurations and authentication
```sql
- id (UUID, PK)
- name, type, api_url, api_version
- auth_type, credentials (JSONB encrypted)
- sync_settings (JSONB)
- is_active, last_sync_at
```

##### `crm_sync_operations`
Synchronization operation tracking and monitoring
```sql
- id (UUID, PK)
- crm_system_id (FK)
- operation, direction, status
- progress (JSONB), results (JSONB)
- started_at, completed_at, duration
```

## API Endpoints

### Pipeline Project Management

#### `POST /api/pipeline/projects`
Create a new pipeline project
```typescript
interface CreatePipelineProjectRequest {
  name: string;
  description?: string;
  clientName: string;
  clientContact?: ClientContact;
  stage: PipelineStage;
  priority: PipelinePriority;
  probability: number; // 0-100
  estimatedValue: number;
  estimatedStartDate: string; // ISO date
  estimatedDuration: number; // days
  requiredSkills: string[];
  resourceDemand: ResourceDemand[];
  competitorInfo?: CompetitorInfo[];
  riskFactors: RiskFactor[];
  notes?: string;
  tags: string[];
}
```

#### `GET /api/pipeline/projects`
Retrieve pipeline projects with filtering
- Query parameters: stage, priority, clientName, probabilityMin/Max, valueMin/Max, search
- Response includes calculated weighted values and availability scores

#### `PUT /api/pipeline/projects/:id`
Update pipeline project (supports drag-and-drop stage updates)

#### `GET /api/pipeline/analytics`
Comprehensive pipeline analytics including:
- Conversion rates by stage
- Resource demand forecasting
- Win/loss analysis
- Pipeline trends and projections

### CRM Integration

#### `POST /api/pipeline/crm-systems`
Configure CRM system integration
```typescript
interface CRMSystemConfig {
  name: string;
  type: 'salesforce' | 'hubspot' | 'pipedrive' | 'dynamics' | 'custom';
  apiUrl: string;
  authType: 'oauth' | 'api-key' | 'basic' | 'bearer';
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  syncSettings: CRMSyncSettings;
}
```

#### `POST /api/pipeline/crm-sync`
Start synchronization operation
```typescript
interface CRMSyncRequest {
  crmSystemId: string;
  operation: 'sync' | 'import' | 'export';
  direction?: 'bidirectional' | 'to-crm' | 'from-crm';
  filters?: SyncFilters;
  options?: SyncOptions;
}
```

#### `GET /api/pipeline/crm-sync/operations`
Monitor sync operations with real-time status updates

#### `POST /api/pipeline/crm-systems/:id/test-connection`
Test CRM connectivity and authentication

### Data Synchronization

#### Field Mapping Configuration
```typescript
interface CRMFieldMapping {
  systemField: string; // Internal field name
  crmField: string;    // CRM field name
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  transform?: string;  // JavaScript expression for data transformation
  isRequired: boolean;
  direction: 'bidirectional' | 'to-crm' | 'from-crm';
}
```

#### Conflict Resolution
```typescript
type ConflictResolution = 'crm-wins' | 'system-wins' | 'manual' | 'timestamp';
```

## Frontend Components

### Pipeline Board (`/frontend/src/components/pipeline/PipelineBoard.tsx`)
- Drag-and-drop Kanban interface
- Real-time sync status indicators
- Stage-based project organization
- Filtering and search capabilities

### Pipeline Project Card (`/frontend/src/components/pipeline/PipelineProjectCard.tsx`)
- Compact project visualization
- Risk indicators and availability scores
- Quick sync and edit actions
- Resource demand preview

### Key Features
- **Responsive Design**: Optimized for desktop and tablet use
- **Real-time Updates**: WebSocket integration for live sync status
- **Error Handling**: Graceful degradation and user feedback
- **Loading States**: Progressive loading and skeleton screens

## Integration with Existing Systems

### Scenario Planning Integration

The pipeline integration seamlessly connects with the existing scenario planning system:

#### Scenario Generation from Pipeline
```typescript
// Create scenarios from pipeline projects with different conversion rates
const scenario = await pipelineIntegrationService.createScenarioFromPipeline({
  name: "Q3 Pipeline Forecast",
  pipelineProjectIds: [...projectIds],
  conversionRates: {
    lead: 0.2,
    prospect: 0.3,
    opportunity: 0.6,
    proposal: 0.8,
    negotiation: 0.9
  }
});
```

#### Resource Demand Forecasting
```typescript
// Generate combined forecast from pipeline and scenarios
const forecast = await pipelineIntegrationService.generateResourceForecast({
  includeActiveScenariosOnly: true,
  forecastMonths: 12,
  confidenceThreshold: 0.5
});
```

#### What-if Analysis
```typescript
// Compare different conversion rate scenarios
const analysis = await pipelineIntegrationService.runWhatIfAnalysis({
  pipelineProjectIds: [...projectIds],
  conversionScenarios: [
    { name: "Conservative", conversionRates: {...} },
    { name: "Optimistic", conversionRates: {...} }
  ]
});
```

### Employee Management System Integration

Pipeline resource demands automatically integrate with:
- **Skill Matching**: Automatic matching of required skills to available employees
- **Capacity Planning**: Resource demand feeds into weekly capacity calculations
- **Availability Scoring**: Real-time assessment of resource availability for projects

## Security & Privacy

### Authentication & Authorization
- JWT-based authentication for API access
- Role-based access control (RBAC) for pipeline management
- CRM system credentials encrypted at rest

### Data Privacy
- GDPR compliance for client contact information
- Audit logging for all CRM sync operations
- Data retention policies for sync history

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Performance Optimization

### Database Optimization
- Indexed queries on commonly filtered fields
- Materialized views for analytics
- Connection pooling and query optimization
- Archival strategies for historical data

### Caching Strategy
- Redis caching for frequently accessed data
- Resource availability cache with automatic invalidation
- Sync operation status caching

### Background Processing
- Asynchronous CRM sync operations
- Queue-based processing for large data imports
- Retry logic with exponential backoff

## Monitoring & Observability

### Metrics & KPIs
- Pipeline conversion rates by stage
- Resource utilization forecasts
- Sync operation success rates
- API response times and error rates

### Logging & Alerting
- Structured logging for all operations
- CRM sync failure alerts
- Performance threshold monitoring
- Audit trail for data changes

### Health Checks
- CRM system connectivity monitoring
- Database health and connection status
- Background job queue monitoring

## Testing Strategy

### Integration Testing
Comprehensive test suite with real API calls:
- Pipeline CRUD operations
- CRM synchronization workflows
- Resource demand calculations
- Scenario integration testing

### Test Coverage
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Performance testing for large datasets

### Mock CRM Implementation
Built-in mock CRM for development and testing:
- Simulates common CRM operations
- Configurable response times and failure rates
- Test data generation and cleanup

## Deployment & Configuration

### Environment Variables
```bash
# CRM Integration
CRM_ENCRYPTION_KEY=your-encryption-key
CRM_WEBHOOK_SECRET=webhook-secret

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Cache
REDIS_URL=redis://localhost:6379

# API Configuration
PIPELINE_SYNC_INTERVAL=30 # minutes
MAX_SYNC_OPERATIONS=5
```

### Configuration Files
- CRM system templates in database
- Field mapping configurations
- Default conversion rates by industry

## Maintenance & Support

### Regular Maintenance
- CRM API version updates
- Performance optimization reviews
- Data cleanup and archival
- Security patches and updates

### Troubleshooting Guide
- Common CRM sync issues and resolutions
- Performance bottleneck identification
- Data consistency validation procedures
- Rollback procedures for failed deployments

## Future Enhancements

### Planned Features
1. **AI-Powered Forecasting**: Machine learning models for probability prediction
2. **Advanced Analytics**: Predictive analytics and trend analysis
3. **Mobile Application**: React Native app for pipeline management
4. **Workflow Automation**: Automated stage transitions and notifications
5. **Custom Dashboards**: User-configurable analytics dashboards

### API Evolution
- GraphQL API for complex queries
- WebSocket API for real-time updates
- Webhook support for external integrations
- RESTful pagination improvements

This architecture provides a robust, scalable foundation for CRM-integrated pipeline management with comprehensive resource planning capabilities.