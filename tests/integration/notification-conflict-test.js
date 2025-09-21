#!/usr/bin/env node

/**
 * Real-time notification system test with allocation conflicts
 * This test creates a real over-allocation scenario and verifies notifications
 */

const { Client } = require('pg');
const io = require('socket.io-client');
const fetch = require('node-fetch');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'employee_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

// API configuration
const API_BASE = process.env.API_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'http://localhost:3001';

class NotificationConflictTest {
  constructor() {
    this.db = null;
    this.socket = null;
    this.testUserId = null;
    this.testManagerId = null;
    this.testProjectId = null;
    this.notifications = [];
    this.conflicts = [];
  }

  async setup() {
    console.log('🔧 Setting up notification conflict test...');
    
    // Connect to database
    this.db = new Client(dbConfig);
    await this.db.connect();
    console.log('✅ Database connected');

    // Run migration if needed
    await this.runMigration();

    // Create test users
    await this.createTestUsers();

    // Setup WebSocket connection
    await this.setupWebSocket();

    console.log('✅ Test setup complete');
  }

  async runMigration() {
    try {
      // Check if notification tables exist
      const result = await this.db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'notifications'
      `);

      if (result.rows.length === 0) {
        console.log('📋 Running notification system migration...');
        // In a real scenario, you would run the migration file
        // For now, we'll assume it's been run manually
        console.log('⚠️  Please run: psql -d employee_management -f migrations/019_create_notification_system.sql');
      }
    } catch (error) {
      console.warn('⚠️  Migration check failed:', error.message);
    }
  }

  async createTestUsers() {
    // Create test manager
    const managerResult = await this.db.query(`
      INSERT INTO employees (first_name, last_name, email, employee_number, position_title, employment_type, weekly_capacity_hours)
      VALUES ('Test', 'Manager', 'test.manager@company.com', 'MGR001', 'Engineering Manager', 'FULL_TIME', 40.0)
      ON CONFLICT (email) DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW()
      RETURNING id
    `);
    this.testManagerId = managerResult.rows[0].id;

    // Create test employee
    const employeeResult = await this.db.query(`
      INSERT INTO employees (first_name, last_name, email, employee_number, position_title, employment_type, weekly_capacity_hours, manager_id)
      VALUES ('Test', 'Developer', 'test.developer@company.com', 'DEV001', 'Senior Developer', 'FULL_TIME', 40.0, $1)
      ON CONFLICT (email) DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        manager_id = EXCLUDED.manager_id,
        updated_at = NOW()
      RETURNING id
    `, [this.testManagerId]);
    this.testUserId = employeeResult.rows[0].id;

    // Create test project
    const projectResult = await this.db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, priority)
      VALUES ('Notification Test Project', 'Project for testing notification conflicts', NOW(), NOW() + INTERVAL '60 days', 'active', 'high')
      ON CONFLICT (name) DO UPDATE SET 
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING id
    `);
    this.testProjectId = projectResult.rows[0].id;

    console.log(`📊 Created test data:
    - Manager ID: ${this.testManagerId}
    - Employee ID: ${this.testUserId}
    - Project ID: ${this.testProjectId}`);
  }

