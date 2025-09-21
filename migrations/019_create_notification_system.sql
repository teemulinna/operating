-- Migration: 019_create_notification_system.sql
-- Description: Create comprehensive notification system for resource management alerts
-- Author: Backend API Developer Agent
-- Date: 2025-09-07

BEGIN;

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  'allocation_conflict',
  'over_allocation',
  'under_allocation',
  'project_deadline',
  'resource_request',
  'skill_gap',
  'capacity_alert',
  'user_activity',
  'system_alert',
  'approval_required',
  'approval_granted',
  'approval_denied'
);

-- Create notification priorities enum
CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Create notification delivery methods enum
CREATE TYPE notification_delivery_method AS ENUM (
  'in_app',
  'email',
  'push',
  'slack',
  'teams',
  'webhook'
);

-- Create notification status enum
CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'expired'
);

-- Create notification templates table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type notification_type NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  html_template TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Template variables and metadata
  variables JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Create notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Delivery method preferences by type
  allocation_conflict_methods notification_delivery_method[] DEFAULT '{in_app,email}',
  over_allocation_methods notification_delivery_method[] DEFAULT '{in_app,email}',
  under_allocation_methods notification_delivery_method[] DEFAULT '{in_app}',
  project_deadline_methods notification_delivery_method[] DEFAULT '{in_app,email}',
  resource_request_methods notification_delivery_method[] DEFAULT '{in_app}',
  skill_gap_methods notification_delivery_method[] DEFAULT '{in_app}',
  capacity_alert_methods notification_delivery_method[] DEFAULT '{in_app,email}',
  user_activity_methods notification_delivery_method[] DEFAULT '{in_app}',
  system_alert_methods notification_delivery_method[] DEFAULT '{in_app,email}',
  approval_required_methods notification_delivery_method[] DEFAULT '{in_app,email}',
  
  -- Quiet hours and batching preferences
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  batch_digest BOOLEAN DEFAULT false,
  batch_frequency_minutes INTEGER DEFAULT 60,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- External integration settings
  slack_channel VARCHAR(100),
  teams_webhook_url TEXT,
  email_address VARCHAR(255),
  push_enabled BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  UNIQUE(user_id)
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  html_content TEXT,
  
  -- Recipient information
  recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES employees(id),
  
  -- Context and metadata
  context JSONB DEFAULT '{}', -- Related entity IDs, additional data
  metadata JSONB DEFAULT '{}', -- Rendering variables, external IDs
  
  -- Delivery tracking
  delivery_methods notification_delivery_method[] NOT NULL DEFAULT '{in_app}',
  status notification_status DEFAULT 'pending',
  
  -- Timing
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Action tracking
  actions JSONB DEFAULT '[]', -- Available actions like "approve", "view", "dismiss"
  action_taken JSONB, -- Record of what action was taken
  action_taken_at TIMESTAMPTZ,
  
  -- Escalation
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Create notification delivery log table
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  delivery_method notification_delivery_method NOT NULL,
  status notification_status NOT NULL,
  
  -- Delivery details
  external_id VARCHAR(255), -- Email message ID, Slack ts, etc.
  response_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timing
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create escalation rules table
CREATE TABLE notification_escalation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  notification_type notification_type NOT NULL,
  priority notification_priority NOT NULL,
  
  -- Escalation conditions
  escalate_after_minutes INTEGER NOT NULL DEFAULT 60,
  max_escalation_level INTEGER DEFAULT 3,
  
  -- Escalation targets
  escalation_targets JSONB NOT NULL DEFAULT '[]', -- Array of user IDs or roles
  escalation_template_id UUID REFERENCES notification_templates(id),
  
  -- Conditions
  conditions JSONB DEFAULT '{}', -- Additional conditions for escalation
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Create notification batches table for digest notifications
CREATE TABLE notification_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  batch_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly'
  
  -- Batch content
  notification_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  html_content TEXT,
  
  -- Status
  status notification_status DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification batch items junction table
CREATE TABLE notification_batch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES notification_batches(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(batch_id, notification_id)
);

-- Create conflict detection rules table
CREATE TABLE conflict_detection_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Rule definition
  rule_type VARCHAR(50) NOT NULL, -- 'over_allocation', 'skill_conflict', 'availability_conflict'
  threshold_value DECIMAL(10,4), -- e.g., 1.0 for 100% allocation
  conditions JSONB NOT NULL DEFAULT '{}',
  
  -- Notification settings
  notification_template_id UUID REFERENCES notification_templates(id),
  priority notification_priority DEFAULT 'medium',
  auto_escalate BOOLEAN DEFAULT false,
  
  -- Rule status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Create detected conflicts table
