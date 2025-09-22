-- ============================================
-- AVAILABILITY PATTERNS AND EXCEPTIONS
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Availability patterns table
CREATE TABLE IF NOT EXISTS availability_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('weekly', 'biweekly', 'monthly', 'custom')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  weekly_hours JSONB DEFAULT '{
    "monday": 8,
    "tuesday": 8,
    "wednesday": 8,
    "thursday": 8,
    "friday": 8,
    "saturday": 0,
    "sunday": 0
  }'::jsonb,
  custom_dates JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add partial unique index for active patterns
CREATE UNIQUE INDEX unique_active_pattern ON availability_patterns (employee_id)
WHERE is_active = true;

-- Availability exceptions table
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('holiday', 'leave', 'training', 'other')),
  exception_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  hours_affected DECIMAL(4,2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT exception_date_range CHECK (end_date IS NULL OR end_date >= exception_date)
);

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  country VARCHAR(2),
  region VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for holidays
CREATE UNIQUE INDEX unique_holiday ON holidays (holiday_date, country, region)
WHERE country IS NOT NULL AND region IS NOT NULL;

CREATE UNIQUE INDEX unique_holiday_country ON holidays (holiday_date, country)
WHERE country IS NOT NULL AND region IS NULL;

CREATE UNIQUE INDEX unique_holiday_global ON holidays (holiday_date)
WHERE country IS NULL AND region IS NULL;

-- Availability alerts configuration table
CREATE TABLE IF NOT EXISTS availability_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL,
  threshold DECIMAL(10,2),
  recipients TEXT[],
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_alert_type UNIQUE (alert_type)
);

-- Availability alerts queue table
CREATE TABLE IF NOT EXISTS availability_alerts_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_patterns_employee_id ON availability_patterns(employee_id);
CREATE INDEX IF NOT EXISTS idx_availability_patterns_active ON availability_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_availability_patterns_dates ON availability_patterns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_employee_id ON availability_exceptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_date ON availability_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_status ON availability_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_recurring ON holidays(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_availability_alerts_queue_processed ON availability_alerts_queue(processed) WHERE processed = false;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_availability_patterns_updated_at
  BEFORE UPDATE ON availability_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_exceptions_updated_at
  BEFORE UPDATE ON availability_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_alerts_updated_at
  BEFORE UPDATE ON availability_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample holidays for 2024-2025 (US Federal)
INSERT INTO holidays (name, holiday_date, is_recurring, country, metadata) VALUES
  ('New Year''s Day', '2024-01-01', true, 'US', '{"federal": true}'::jsonb),
  ('Martin Luther King Jr. Day', '2024-01-15', true, 'US', '{"federal": true, "observedOn": "third Monday of January"}'::jsonb),
  ('Presidents'' Day', '2024-02-19', true, 'US', '{"federal": true, "observedOn": "third Monday of February"}'::jsonb),
  ('Memorial Day', '2024-05-27', true, 'US', '{"federal": true, "observedOn": "last Monday of May"}'::jsonb),
  ('Independence Day', '2024-07-04', true, 'US', '{"federal": true}'::jsonb),
  ('Labor Day', '2024-09-02', true, 'US', '{"federal": true, "observedOn": "first Monday of September"}'::jsonb),
  ('Columbus Day', '2024-10-14', true, 'US', '{"federal": true, "observedOn": "second Monday of October"}'::jsonb),
  ('Veterans Day', '2024-11-11', true, 'US', '{"federal": true}'::jsonb),
  ('Thanksgiving', '2024-11-28', true, 'US', '{"federal": true, "observedOn": "fourth Thursday of November"}'::jsonb),
  ('Christmas Day', '2024-12-25', true, 'US', '{"federal": true}'::jsonb),
  ('New Year''s Day', '2025-01-01', true, 'US', '{"federal": true}'::jsonb),
  ('Martin Luther King Jr. Day', '2025-01-20', true, 'US', '{"federal": true, "observedOn": "third Monday of January"}'::jsonb),
  ('Presidents'' Day', '2025-02-17', true, 'US', '{"federal": true, "observedOn": "third Monday of February"}'::jsonb),
  ('Memorial Day', '2025-05-26', true, 'US', '{"federal": true, "observedOn": "last Monday of May"}'::jsonb),
  ('Independence Day', '2025-07-04', true, 'US', '{"federal": true}'::jsonb),
  ('Labor Day', '2025-09-01', true, 'US', '{"federal": true, "observedOn": "first Monday of September"}'::jsonb),
  ('Columbus Day', '2025-10-13', true, 'US', '{"federal": true, "observedOn": "second Monday of October"}'::jsonb),
  ('Veterans Day', '2025-11-11', true, 'US', '{"federal": true}'::jsonb),
  ('Thanksgiving', '2025-11-27', true, 'US', '{"federal": true, "observedOn": "fourth Thursday of November"}'::jsonb),
  ('Christmas Day', '2025-12-25', true, 'US', '{"federal": true}'::jsonb)
ON CONFLICT DO NOTHING;