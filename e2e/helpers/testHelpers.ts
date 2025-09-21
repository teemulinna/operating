import { Page, expect } from '@playwright/test';
import { testTimeouts, apiEndpoints } from '../fixtures/testData';

/**
 * Test helper utilities for E2E tests
 */

/**
 * Wait for API call to complete and return response
 */
export async function waitForApiCall(page: Page, endpoint: string, method: string = 'GET') {
  const response = await page.waitForResponse(
    response => response.url().includes(endpoint) && response.request().method() === method,
    { timeout: testTimeouts.api }
  );
  return response;
}

/**
 * Clear database data for specific table (for test isolation)
 */
export async function clearTestData(page: Page, table: 'employees' | 'projects' | 'allocations') {
  // This would typically call a test-specific endpoint to clear data
  // For now, we'll use the regular API with appropriate cleanup
  const endpoint = apiEndpoints[table];
  
  // Get all records first
  const response = await page.request.get(`http://localhost:3001${endpoint}`);
  const data = await response.json();
  
  // Delete test records (those created during testing)
  if (Array.isArray(data) && data.length > 0) {
    for (const record of data) {
      // Only delete records that appear to be test data
      if (isTestRecord(record, table)) {
        await page.request.delete(`http://localhost:3001${endpoint}/${record.id}`);
      }
    }
  }
}

/**
 * Check if a record appears to be test data
 */
function isTestRecord(record: any, table: string): boolean {
  switch (table) {
    case 'employees':
      return (
        record.email?.includes('test.com') ||
        record.firstName?.includes('Test') ||
        record.lastName?.includes('Test')
      );
    case 'projects':
      return (
        record.name?.includes('Test') ||
        record.description?.includes('test')
      );
    case 'allocations':
      return true; // Allocations are usually safe to clean up
    default:
      return false;
  }
}

/**
 * Create test employee via API
 */
export async function createTestEmployee(page: Page, employeeData: any) {
  const response = await page.request.post(`http://localhost:3001${apiEndpoints.employees}`, {
    data: employeeData
  });
  
  expect(response.ok()).toBeTruthy();
  const employee = await response.json();
  return employee;
}

/**
 * Create test project via API
 */
export async function createTestProject(page: Page, projectData: any) {
  const response = await page.request.post(`http://localhost:3001${apiEndpoints.projects}`, {
    data: projectData
  });
  
  expect(response.ok()).toBeTruthy();
  const project = await response.json();
  return project;
}

/**
 * Delete test record via API
 */
export async function deleteTestRecord(page: Page, endpoint: string, id: string) {
  const response = await page.request.delete(`http://localhost:3001${endpoint}/${id}`);
  expect(response.ok()).toBeTruthy();
}

/**
 * Wait for element to be stable (not moving/changing)
 */
export async function waitForStableElement(page: Page, selector: string, timeout: number = 5000) {
  let previousPosition: { x: number; y: number } | null = null;
  let stableCount = 0;
  const requiredStableChecks = 3;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const element = page.locator(selector).first();
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        const currentPosition = { x: boundingBox.x, y: boundingBox.y };
        
        if (previousPosition && 
            Math.abs(currentPosition.x - previousPosition.x) < 1 &&
            Math.abs(currentPosition.y - previousPosition.y) < 1) {
          stableCount++;
          if (stableCount >= requiredStableChecks) {
            return;
          }
        } else {
          stableCount = 0;
        }
        
        previousPosition = currentPosition;
      }
      
      await page.waitForTimeout(100);
    } catch (error) {
      // Element might not be available yet, continue waiting
      await page.waitForTimeout(100);
    }
  }
  
  throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`);
}

/**
 * Scroll element into viewport center
 */
export async function scrollToCenter(page: Page, selector: string) {
  await page.locator(selector).evaluate((element) => {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center', 
      inline: 'center' 
    });
  });
  
  // Wait for scroll to complete
  await page.waitForTimeout(500);
}

/**
 * Generate random test data
 */
export const generateTestData = {
  email: () => `test.${Date.now()}@example.com`,
  name: () => `Test User ${Date.now()}`,
  projectName: () => `Test Project ${Date.now()}`,
  randomString: (length: number = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!process.env.CI;
}

/**
 * Get appropriate timeout based on environment
 */
export function getTimeout(baseTimeout: number): number {
  return isCI() ? baseTimeout * 2 : baseTimeout;
}

/**
 * Wait for network to be idle with retry
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 10000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    console.warn('Network idle timeout, continuing with test');
  }
}

/**
 * Take screenshot with timestamp for debugging
 */
export async function debugScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `test-results/debug-${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Verify API response structure
 */
export function verifyApiResponse(response: any, expectedFields: string[]) {
  for (const field of expectedFields) {
    expect(response).toHaveProperty(field);
  }
}

/**
 * Mock API response for testing
 */
export async function mockApiResponse(page: Page, url: string, response: any) {
  await page.route(url, async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Wait for specific console message
 */
export async function waitForConsoleMessage(page: Page, messagePattern: string | RegExp, timeout: number = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      page.off('console', consoleHandler);
      reject(new Error(`Console message matching ${messagePattern} not found within ${timeout}ms`));
    }, timeout);

    const consoleHandler = (msg: any) => {
      const text = msg.text();
      const matches = typeof messagePattern === 'string' 
        ? text.includes(messagePattern)
        : messagePattern.test(text);
        
      if (matches) {
        clearTimeout(timeoutId);
        page.off('console', consoleHandler);
        resolve(msg);
      }
    };

    page.on('console', consoleHandler);
  });
}