CREATE TABLE detected_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES conflict_detection_rules(id),
  
  -- Conflict details
  conflict_type VARCHAR(50) NOT NULL,
  severity notification_priority NOT NULL DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Affected entities
  affected_employees UUID[] DEFAULT '{}',
  affected_projects UUID[] DEFAULT '{}',
  affected_allocations UUID[] DEFAULT '{}',
  
  -- Conflict data
  conflict_data JSONB NOT NULL DEFAULT '{}',
  current_value DECIMAL(10,4),
  threshold_value DECIMAL(10,4),
  
  -- Resolution
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'ignored'
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  
  -- Auto-created notification
  notification_id UUID REFERENCES notifications(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_status ON notifications(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_priority ON notifications(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_context ON notifications USING GIN(context) WHERE deleted_at IS NULL;

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_notification_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX idx_notification_delivery_log_status ON notification_delivery_log(status);
CREATE INDEX idx_notification_delivery_log_attempted ON notification_delivery_log(attempted_at);

CREATE INDEX idx_detected_conflicts_rule ON detected_conflicts(rule_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_detected_conflicts_status ON detected_conflicts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_detected_conflicts_severity ON detected_conflicts(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_detected_conflicts_employees ON detected_conflicts USING GIN(affected_employees) WHERE deleted_at IS NULL;

CREATE INDEX idx_notification_batches_recipient ON notification_batches(recipient_id);
CREATE INDEX idx_notification_batches_status ON notification_batches(status);
CREATE INDEX idx_notification_batches_scheduled ON notification_batches(scheduled_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_notification_escalation_rules_updated_at
  BEFORE UPDATE ON notification_escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_notification_batches_updated_at
  BEFORE UPDATE ON notification_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_conflict_detection_rules_updated_at
  BEFORE UPDATE ON conflict_detection_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_detected_conflicts_updated_at
  BEFORE UPDATE ON detected_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification templates
INSERT INTO notification_templates (name, type, title_template, message_template, html_template, variables) VALUES
  ('allocation_conflict', 'allocation_conflict', 
   'Resource Allocation Conflict Detected', 
   'Employee {{employeeName}} has conflicting allocations. Total allocation: {{totalAllocation}}%',
   '<div><strong>⚠️ Allocation Conflict</strong><br/>Employee <strong>{{employeeName}}</strong> has conflicting allocations.<br/>Total allocation: <span style="color: red;">{{totalAllocation}}%</span></div>',
   '{"employeeName": "string", "totalAllocation": "number"}'::jsonb),
   
  ('over_allocation', 'over_allocation',
   'Over-Allocation Alert',
   'Employee {{employeeName}} is over-allocated at {{allocationPercentage}}% ({{hoursOverAllocated}} hours over capacity)',
   '<div><strong>🔴 Over-Allocation Alert</strong><br/>Employee <strong>{{employeeName}}</strong> is over-allocated at <span style="color: red;">{{allocationPercentage}}%</span><br/>(<strong>{{hoursOverAllocated}}</strong> hours over capacity)</div>',
   '{"employeeName": "string", "allocationPercentage": "number", "hoursOverAllocated": "number"}'::jsonb),
   
  ('project_deadline', 'project_deadline',
   'Project Deadline Approaching',
   'Project {{projectName}} has a deadline in {{daysRemaining}} days and may be at risk',
   '<div><strong>📅 Deadline Alert</strong><br/>Project <strong>{{projectName}}</strong> has a deadline in <strong>{{daysRemaining}}</strong> days and may be at risk</div>',
   '{"projectName": "string", "daysRemaining": "number"}'::jsonb),
   
  ('skill_gap', 'skill_gap',
   'Skill Gap Identified',
   'Project {{projectName}} requires {{skillName}} but no available team members have this skill',
   '<div><strong>🎯 Skill Gap Alert</strong><br/>Project <strong>{{projectName}}</strong> requires <strong>{{skillName}}</strong> but no available team members have this skill</div>',
   '{"projectName": "string", "skillName": "string"}'::jsonb);

-- Insert default conflict detection rules
INSERT INTO conflict_detection_rules (name, description, rule_type, threshold_value, conditions, priority) VALUES
  ('Over Allocation 100%', 'Detect when employee allocation exceeds 100%', 'over_allocation', 1.0, 
   '{"check_frequency": "hourly", "min_duration_hours": 1}'::jsonb, 'high'),
   
  ('Critical Over Allocation 120%', 'Detect when employee allocation exceeds 120%', 'over_allocation', 1.2, 
   '{"check_frequency": "immediate", "alert_managers": true}'::jsonb, 'critical'),
   
  ('Skill Conflict', 'Detect when required skills are not available', 'skill_conflict', null, 
   '{"check_project_start": true, "advance_warning_days": 7}'::jsonb, 'medium');

-- Insert default escalation rules
INSERT INTO notification_escalation_rules (name, notification_type, priority, escalate_after_minutes, max_escalation_level, escalation_targets) VALUES
  ('Critical Over Allocation Escalation', 'over_allocation', 'critical', 30, 2, 
   '[{"type": "role", "value": "manager"}, {"type": "role", "value": "admin"}]'::jsonb),
   
  ('Project Deadline Escalation', 'project_deadline', 'high', 60, 3,
   '[{"type": "role", "value": "project_manager"}, {"type": "role", "value": "department_head"}]'::jsonb);

COMMIT;