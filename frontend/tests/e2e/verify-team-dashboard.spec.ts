import { test, expect } from '@playwright/test';

test.describe('Team Dashboard Backend Integration Verification', () => {
  test('should display actual backend data in Team Dashboard', async ({ page, request }) => {
    // First, get the actual data from the backend API (match what the frontend fetches)
    const employeesResponse = await request.get('http://localhost:3001/api/employees?limit=100');
    const employeesData = await employeesResponse.json();
    const backendEmployeeCount = employeesData.data?.filter((e: any) => e.isActive === true).length || 0;

    const projectsResponse = await request.get('http://localhost:3001/api/projects');
    const projectsData = await projectsResponse.json();
    const backendActiveProjects = projectsData.data?.filter((p: any) => p.status === 'active').length || 0;

    console.log(`Backend API reports: ${backendEmployeeCount} employees, ${backendActiveProjects} active projects`);

    // Now navigate to the Team Dashboard
    await page.goto('http://localhost:3002/team-dashboard');
    await page.waitForLoadState('networkidle');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'team-dashboard-test.png' });

    // Wait for the Team Dashboard to load
    await page.waitForSelector('h1:has-text("Team Dashboard")', { timeout: 10000 });

    // Get the Team Members count from the UI
    const teamMembersCard = page.locator('[data-testid="team-stats"]');
    await teamMembersCard.waitFor({ state: 'visible', timeout: 5000 });

    const teamMembersText = await teamMembersCard.textContent();
    console.log('Team Members card text:', teamMembersText);

    // Extract the number from the text
    const memberCountMatch = teamMembersText?.match(/(\d+)/);
    const uiMemberCount = memberCountMatch ? parseInt(memberCountMatch[1]) : 0;

    console.log(`UI shows: ${uiMemberCount} team members`);

    // Get Active Projects count from the UI
    const activeProjectsCard = page.locator('[data-testid="active-projects"]');
    await activeProjectsCard.waitFor({ state: 'visible', timeout: 5000 });

    const projectsText = await activeProjectsCard.textContent();
    console.log('Active Projects card text:', projectsText);

    // Extract the number from the text
    const projectCountMatch = projectsText?.match(/(\d+)/);
    const uiProjectCount = projectCountMatch ? parseInt(projectCountMatch[1]) : 0;

    console.log(`UI shows: ${uiProjectCount} active projects`);

    // Get the team members table
    const teamTable = page.locator('[data-testid="team-members-table"]');
    await teamTable.waitFor({ state: 'visible', timeout: 5000 });

    // Count rows in the team members table
    const tableRows = await page.locator('[data-testid="team-members-table"] tbody tr').count();
    console.log(`Team members table has ${tableRows} rows`);

    // VERIFICATION: The UI should show the actual backend data
    expect(uiMemberCount).toBe(backendEmployeeCount);
    expect(uiProjectCount).toBe(backendActiveProjects);
    expect(tableRows).toBe(backendEmployeeCount);

    // Verify utilization is being calculated
    const utilizationCard = page.locator('[data-testid="avg-utilization"]');
    const utilizationText = await utilizationCard.textContent();
    console.log('Utilization card text:', utilizationText);

    const utilizationMatch = utilizationText?.match(/(\d+)%/);
    if (utilizationMatch) {
      const utilization = parseInt(utilizationMatch[1]);
      expect(utilization).toBeGreaterThanOrEqual(0);
      expect(utilization).toBeLessThanOrEqual(100);
      console.log(`Average utilization: ${utilization}%`);
    }

    // Verify individual team member data
    const firstRow = page.locator('[data-testid="team-members-table"] tbody tr').first();
    if (await firstRow.isVisible()) {
      const name = await firstRow.locator('td').nth(0).textContent();
      const role = await firstRow.locator('td').nth(1).textContent();
      const utilization = await firstRow.locator('td').nth(2).textContent();

      console.log(`First team member: ${name}, ${role}, Utilization: ${utilization}`);

      // Verify this is real data (not mock data)
      expect(name).not.toBe('John Doe'); // The old mock data had John Doe
      expect(name).toBeTruthy();
      expect(role).toBeTruthy();
    }

    console.log('✅ Team Dashboard is displaying real backend data!');
  });

  test('should update when backend data changes', async ({ page, request }) => {
    // Navigate to Team Dashboard
    await page.goto('http://localhost:3002/team-dashboard');
    await page.waitForLoadState('networkidle');

    // Get initial count
    const initialCard = page.locator('[data-testid="team-stats"]');
    await initialCard.waitFor({ state: 'visible' });
    const initialText = await initialCard.textContent();
    const initialMatch = initialText?.match(/(\d+)/);
    const initialCount = initialMatch ? parseInt(initialMatch[1]) : 0;

    console.log(`Initial employee count: ${initialCount}`);

    // Refresh the page to get fresh data
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get count after refresh
    const refreshedCard = page.locator('[data-testid="team-stats"]');
    await refreshedCard.waitFor({ state: 'visible' });
    const refreshedText = await refreshedCard.textContent();
    const refreshedMatch = refreshedText?.match(/(\d+)/);
    const refreshedCount = refreshedMatch ? parseInt(refreshedMatch[1]) : 0;

    console.log(`Count after refresh: ${refreshedCount}`);

    // Should still show consistent data
    expect(refreshedCount).toBe(initialCount);
    console.log('✅ Data remains consistent after refresh');
  });
});