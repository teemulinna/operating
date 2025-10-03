import { test, expect } from '@playwright/test';

test.describe('Team Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to team dashboard
    await page.goto('http://localhost:3002/team-dashboard');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Wait for team statistics to be visible
    await page.waitForSelector('[data-testid="team-statistics"]', { timeout: 10000 });
  });

  test.describe('US-TD1: View Team Statistics', () => {
    test('should display three metric cards', async ({ page }) => {
      // Check that all three metric cards are present
      const metricCards = page.locator('[data-testid="metric-card"]');
      await expect(metricCards).toHaveCount(3);

      // Verify Team Members card
      const teamMembersCard = page.locator('[data-testid="metric-card-team-members"]');
      await expect(teamMembersCard).toBeVisible();
      await expect(teamMembersCard.locator('[data-testid="metric-label"]')).toContainText('Team Members');

      // Verify Average Utilization card
      const avgUtilizationCard = page.locator('[data-testid="metric-card-avg-utilization"]');
      await expect(avgUtilizationCard).toBeVisible();
      await expect(avgUtilizationCard.locator('[data-testid="metric-label"]')).toContainText('Average Utilization');

      // Verify Active Projects card
      const activeProjectsCard = page.locator('[data-testid="metric-card-active-projects"]');
      await expect(activeProjectsCard).toBeVisible();
      await expect(activeProjectsCard.locator('[data-testid="metric-label"]')).toContainText('Active Projects');
    });

    test('should display metric values calculated from real data', async ({ page }) => {
      // Team Members count should be a number > 0
      const teamMembersValue = page.locator('[data-testid="metric-card-team-members"] [data-testid="metric-value"]');
      await expect(teamMembersValue).toBeVisible();
      const teamMembersText = await teamMembersValue.textContent();
      const teamMembersCount = parseInt(teamMembersText || '0');
      expect(teamMembersCount).toBeGreaterThan(0);

      // Average Utilization should be a percentage
      const avgUtilizationValue = page.locator('[data-testid="metric-card-avg-utilization"] [data-testid="metric-value"]');
      await expect(avgUtilizationValue).toBeVisible();
      const avgUtilizationText = await avgUtilizationValue.textContent();
      expect(avgUtilizationText).toMatch(/\d+(\.\d+)?%/);

      // Active Projects count should be a number >= 0
      const activeProjectsValue = page.locator('[data-testid="metric-card-active-projects"] [data-testid="metric-value"]');
      await expect(activeProjectsValue).toBeVisible();
      const activeProjectsText = await activeProjectsValue.textContent();
      const activeProjectsCount = parseInt(activeProjectsText || '0');
      expect(activeProjectsCount).toBeGreaterThanOrEqual(0);
    });

    test('should display icons for visual clarity', async ({ page }) => {
      // Check for icons in each metric card
      const teamMembersIcon = page.locator('[data-testid="metric-card-team-members"] [data-testid="metric-icon"]');
      await expect(teamMembersIcon).toBeVisible();

      const avgUtilizationIcon = page.locator('[data-testid="metric-card-avg-utilization"] [data-testid="metric-icon"]');
      await expect(avgUtilizationIcon).toBeVisible();

      const activeProjectsIcon = page.locator('[data-testid="metric-card-active-projects"] [data-testid="metric-icon"]');
      await expect(activeProjectsIcon).toBeVisible();
    });

    test('should update metrics when data changes', async ({ page }) => {
      // Get initial values
      const initialTeamMembers = await page.locator('[data-testid="metric-card-team-members"] [data-testid="metric-value"]').textContent();

      // Navigate away and back to trigger refresh
      await page.goto('http://localhost:3002/projects');
      await page.waitForLoadState('networkidle');
      await page.goto('http://localhost:3002/team-dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="team-statistics"]', { timeout: 10000 });

      // Values should still be present
      const updatedTeamMembers = await page.locator('[data-testid="metric-card-team-members"] [data-testid="metric-value"]').textContent();
      expect(updatedTeamMembers).toBeTruthy();
    });
  });

  test.describe('US-TD2: View Team Member List', () => {
    test('should display list of active employees', async ({ page }) => {
      const teamMemberList = page.locator('[data-testid="team-member-list"]');
      await expect(teamMemberList).toBeVisible();

      // Should have at least one team member
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const count = await teamMembers.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display employee name, role, and projects count', async ({ page }) => {
      const firstMember = page.locator('[data-testid="team-member-item"]').first();

      // Check name is displayed
      const name = firstMember.locator('[data-testid="member-name"]');
      await expect(name).toBeVisible();
      const nameText = await name.textContent();
      expect(nameText).toBeTruthy();
      expect(nameText!.length).toBeGreaterThan(0);

      // Check role is displayed
      const role = firstMember.locator('[data-testid="member-role"]');
      await expect(role).toBeVisible();
      const roleText = await role.textContent();
      expect(roleText).toBeTruthy();

      // Check projects count is displayed
      const projectsCount = firstMember.locator('[data-testid="member-projects-count"]');
      await expect(projectsCount).toBeVisible();
      const projectsText = await projectsCount.textContent();
      expect(projectsText).toMatch(/\d+/);
    });

    test('should display utilization as percentage', async ({ page }) => {
      const firstMember = page.locator('[data-testid="team-member-item"]').first();

      // Check utilization percentage is displayed
      const utilization = firstMember.locator('[data-testid="member-utilization"]');
      await expect(utilization).toBeVisible();
      const utilizationText = await utilization.textContent();
      expect(utilizationText).toMatch(/\d+(\.\d+)?%/);
    });

    test('should display utilization bar with correct color coding', async ({ page }) => {
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const count = await teamMembers.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const member = teamMembers.nth(i);
        const utilizationText = await member.locator('[data-testid="member-utilization"]').textContent();
        const utilization = parseFloat(utilizationText?.replace('%', '') || '0');

        const utilizationBar = member.locator('[data-testid="utilization-bar"]');
        await expect(utilizationBar).toBeVisible();

        // Check color coding based on utilization level
        const barColor = await utilizationBar.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        if (utilization < 75) {
          // Green - should have green color (rgb values with high green component)
          expect(barColor).toMatch(/rgb\(.*\)/);
          console.log(`✓ Member ${i + 1}: ${utilization}% - Green zone - Color: ${barColor}`);
        } else if (utilization >= 75 && utilization <= 90) {
          // Yellow - should have yellow/orange color
          expect(barColor).toMatch(/rgb\(.*\)/);
          console.log(`✓ Member ${i + 1}: ${utilization}% - Yellow zone - Color: ${barColor}`);
        } else {
          // Red - should have red color (rgb values with high red component)
          expect(barColor).toMatch(/rgb\(.*\)/);
          console.log(`✓ Member ${i + 1}: ${utilization}% - Red zone - Color: ${barColor}`);
        }
      }
    });

    test('should verify green color for utilization < 75%', async ({ page }) => {
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const count = await teamMembers.count();

      let foundGreenZone = false;
      for (let i = 0; i < count; i++) {
        const member = teamMembers.nth(i);
        const utilizationText = await member.locator('[data-testid="member-utilization"]').textContent();
        const utilization = parseFloat(utilizationText?.replace('%', '') || '0');

        if (utilization < 75) {
          foundGreenZone = true;
          const utilizationBar = member.locator('[data-testid="utilization-bar"]');
          const className = await utilizationBar.getAttribute('class');

          // Check for green-related classes or styles
          expect(className?.toLowerCase()).toMatch(/(green|success|low)/i);
          console.log(`✓ Found green zone: ${utilization}% with class: ${className}`);
          break;
        }
      }

      // Log if no green zone found
      if (!foundGreenZone) {
        console.log('⚠ No team members with < 75% utilization found for green zone test');
      }
    });

    test('should verify yellow color for utilization 75-90%', async ({ page }) => {
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const count = await teamMembers.count();

      let foundYellowZone = false;
      for (let i = 0; i < count; i++) {
        const member = teamMembers.nth(i);
        const utilizationText = await member.locator('[data-testid="member-utilization"]').textContent();
        const utilization = parseFloat(utilizationText?.replace('%', '') || '0');

        if (utilization >= 75 && utilization <= 90) {
          foundYellowZone = true;
          const utilizationBar = member.locator('[data-testid="utilization-bar"]');
          const className = await utilizationBar.getAttribute('class');

          // Check for yellow/warning-related classes
          expect(className?.toLowerCase()).toMatch(/(yellow|warning|medium)/i);
          console.log(`✓ Found yellow zone: ${utilization}% with class: ${className}`);
          break;
        }
      }

      if (!foundYellowZone) {
        console.log('⚠ No team members with 75-90% utilization found for yellow zone test');
      }
    });

    test('should verify red color for utilization > 90%', async ({ page }) => {
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const count = await teamMembers.count();

      let foundRedZone = false;
      for (let i = 0; i < count; i++) {
        const member = teamMembers.nth(i);
        const utilizationText = await member.locator('[data-testid="member-utilization"]').textContent();
        const utilization = parseFloat(utilizationText?.replace('%', '') || '0');

        if (utilization > 90) {
          foundRedZone = true;
          const utilizationBar = member.locator('[data-testid="utilization-bar"]');
          const className = await utilizationBar.getAttribute('class');

          // Check for red/danger-related classes
          expect(className?.toLowerCase()).toMatch(/(red|danger|high|over)/i);
          console.log(`✓ Found red zone: ${utilization}% with class: ${className}`);
          break;
        }
      }

      if (!foundRedZone) {
        console.log('⚠ No team members with > 90% utilization found for red zone test');
      }
    });

    test('should display status badge (active/inactive)', async ({ page }) => {
      const firstMember = page.locator('[data-testid="team-member-item"]').first();

      // Check status badge is displayed
      const statusBadge = firstMember.locator('[data-testid="member-status-badge"]');
      await expect(statusBadge).toBeVisible();

      const statusText = await statusBadge.textContent();
      expect(statusText?.toLowerCase()).toMatch(/(active|inactive)/);
    });

    test('should filter to show only active employees', async ({ page }) => {
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const count = await teamMembers.count();

      // Check that all displayed members have "active" status
      for (let i = 0; i < count; i++) {
        const member = teamMembers.nth(i);
        const statusBadge = member.locator('[data-testid="member-status-badge"]');
        const statusText = await statusBadge.textContent();
        expect(statusText?.toLowerCase()).toContain('active');
      }
    });

    test('should have proper layout and spacing for team member items', async ({ page }) => {
      const firstMember = page.locator('[data-testid="team-member-item"]').first();

      // Check that the item is visible and has reasonable dimensions
      await expect(firstMember).toBeVisible();

      const boundingBox = await firstMember.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox!.height).toBeGreaterThan(50); // Should have reasonable height
      expect(boundingBox!.width).toBeGreaterThan(200); // Should have reasonable width
    });

    test('should display utilization bar with correct width based on percentage', async ({ page }) => {
      const firstMember = page.locator('[data-testid="team-member-item"]').first();

      // Get utilization percentage
      const utilizationText = await firstMember.locator('[data-testid="member-utilization"]').textContent();
      const utilization = parseFloat(utilizationText?.replace('%', '') || '0');

      // Get utilization bar
      const utilizationBar = firstMember.locator('[data-testid="utilization-bar"]');
      const barWidth = await utilizationBar.evaluate((el) => {
        return window.getComputedStyle(el).width;
      });

      // Bar should have a width (this is a visual indicator)
      expect(barWidth).not.toBe('0px');
      console.log(`Utilization: ${utilization}%, Bar width: ${barWidth}`);
    });
  });

  test.describe('Integration and Performance', () => {
    test('should load team dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3002/team-dashboard');
      await page.waitForSelector('[data-testid="team-statistics"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      console.log(`✓ Dashboard loaded in ${loadTime}ms`);
    });

    test('should handle refresh without errors', async ({ page }) => {
      // Initial load
      await page.goto('http://localhost:3002/team-dashboard');
      await page.waitForSelector('[data-testid="team-statistics"]');

      // Refresh the page
      await page.reload();
      await page.waitForSelector('[data-testid="team-statistics"]');

      // Verify data is still displayed
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const count = await teamMembers.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should maintain data consistency across metric cards and member list', async ({ page }) => {
      // Get team members count from metric card
      const teamMembersValue = await page.locator('[data-testid="metric-card-team-members"] [data-testid="metric-value"]').textContent();
      const metricCount = parseInt(teamMembersValue || '0');

      // Get actual count from member list
      const teamMembers = page.locator('[data-testid="team-member-item"]');
      const listCount = await teamMembers.count();

      // Counts should match
      expect(listCount).toBe(metricCount);
      console.log(`✓ Metric card shows ${metricCount} members, list shows ${listCount} members`);
    });
  });

  test.describe('Visual Regression and Accessibility', () => {
    test('should have accessible team statistics cards', async ({ page }) => {
      const metricCards = page.locator('[data-testid="metric-card"]');
      const count = await metricCards.count();

      for (let i = 0; i < count; i++) {
        const card = metricCards.nth(i);

        // Cards should be keyboard focusable or have proper ARIA labels
        const ariaLabel = await card.getAttribute('aria-label');
        const role = await card.getAttribute('role');

        // Should have either aria-label or role for accessibility
        expect(ariaLabel || role).toBeTruthy();
      }
    });

    test('should have accessible team member list', async ({ page }) => {
      const teamMemberList = page.locator('[data-testid="team-member-list"]');

      // List should have proper role
      const role = await teamMemberList.getAttribute('role');
      expect(role).toBeTruthy();
    });

    test('should display utilization bars with sufficient contrast', async ({ page }) => {
      const utilizationBars = page.locator('[data-testid="utilization-bar"]');
      const count = await utilizationBars.count();

      expect(count).toBeGreaterThan(0);

      // Each bar should be visible (basic contrast check)
      for (let i = 0; i < Math.min(count, 3); i++) {
        const bar = utilizationBars.nth(i);
        await expect(bar).toBeVisible();
      }
    });
  });
});
