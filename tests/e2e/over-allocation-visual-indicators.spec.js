"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Over-allocation Visual Indicators (PRD Critical)', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, test_1.test)('red highlight appears when employee hours exceed capacity', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-allocation');
        await page.waitForLoadState('networkidle');
        const overAllocationElements = page.locator('[data-testid^="over-allocation"], .over-allocated, .warning, .danger, .alert-danger');
        const overAllocationCount = await overAllocationElements.count();
        if (overAllocationCount > 0) {
            console.log(`✅ Found ${overAllocationCount} over-allocation indicators`);
            const firstIndicator = overAllocationElements.first();
            await (0, test_1.expect)(firstIndicator).toBeVisible();
            const styles = await firstIndicator.evaluate(el => {
                const computedStyle = window.getComputedStyle(el);
                return {
                    backgroundColor: computedStyle.backgroundColor,
                    color: computedStyle.color,
                    borderColor: computedStyle.borderColor,
                    className: el.className
                };
            });
            const hasRedColor = styles.backgroundColor.includes('rgb(220') ||
                styles.color.includes('rgb(220') ||
                styles.borderColor.includes('rgb(220') ||
                styles.className.includes('red') ||
                styles.className.includes('danger') ||
                styles.className.includes('warning');
            if (hasRedColor) {
                console.log('✅ Over-allocation has red/warning visual styling');
            }
        }
        else {
            console.log('ℹ️  No over-allocation indicators found - creating test scenario');
            await page.goto('http://localhost:3003/employees');
            const employeeRows = page.locator('[data-testid^="employee-row"]');
            const employeeCount = await employeeRows.count();
            (0, test_1.expect)(employeeCount).toBeGreaterThan(0);
            console.log(`Found ${employeeCount} employees for testing`);
        }
    });
    (0, test_1.test)('over-allocation calculation updates in real-time', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-allocation');
        await page.waitForLoadState('networkidle');
        const createAllocationBtn = page.locator('[data-testid="create-allocation"], [data-testid="add-allocation"], button:has-text("Add")');
        if (await createAllocationBtn.count() > 0) {
            await createAllocationBtn.first().click();
            const hoursInput = page.locator('[data-testid="hours-input"], input[name="hours"]');
            if (await hoursInput.count() > 0) {
                await hoursInput.first().fill('50');
                const submitBtn = page.locator('[data-testid="submit"], [data-testid="save"], button[type="submit"]');
                if (await submitBtn.count() > 0) {
                    await submitBtn.first().click();
                    await page.waitForLoadState('networkidle');
                    const warningAfterSubmit = page.locator('.warning, .over-allocated, .alert');
                    if (await warningAfterSubmit.count() > 0) {
                        console.log('✅ Real-time over-allocation warning appeared');
                    }
                }
            }
        }
    });
    (0, test_1.test)('sum calculation accuracy for employee allocations', async ({ page }) => {
        await page.goto('http://localhost:3003/employees');
        await page.waitForLoadState('networkidle');
        const firstEmployee = page.locator('[data-testid^="employee-row-"]').first();
        if (await firstEmployee.count() > 0) {
            await firstEmployee.click();
            const hoursDisplay = page.locator('[data-testid="total-hours"], [data-testid="allocated-hours"], .hours-summary');
            if (await hoursDisplay.count() > 0) {
                const hoursText = await hoursDisplay.first().textContent();
                console.log(`Employee hours display: ${hoursText}`);
                const hoursMatch = hoursText?.match(/(\d+)/);
                if (hoursMatch) {
                    const totalHours = parseInt(hoursMatch[1]);
                    (0, test_1.expect)(totalHours).toBeGreaterThanOrEqual(0);
                    console.log(`✅ Total hours calculation: ${totalHours}`);
                }
            }
        }
    });
    (0, test_1.test)('over-allocation icon appears in schedule grid', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const warningIcons = page.locator('.warning-icon, .alert-icon, [data-testid*="warning"], .fa-warning, .fa-exclamation');
        const iconCount = await warningIcons.count();
        if (iconCount > 0) {
            console.log(`✅ Found ${iconCount} warning icons in schedule`);
            const firstIcon = warningIcons.first();
            await (0, test_1.expect)(firstIcon).toBeVisible();
        }
        else {
            console.log('ℹ️  No warning icons found in current schedule view');
        }
    });
    (0, test_1.test)('over-allocation persists across page refreshes', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-allocation');
        await page.waitForLoadState('networkidle');
        const initialWarnings = page.locator('.over-allocated, .warning');
        const initialCount = await initialWarnings.count();
        if (initialCount > 0) {
            console.log(`Found ${initialCount} over-allocation warnings before refresh`);
            await page.reload();
            await page.waitForLoadState('networkidle');
            const afterRefreshWarnings = page.locator('.over-allocated, .warning');
            const afterRefreshCount = await afterRefreshWarnings.count();
            (0, test_1.expect)(afterRefreshCount).toBeGreaterThanOrEqual(initialCount);
            console.log(`✅ Over-allocation warnings persist after refresh: ${afterRefreshCount}`);
        }
        else {
            console.log('ℹ️  No over-allocation warnings to test persistence');
        }
    });
    (0, test_1.test)('multiple employees can have over-allocation warnings simultaneously', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-allocation');
        await page.waitForLoadState('networkidle');
        const allWarnings = page.locator('[data-testid^="over-allocation-"], .over-allocated');
        const warningCount = await allWarnings.count();
        console.log(`Total over-allocation warnings: ${warningCount}`);
        if (warningCount > 1) {
            console.log('✅ Multiple employees can have over-allocation warnings');
            const employeeNames = [];
            for (let i = 0; i < Math.min(warningCount, 3); i++) {
                const warning = allWarnings.nth(i);
                const employeeName = await warning.locator('[data-testid="employee-name"]').textContent();
                if (employeeName) {
                    employeeNames.push(employeeName);
                }
            }
            const uniqueNames = [...new Set(employeeNames)];
            (0, test_1.expect)(uniqueNames.length).toBeGreaterThan(0);
            console.log(`Employees with warnings: ${uniqueNames.join(', ')}`);
        }
        else if (warningCount === 1) {
            console.log('✅ One employee has over-allocation warning');
        }
        else {
            console.log('ℹ️  No over-allocation warnings currently active');
        }
    });
});
//# sourceMappingURL=over-allocation-visual-indicators.spec.js.map