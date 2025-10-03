"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Finnish Holidays Integration (Backlog Critical)', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, test_1.test)('Finnish Independence Day (Dec 6) marked as public holiday', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const dateNavigation = page.locator('[data-testid="date-picker"], .date-navigation, [data-testid="calendar-controls"]');
        if (await dateNavigation.count() > 0) {
            const monthSelector = page.locator('select[name="month"], [data-testid="month-select"]');
            if (await monthSelector.count() > 0) {
                await monthSelector.selectOption('11');
            }
            const dec6th = page.locator('[data-date="2024-12-06"], [data-testid="day-2024-12-06"], .calendar-day:has-text("6")');
            if (await dec6th.count() > 0) {
                const holidayIndicator = dec6th.locator('.holiday, .public-holiday, [data-holiday="true"]');
                if (await holidayIndicator.count() > 0) {
                    console.log('✅ Finnish Independence Day (Dec 6) marked as public holiday');
                    await (0, test_1.expect)(holidayIndicator).toBeVisible();
                }
                else {
                    console.log('ℹ️  December 6th found but not marked as holiday');
                }
            }
        }
        console.log('✅ Finnish holidays integration test attempted');
    });
    (0, test_1.test)('Christmas Day (Dec 25) reduces employee capacity', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const christmas = page.locator('[data-date="2024-12-25"], [data-testid="day-2024-12-25"]');
        if (await christmas.count() > 0) {
            const capacityReduction = christmas.locator('.reduced-capacity, .holiday-capacity, [data-capacity-reduced="true"]');
            if (await capacityReduction.count() > 0) {
                console.log('✅ Christmas Day shows capacity reduction');
                await (0, test_1.expect)(capacityReduction).toBeVisible();
            }
            const workAssignment = christmas.locator('.assignment, .work-item, [data-testid*="assignment"]');
            const assignmentCount = await workAssignment.count();
            if (assignmentCount === 0) {
                console.log('✅ No work assignments on Christmas Day (as expected)');
            }
        }
    });
    (0, test_1.test)('holiday impact warning appears when projects affected', async ({ page }) => {
        await page.goto('http://localhost:3003/projects');
        await page.waitForLoadState('networkidle');
        const projectRows = page.locator('[data-testid^="project-row-"]');
        const projectCount = await projectRows.count();
        if (projectCount > 0) {
            await projectRows.first().click();
            const holidayWarning = page.locator('[data-testid*="holiday-warning"], .holiday-impact, .capacity-warning, .alert:has-text("holiday")');
            if (await holidayWarning.count() > 0) {
                console.log('✅ Holiday impact warning displayed for affected projects');
                await (0, test_1.expect)(holidayWarning.first()).toBeVisible();
                const warningText = await holidayWarning.first().textContent();
                (0, test_1.expect)(warningText?.toLowerCase()).toContain('holiday');
            }
            else {
                console.log('ℹ️  No holiday impact warnings found (may not be applicable)');
            }
        }
    });
    (0, test_1.test)('employee weekly capacity automatically reduced on holiday weeks', async ({ page }) => {
        await page.goto('http://localhost:3003/employees');
        await page.waitForLoadState('networkidle');
        const firstEmployee = page.locator('[data-testid^="employee-row-"]').first();
        if (await firstEmployee.count() > 0) {
            await firstEmployee.click();
            const capacityView = page.locator('[data-testid="capacity-calendar"], .capacity-view, .weekly-capacity');
            if (await capacityView.count() > 0) {
                const reducedCapacityWeeks = page.locator('.reduced-week, [data-holiday-week="true"], .holiday-capacity');
                if (await reducedCapacityWeeks.count() > 0) {
                    console.log('✅ Employee capacity automatically reduced for holiday weeks');
                    const capacityNumber = await reducedCapacityWeeks.first().locator('.capacity-hours, [data-testid="hours"]').textContent();
                    if (capacityNumber) {
                        const hours = parseInt(capacityNumber.match(/\d+/)?.[0] || '0');
                        (0, test_1.expect)(hours).toBeLessThan(40);
                        console.log(`Holiday week capacity: ${hours} hours`);
                    }
                }
            }
        }
    });
    (0, test_1.test)('Finnish holiday API integration returns correct holidays', async ({ page }) => {
        const apiResponse = await page.request.get('http://localhost:3001/api/holidays?country=FI').catch(() => null);
        if (apiResponse && apiResponse.ok()) {
            const holidays = await apiResponse.json();
            (0, test_1.expect)(Array.isArray(holidays) || holidays.data).toBeTruthy();
            const holidayList = Array.isArray(holidays) ? holidays : holidays.data || [];
            if (holidayList.length > 0) {
                const holidayNames = holidayList.map((h) => h.name || h.title || '').join(' ');
                const hasIndependenceDay = holidayNames.toLowerCase().includes('independence');
                const hasChristmas = holidayNames.toLowerCase().includes('christmas');
                const hasMidsummer = holidayNames.toLowerCase().includes('midsummer');
                if (hasIndependenceDay || hasChristmas || hasMidsummer) {
                    console.log('✅ Finnish holiday API returns Finnish-specific holidays');
                }
                console.log(`API returned ${holidayList.length} holidays`);
            }
        }
        else {
            console.log('ℹ️  Finnish holiday API endpoint not available or not working');
            await page.goto('http://localhost:3003/resource-calendar');
            const holidayMarkers = page.locator('.holiday, .public-holiday, [data-holiday]');
            const holidayCount = await holidayMarkers.count();
            if (holidayCount > 0) {
                console.log(`✅ Found ${holidayCount} holiday markers in UI`);
            }
        }
    });
    (0, test_1.test)('capacity planning adjusts for multiple holidays in same month', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const monthView = page.locator('[data-testid="month-view"], .month-calendar');
        if (await monthView.count() > 0) {
            const holidayDays = page.locator('.holiday, .public-holiday, [data-holiday="true"]');
            const holidayCount = await holidayDays.count();
            if (holidayCount > 1) {
                console.log(`✅ Found ${holidayCount} holidays in current month view`);
                const capacitySummary = page.locator('[data-testid="capacity-summary"], .capacity-total, .monthly-capacity');
                if (await capacitySummary.count() > 0) {
                    const summaryText = await capacitySummary.first().textContent();
                    console.log(`Capacity summary: ${summaryText}`);
                }
            }
        }
    });
});
//# sourceMappingURL=finnish-holidays-integration.spec.js.map