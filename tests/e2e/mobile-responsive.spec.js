"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_2 = require("@playwright/test");
const { test: enhancedTest, expect: enhancedExpect } = test_2.test;
const mobileDevices = [
    { name: 'iPhone 12', ...test_1.devices['iPhone 12'] },
    { name: 'iPhone 13 Pro', ...test_1.devices['iPhone 13 Pro'] },
    { name: 'Pixel 5', ...test_1.devices['Pixel 5'] },
    { name: 'Samsung Galaxy S21', ...test_1.devices['Galaxy S21'] },
    { name: 'iPad Pro', ...test_1.devices['iPad Pro'] },
    { name: 'iPad', ...test_1.devices['iPad (gen 7)'] }
];
enhancedTest.describe('Mobile Responsiveness and Touch Interactions', () => {
    enhancedTest.describe('Responsive Layout Testing', () => {
        mobileDevices.forEach(device => {
            enhancedTest(`should display correctly on ${device.name}`, async ({ page, testHelpers }) => {
                await page.setViewportSize({
                    width: device.viewport?.width || 375,
                    height: device.viewport?.height || 667
                });
                n;
                n;
            });
        });
    });
});
//# sourceMappingURL=mobile-responsive.spec.js.map