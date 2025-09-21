/**
 * Phase 3: Project Pipeline Integration E2E Tests
 * Tests comprehensive project lifecycle with resource integration
 */
import { test, expect } from '@playwright/test';
import { test as base } from '@playwright/test

// Use enhanced test with fixtures
const { test: enhancedTest, expect: enhancedExpect } = base;

enhancedTest.describe('Phase 3: Project Pipeline Integration', () => {
  
  enhancedTest.beforeEach(async ({ page, testHelpers }) => {
    // Navigate to projects page
    await page.goto('/projects');
    await testHelpers.waitForElement('[data-testid="projects-page"]');
  });

  enhancedTest.describe('Project Creation with Resource Integration', () => {
    
    enhancedTest('should create project with predefined roles and assignments', async ({ page, testHelpers }) => {
      // Click create project button
      await testHelpers.clickAndWait('[data-testid="create-project-btn"]');
      
      // Fill project basic information
      await testHelpers.fillFormField('[data-testid="project-name"]', 'Full Stack Web Application');
      await testHelpers.fillFormField('[data-testid="project-description"]', 'Complete web application with React frontend and Node.js backend');
      await testHelpers.fillFormField('[data-testid="client-name"]', 'Tech Innovations Inc');
      
      // Set project dates
      await page.fill('[data-testid="start-date"]', '2024-02-01');
      await page.fill('[data-testid="end-date"]', '2024-08-31');
      
      // Set budget and hourly rate
      await testHelpers.fillFormField('[data-testid="budget"]', '150000');
      await testHelpers.fillFormField('[data-testid="hourly-rate"]', '85');
      
      // Configure project roles section
      await page.click('[data-testid="add-project-role"]');
      
      // Add Frontend Developer role
      await testHelpers.fillFormField('[data-testid="role-name-0"]', 'Frontend Developer');
      await testHelpers.fillFormField('[data-testid="role-description-0"]', 'React.js frontend development');
      await page.selectOption('[data-testid="experience-level-0"]', 'senior');
      await testHelpers.fillFormField('[data-testid="allocation-percentage-0"]', '80');
      await testHelpers.fillFormField('[data-testid="estimated-hours-0"]', '320');
      
      // Add required skills
      await page.fill('[data-testid="required-skills-0"]', 'React, TypeScript, CSS');
      await page.keyboard.press('Enter');
      
      // Add Backend Developer role
      await page.click('[data-testid="add-project-role"]');
      await testHelpers.fillFormField('[data-testid="role-name-1"]', 'Backend Developer');
      await testHelpers.fillFormField('[data-testid="role-description-1"]', 'Node.js API development');
      await page.selectOption('[data-testid="experience-level-1"]', 'senior');
      await testHelpers.fillFormField('[data-testid="allocation-percentage-1"]', '75');
      await testHelpers.fillFormField('[data-testid="estimated-hours-1"]', '280');
      
      // Add DevOps Engineer role
      await page.click('[data-testid="add-project-role"]');
      await testHelpers.fillFormField('[data-testid="role-name-2"]', 'DevOps Engineer');
      await page.selectOption('[data-testid="experience-level-2"]', 'intermediate');
      await testHelpers.fillFormField('[data-testid="allocation-percentage-2"]', '40');
      
      // Submit project creation
      await testHelpers.clickAndWait('[data-testid="submit-project"]', { waitFor: 'networkidle' });
      
      // Verify project was created
      await testHelpers.verifyToast('Project created successfully');
      
      // Verify we're on the project detail page
      await testHelpers.waitForElement('[data-testid="project-detail-page"]');
      await expect(page.locator('h1')).toContainText('Full Stack Web Application');
      
      // Verify roles were created
      await expect(page.locator('[data-testid="project-roles"]')).toBeVisible();
      await expect(page.locator('[data-testid="role-card"]')).toHaveCount(3);
      
      // Verify role details
      const frontendRole = page.locator('[data-testid="role-card"]').first();
      await expect(frontendRole.locator('h3')).toContainText('Frontend Developer');
      await expect(frontendRole.locator('[data-testid="allocation-percentage"]')).toContainText('80%');
      
      // Test role assignment workflow
      await page.click('[data-testid="assign-role-0"]');
      await testHelpers.waitForElement('[data-testid="assignment-modal"]');
      
      // Search and select employee
      await testHelpers.fillFormField('[data-testid="employee-search"]', 'Alice Johnson');
      await page.click('[data-testid="employee-option-alice"]');
      
      // Configure assignment details
      await page.fill('[data-testid="assignment-start-date"]', '2024-02-01');
      await page.fill('[data-testid="assignment-end-date"]', '2024-08-31');
      await page.selectOption('[data-testid="confidence-level"]', 'confirmed');
      
      // Submit assignment
      await testHelpers.clickAndWait('[data-testid="confirm-assignment"]');
      await testHelpers.verifyToast('Role assigned successfully');
      
      // Verify assignment in project timeline
      await page.click('[data-testid="project-timeline-tab"]');
      await testHelpers.waitForElement('[data-testid="timeline-view"]');
      await expect(page.locator('[data-testid="assignment-alice"]')).toBeVisible();
    });

    enhancedTest('should detect resource conflicts during project creation', async ({ page, testHelpers }) => {
      // Create project with resource conflicts
      await testHelpers.clickAndWait('[data-testid="create-project-btn"]');
      
      await testHelpers.fillFormField('[data-testid="project-name"]', 'Conflicting Project');
      await testHelpers.fillFormField('[data-testid="client-name"]', 'Conflict Corp');
      await page.fill('[data-testid="start-date"]', '2024-02-01');
      await page.fill('[data-testid="end-date"]', '2024-06-30');
      
      // Add role that will conflict with existing assignments
      await page.click('[data-testid="add-project-role"]');
      await testHelpers.fillFormField('[data-testid="role-name-0"]', 'Senior Developer');
      await page.selectOption('[data-testid="experience-level-0"]', 'senior');
      await testHelpers.fillFormField('[data-testid="allocation-percentage-0"]', '100'); // Over-allocation
      
      // Submit and expect conflict warning
      await page.click('[data-testid="submit-project"]');
      
      // Wait for conflict detection modal
      await testHelpers.waitForElement('[data-testid="conflict-warning-modal"]');
      await expect(page.locator('[data-testid="conflict-message"]')).toContainText('Resource conflicts detected');
      
      // View detailed conflict analysis
      await page.click('[data-testid="view-conflicts"]');
      await testHelpers.waitForElement('[data-testid="conflict-details"]');
      
      // Verify specific conflict information
      await expect(page.locator('[data-testid="over-allocation-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="suggested-alternatives"]')).toBeVisible();
      
      // Test conflict resolution options
      await page.click('[data-testid="auto-resolve-conflicts"]');
      await testHelpers.waitForElement('[data-testid="resolution-suggestions"]');
      
      // Accept suggested resolution
      await page.click('[data-testid="accept-suggestion-0"]');
      await testHelpers.clickAndWait('[data-testid="confirm-resolution"]');
      
      await testHelpers.verifyToast('Project created with conflict resolution');
    });
  });

  enhancedTest.describe('Project Lifecycle Management', () => {
    
    enhancedTest('should manage complete project lifecycle from planning to completion', async ({ page, testHelpers }) => {
      // Navigate to existing project
      await page.click('[data-testid="project-card-mobile-app"]');
      await testHelpers.waitForElement('[data-testid="project-detail-page"]');
      
      // Test project status transitions
      await page.click('[data-testid="project-status-dropdown"]');
      await page.click('[data-testid="status-option-active"]');
      
      // Verify status change confirmation modal
      await testHelpers.waitForElement('[data-testid="status-change-modal"]');
      await expect(page.locator('[data-testid="status-change-impact"]')).toBeVisible();
      
      // Confirm status change
      await page.click('[data-testid="confirm-status-change"]');
      await testHelpers.verifyToast('Project status updated to Active');
      
      // Test milestone tracking
      await page.click('[data-testid="milestones-tab"]');
      await testHelpers.waitForElement('[data-testid="milestones-view"]');
      
      // Add new milestone
      await page.click('[data-testid="add-milestone"]');
      await testHelpers.fillFormField('[data-testid="milestone-name"]', 'MVP Complete');
      await testHelpers.fillFormField('[data-testid="milestone-description"]', 'Minimum viable product ready for testing');
      await page.fill('[data-testid="milestone-date"]', '2024-04-15');
      await page.click('[data-testid="save-milestone"]');
      
      // Test budget tracking
      await page.click('[data-testid="budget-tab"]');
      await testHelpers.waitForElement('[data-testid="budget-overview"]');
      
      // Verify budget utilization charts
      await expect(page.locator('[data-testid="budget-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="burn-rate-chart"]')).toBeVisible();
      
      // Test time tracking integration
      await page.click('[data-testid="time-tracking-tab"]');
      await testHelpers.waitForElement('[data-testid="time-entries"]');
      
      // Add time entry
      await page.click('[data-testid="add-time-entry"]');
      await testHelpers.fillFormField('[data-testid="hours-worked"]', '8');
      await testHelpers.fillFormField('[data-testid="task-description"]', 'Component development and testing');
      await page.fill('[data-testid="work-date"]', '2024-02-15');
      await page.click('[data-testid="save-time-entry"]');
      
      await testHelpers.verifyToast('Time entry added successfully');
      
      // Test project completion workflow
      await page.click('[data-testid="project-actions-menu"]');
      await page.click('[data-testid="complete-project"]');
      
      // Verify completion checklist
      await testHelpers.waitForElement('[data-testid="completion-checklist"]');
      await expect(page.locator('[data-testid="checklist-item"]')).toHaveCount.greaterThan(3);
      
      // Complete checklist items
      const checkboxes = page.locator('[data-testid="checklist-checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
      }
      
      // Final project completion
      await page.click('[data-testid="finalize-completion"]');
      await testHelpers.verifyToast('Project completed successfully');
      
      // Verify project analytics were generated
      await testHelpers.waitForElement('[data-testid="project-completion-analytics"]');
      await expect(page.locator('[data-testid="final-metrics"]')).toBeVisible();
    });

    enhancedTest('should handle project modifications and impact analysis', async ({ page, testHelpers }) => {
      // Navigate to active project
      await page.click('[data-testid="project-card-backend-migration"]');
      await testHelpers.waitForElement('[data-testid="project-detail-page"]');
      
      // Test scope modification
      await page.click('[data-testid="modify-project"]');
      await testHelpers.waitForElement('[data-testid="modification-modal"]');
      
      // Add additional requirements
      await page.click('[data-testid="add-requirement"]');
      await testHelpers.fillFormField('[data-testid="new-requirement"]', 'Additional API endpoints for mobile app');
      
      // Modify timeline
      await page.fill('[data-testid="new-end-date"]', '2024-10-31');
      
      // Request impact analysis
      await page.click('[data-testid="analyze-impact"]');
      await testHelpers.waitForElement('[data-testid="impact-analysis-results"]');
      
      // Verify impact analysis components
      await expect(page.locator('[data-testid="timeline-impact"]')).toBeVisible();
      await expect(page.locator('[data-testid="budget-impact"]')).toBeVisible();
      await expect(page.locator('[data-testid="resource-impact"]')).toBeVisible();
      
      // Test stakeholder notification
      await page.click('[data-testid="notify-stakeholders"]');
      await testHelpers.waitForElement('[data-testid="notification-preview"]');
      
      // Customize notification
      await testHelpers.fillFormField('[data-testid="notification-message"]', 'Project scope has been updated with additional API requirements');
      await page.click('[data-testid="send-notifications"]');
      
      await testHelpers.verifyToast('Stakeholder notifications sent');
      
      // Apply modifications
      await page.click('[data-testid="apply-modifications"]');
      await testHelpers.verifyToast('Project modifications applied successfully');
      
      // Verify updated project timeline
      await page.click('[data-testid="project-timeline-tab"]');
      await expect(page.locator('[data-testid="updated-timeline"]')).toBeVisible();
    });
  });

  enhancedTest.describe('Resource Optimization and Intelligence', () => {
    
    enhancedTest('should provide intelligent resource recommendations', async ({ page, testHelpers }) => {
      // Navigate to resource planning page
      await page.goto('/resource-planning');
      await testHelpers.waitForElement('[data-testid="resource-planning-page"]');
      
      // Test capacity intelligence
      await page.click('[data-testid="capacity-intelligence-tab"]');
      await testHelpers.waitForElement('[data-testid="capacity-dashboard"]');
      
      // Verify capacity metrics
      await expect(page.locator('[data-testid="total-capacity"]')).toBeVisible();
      await expect(page.locator('[data-testid="utilized-capacity"]')).toBeVisible();
      await expect(page.locator('[data-testid="available-capacity"]')).toBeVisible();
      
      // Test skill-based recommendations
      await page.click('[data-testid="skill-recommendations"]');
      await testHelpers.waitForElement('[data-testid="skill-analysis"]');
      
      // Filter by specific skill
      await page.selectOption('[data-testid="skill-filter"]', 'React');
      await testHelpers.waitForElement('[data-testid="react-specialists"]');
      
      // Verify recommendation quality
      const recommendations = page.locator('[data-testid="recommendation-card"]');
      await expect(recommendations).toHaveCount.greaterThan(2);
      
      // Test recommendation scoring
      const firstRec = recommendations.first();
      await expect(firstRec.locator('[data-testid="match-score"]')).toBeVisible();
      await expect(firstRec.locator('[data-testid="availability-indicator"]')).toBeVisible();
      
      // Test automated assignment suggestions
      await page.click('[data-testid="auto-assign-suggestions"]');
      await testHelpers.waitForElement('[data-testid="assignment-suggestions"]');
      
      // Review and apply suggestions
      await page.click('[data-testid="review-suggestion-0"]');
      await testHelpers.waitForElement('[data-testid="assignment-preview"]');
      
      // Verify assignment details
      await expect(page.locator('[data-testid="suggested-employee"]')).toBeVisible();
      await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="skill-match-details"]')).toBeVisible();
      
      // Apply the suggestion
      await page.click('[data-testid="apply-suggestion"]');
      await testHelpers.verifyToast('Assignment applied successfully');
      
      // Test workload balancing
      await page.click('[data-testid="workload-balancer"]');
      await testHelpers.waitForElement('[data-testid="workload-view"]');
      
      // Verify workload distribution visualization
      await expect(page.locator('[data-testid="workload-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="over-allocated-employees"]')).toBeVisible();
      
      // Test automated rebalancing
      await page.click('[data-testid="auto-rebalance"]');
      await testHelpers.waitForElement('[data-testid="rebalancing-options"]');
      
      // Select rebalancing strategy
      await page.selectOption('[data-testid="rebalancing-strategy"]', 'distribute-evenly');
      await page.click('[data-testid="execute-rebalancing"]');
      
      await testHelpers.verifyToast('Workload rebalancing completed');
      
      // Verify rebalancing results
      await testHelpers.waitForElement('[data-testid="rebalancing-summary"]');
      await expect(page.locator('[data-testid="affected-employees"]')).toBeVisible();
      await expect(page.locator('[data-testid="improvement-metrics"]')).toBeVisible();
    });
  });

  enhancedTest.describe('Integration and Analytics', () => {
    
    enhancedTest('should provide comprehensive project analytics', async ({ page, testHelpers }) => {
      // Navigate to analytics dashboard
      await page.goto('/analytics');
      await testHelpers.waitForElement('[data-testid="analytics-dashboard"]');
      
      // Test project performance metrics
      await page.click('[data-testid="project-performance-tab"]');
      await testHelpers.waitForElement('[data-testid="performance-charts"]');
      
      // Verify key performance indicators
      await expect(page.locator('[data-testid="on-time-delivery-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="budget-variance"]')).toBeVisible();
      await expect(page.locator('[data-testid="resource-utilization"]')).toBeVisible();
      
      // Test interactive charts
      const chart = page.locator('[data-testid="project-timeline-chart"]');
      await expect(chart).toBeVisible();
      
      // Test chart interactions
      await chart.hover();
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      
      // Test custom date range filtering
      await page.click('[data-testid="date-range-picker"]');
      await page.fill('[data-testid="start-date-input"]', '2024-01-01');
      await page.fill('[data-testid="end-date-input"]', '2024-12-31');
      await page.click('[data-testid="apply-date-filter"]');
      
      // Verify data refresh
      await testHelpers.waitForElement('[data-testid="updated-charts"]');
      
      // Test export functionality
      await page.click('[data-testid="export-analytics"]');
      await testHelpers.waitForElement('[data-testid="export-options"]');
      
      // Test different export formats
      await page.click('[data-testid="export-pdf"]');
      
      // Wait for download to start
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/analytics.*\.pdf/);
      
      // Test real-time updates
      await page.click('[data-testid="real-time-toggle"]');
      await testHelpers.waitForElement('[data-testid="real-time-indicator"]');
      
      // Verify WebSocket connection for real-time updates
      await testHelpers.waitForWebSocket();
      
      // Test drill-down capabilities
      await page.click('[data-testid="drill-down-project-1"]');
      await testHelpers.waitForElement('[data-testid="project-detail-analytics"]');
      
      // Verify detailed project analytics
      await expect(page.locator('[data-testid="task-completion-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="team-productivity-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="risk-assessment"]')).toBeVisible();
    });

    enhancedTest('should handle multi-project portfolio analysis', async ({ page, testHelpers }) => {
      // Navigate to portfolio view
      await page.goto('/portfolio');
      await testHelpers.waitForElement('[data-testid="portfolio-dashboard"]');
      
      // Test portfolio-level metrics
      await expect(page.locator('[data-testid="total-portfolio-value"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-projects-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="resource-allocation-pie-chart"]')).toBeVisible();
      
      // Test cross-project dependency tracking
      await page.click('[data-testid="dependency-analysis"]');
      await testHelpers.waitForElement('[data-testid="dependency-graph"]');
      
      // Verify dependency visualization
      await expect(page.locator('[data-testid="dependency-nodes"]')).toBeVisible();
      await expect(page.locator('[data-testid="dependency-edges"]')).toBeVisible();
      
      // Test critical path analysis
      await page.click('[data-testid="critical-path-analysis"]');
      await testHelpers.waitForElement('[data-testid="critical-path-results"]');
      
      // Test resource conflicts across projects
      await page.click('[data-testid="cross-project-conflicts"]');
      await testHelpers.waitForElement('[data-testid="conflict-matrix"]');
      
      // Verify conflict resolution suggestions
      await expect(page.locator('[data-testid="resolution-suggestions"]')).toBeVisible();
      
      // Test portfolio optimization
      await page.click('[data-testid="optimize-portfolio"]');
      await testHelpers.waitForElement('[data-testid="optimization-results"]');
      
      // Review optimization recommendations
      await expect(page.locator('[data-testid="recommended-changes"]')).toBeVisible();
      await expect(page.locator('[data-testid="projected-improvements"]')).toBeVisible();
      
      // Apply selected optimizations
      await page.click('[data-testid="optimization-checkbox-0"]');
      await page.click('[data-testid="apply-optimizations"]');
      
      await testHelpers.verifyToast('Portfolio optimizations applied');
    });
  });
});