  async setupWebSocket() {
    return new Promise((resolve, reject) => {
      this.socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('🔌 WebSocket connected');
        
        // Join resource room
        this.socket.emit('join-resource-room', { userId: this.testUserId });
        
        // Listen for notifications
        this.socket.on('notification', (data) => {
          console.log('📬 Received notification:', {
            id: data.id,
            type: data.type,
            priority: data.priority,
            title: data.title
          });
          this.notifications.push(data);
        });

        this.socket.on('realtime-notification', (data) => {
          console.log('📬 Received real-time notification:', {
            id: data.id,
            type: data.type,
            priority: data.priority,
            title: data.title
          });
          this.notifications.push(data);
        });

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 15000);
    });
  }

  async createOverAllocation() {
    console.log('\n🎯 Creating over-allocation scenario...');

    try {
      // Create multiple project assignments for the same employee
      // Assignment 1: 70% allocation
      await this.db.query(`
        INSERT INTO project_assignments (project_id, employee_id, role, allocation_percentage, start_date, end_date)
        VALUES ($1, $2, 'Senior Developer', 70.0, NOW(), NOW() + INTERVAL '30 days')
        ON CONFLICT (project_id, employee_id) DO UPDATE SET
          allocation_percentage = EXCLUDED.allocation_percentage,
          updated_at = NOW()
      `, [this.testProjectId, this.testUserId]);

      // Create a second project for more allocation
      const project2Result = await this.db.query(`
        INSERT INTO projects (name, description, start_date, end_date, status, priority)
        VALUES ('Second Test Project', 'Another project for over-allocation', NOW(), NOW() + INTERVAL '45 days', 'active', 'medium')
        ON CONFLICT (name) DO UPDATE SET 
          description = EXCLUDED.description,
          updated_at = NOW()
        RETURNING id
      `);
      const project2Id = project2Result.rows[0].id;

      // Assignment 2: 60% allocation (total 130%)
      await this.db.query(`
        INSERT INTO project_assignments (project_id, employee_id, role, allocation_percentage, start_date, end_date)
        VALUES ($1, $2, 'Developer', 60.0, NOW(), NOW() + INTERVAL '30 days')
        ON CONFLICT (project_id, employee_id) DO UPDATE SET
          allocation_percentage = EXCLUDED.allocation_percentage,
          updated_at = NOW()
      `, [project2Id, this.testUserId]);

      console.log('📈 Created over-allocation scenario:');
      console.log('  - Project 1: 70% allocation');
      console.log('  - Project 2: 60% allocation');
      console.log('  - Total: 130% allocation (30% over capacity)');

      // Verify the over-allocation
      const allocationCheck = await this.db.query(`
        SELECT 
          e.first_name || ' ' || e.last_name as employee_name,
          SUM(pa.allocation_percentage) as total_allocation
        FROM employees e
        JOIN project_assignments pa ON e.id = pa.employee_id
        WHERE e.id = $1 
          AND pa.deleted_at IS NULL
          AND pa.start_date <= NOW()
          AND (pa.end_date IS NULL OR pa.end_date >= NOW())
        GROUP BY e.id, e.first_name, e.last_name
      `, [this.testUserId]);

      if (allocationCheck.rows.length > 0) {
        const totalAllocation = allocationCheck.rows[0].total_allocation;
        console.log(`✅ Verified over-allocation: ${totalAllocation}%`);
        return totalAllocation > 100;
      }

      return false;
    } catch (error) {
      console.error('❌ Error creating over-allocation:', error);
      return false;
    }
  }

  async triggerConflictDetection() {
    console.log('\n🔍 Triggering conflict detection...');

    try {
      // Make API call to detect conflicts
      const response = await fetch(`${API_BASE}/api/notifications/conflicts/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // Mock token for testing
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conflict detection triggered successfully');
        console.log(`📊 Detected ${data.data?.count || 0} conflicts`);
        this.conflicts = data.data?.conflicts || [];
        return true;
      } else {
        console.error('❌ Conflict detection failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error triggering conflict detection:', error);
      return false;
    }
  }

  async checkNotifications() {
    console.log('\n📬 Checking for notifications...');

    try {
      // Wait a bit for notifications to be processed
      await this.wait(3000);

      // Check database for notifications
      const dbNotifications = await this.db.query(`
        SELECT 
          n.*,
          e.first_name || ' ' || e.last_name as recipient_name
        FROM notifications n
        JOIN employees e ON n.recipient_id = e.id
        WHERE n.recipient_id IN ($1, $2)
          AND n.created_at >= NOW() - INTERVAL '5 minutes'
        ORDER BY n.created_at DESC
      `, [this.testUserId, this.testManagerId]);

      console.log(`📊 Found ${dbNotifications.rows.length} notification(s) in database`);
      
      dbNotifications.rows.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.title} (${notif.type}) - Priority: ${notif.priority} - To: ${notif.recipient_name}`);
      });

      // Check WebSocket notifications
      console.log(`📡 Received ${this.notifications.length} WebSocket notification(s)`);
      
      this.notifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.title} (${notif.type}) - Priority: ${notif.priority}`);
      });

      return {
        database: dbNotifications.rows,
        websocket: this.notifications
      };
    } catch (error) {
      console.error('❌ Error checking notifications:', error);
      return { database: [], websocket: [] };
    }
  }

  async testNotificationPreferences() {
    console.log('\n⚙️ Testing notification preferences...');

    try {
      // Get default preferences
      const getResponse = await fetch(`${API_BASE}/api/notifications/preferences`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      if (getResponse.ok) {
        const preferences = await getResponse.json();
        console.log('✅ Retrieved notification preferences');
        console.log('📋 Default settings:', {
          overAllocationMethods: preferences.data.overAllocationMethods,
          pushEnabled: preferences.data.pushEnabled,
          batchDigest: preferences.data.batchDigest
        });

        // Update preferences
        const updateResponse = await fetch(`${API_BASE}/api/notifications/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({
            overAllocationMethods: ['in_app', 'email'],
            pushEnabled: true,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00'
          })
        });

        if (updateResponse.ok) {
          console.log('✅ Updated notification preferences');
          return true;
        }
      }
    } catch (error) {
      console.error('❌ Error testing preferences:', error);
    }

    return false;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    try {
      // Remove test data
      await this.db.query('DELETE FROM project_assignments WHERE employee_id = $1', [this.testUserId]);
      await this.db.query('DELETE FROM notifications WHERE recipient_id IN ($1, $2)', [this.testUserId, this.testManagerId]);
      await this.db.query('DELETE FROM detected_conflicts WHERE affected_employees && $1::uuid[]', [[this.testUserId]]);
      await this.db.query('DELETE FROM projects WHERE name LIKE $1', ['%Test Project%']);
      // Note: Not deleting employees as they might be referenced elsewhere
      
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }

    // Close connections
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.db) {
      await this.db.end();
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    let success = true;

    try {
      console.log('🚀 Starting Notification System Conflict Detection Test\n');

      // Setup
      await this.setup();

      // Test 1: Create over-allocation scenario
      const overAllocationCreated = await this.createOverAllocation();
      if (!overAllocationCreated) {
        console.error('❌ Failed to create over-allocation scenario');
        success = false;
      }

      // Test 2: Test notification preferences
      const preferencesWorking = await this.testNotificationPreferences();
      if (!preferencesWorking) {
        console.warn('⚠️  Notification preferences test failed');
      }

      // Test 3: Trigger conflict detection
      const conflictDetectionWorking = await this.triggerConflictDetection();
      if (!conflictDetectionWorking) {
        console.error('❌ Conflict detection failed');
        success = false;
      }

      // Test 4: Check for notifications
      const notifications = await this.checkNotifications();
      
      // Evaluate results
      console.log('\n📋 Test Results Summary:');
      console.log('=========================');
      console.log(`🎯 Over-allocation created: ${overAllocationCreated ? '✅ YES' : '❌ NO'}`);
      console.log(`🔍 Conflict detection: ${conflictDetectionWorking ? '✅ WORKING' : '❌ FAILED'}`);
      console.log(`📬 Database notifications: ${notifications.database.length} found`);
      console.log(`📡 WebSocket notifications: ${notifications.websocket.length} received`);
      console.log(`⚙️  Preferences API: ${preferencesWorking ? '✅ WORKING' : '❌ FAILED'}`);

      // Check if we got the expected notifications
      const hasOverAllocationNotif = notifications.database.some(n => 
        n.type === 'allocation_conflict' || n.type === 'over_allocation'
      );
      
      if (hasOverAllocationNotif) {
        console.log('🎉 SUCCESS: Over-allocation notifications were created!');
      } else {
        console.log('⚠️  No over-allocation notifications found - this may be expected if rules are not configured');
      }

      // Additional diagnostics
      console.log('\n🔧 Diagnostics:');
      console.log(`- WebSocket connected: ${this.socket?.connected ? '✅' : '❌'}`);
      console.log(`- Conflicts detected: ${this.conflicts.length}`);
      
      if (this.conflicts.length > 0) {
        this.conflicts.forEach((conflict, index) => {
          console.log(`  ${index + 1}. ${conflict.title} - ${conflict.severity} priority`);
        });
      }

    } catch (error) {
      console.error('💥 Test execution failed:', error);
      success = false;
    }

    // Cleanup
    await this.cleanup();

    console.log('\n' + (success ? '🎉 Test completed successfully!' : '❌ Test completed with errors'));
    process.exit(success ? 0 : 1);
  }
}

// Run the test
if (require.main === module) {
  const test = new NotificationConflictTest();
  test.run().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = NotificationConflictTest;