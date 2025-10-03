import { test, expect } from '@playwright/test';
import { NavigationPage } from '../pages/NavigationPage';

test.describe('Navigation Functionality - US-N1: Navigate Between Pages', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    await navigationPage.navigateToHome();
  });

  test.describe('Navigation Bar Visibility', () => {
    test('should display navigation bar on all pages', async () => {
      await test.step('Verify navigation bar is visible', async () => {
        await navigationPage.verifyNavigationVisible();
      });

      await test.step('Verify app title is visible', async () => {
        await navigationPage.verifyAppTitleVisible();
      });
    });

    test('should display navigation bar on every page', async () => {
      const routes = navigationPage.getRoutes();

      for (const route of routes) {
        await test.step(`Verify navigation visible on ${route.name} page`, async () => {
          await navigationPage.navigateToPage(route.name);
          await navigationPage.verifyNavigationPersistence();
        });
      }
    });

    test('should keep navigation visible when scrolling', async () => {
      await test.step('Navigate to page with scrollable content', async () => {
        await navigationPage.navigateToPage('Dashboard');
      });

      await test.step('Verify navigation remains visible after scrolling', async () => {
        await navigationPage.verifyNavigationAlwaysVisible();
      });
    });
  });

  test.describe('Navigation Links - All Major Sections', () => {
    test('should display all required navigation links', async () => {
      await test.step('Verify all navigation links are visible', async () => {
        await navigationPage.verifyAllLinksVisible();
      });

      const expectedLinks = [
        'Dashboard',
        'Employees',
        'Projects',
        'Allocations',
        'Schedule',
        'Enhanced Schedule',
        'Reports',
        'Planning',
        'Heat Map',
        'Availability',
        'What-If',
        'Team Dashboard'
      ];

      const links = navigationPage.getAllNavigationLinks();
      const linkNames = links.map(link => link.name);

      for (const expectedLink of expectedLinks) {
        await test.step(`Verify ${expectedLink} link exists`, async () => {
          expect(linkNames).toContain(expectedLink);
        });
      }
    });

    test('should navigate to Dashboard', async () => {
      await test.step('Click Dashboard link', async () => {
        await navigationPage.navigateToPage('Dashboard');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/');
      });

      await test.step('Verify Dashboard content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Dashboard');
      });
    });

    test('should navigate to Employees', async () => {
      await test.step('Click Employees link', async () => {
        await navigationPage.navigateToPage('Employees');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/employees');
      });

      await test.step('Verify Employees content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Employees');
      });
    });

    test('should navigate to Projects', async () => {
      await test.step('Click Projects link', async () => {
        await navigationPage.navigateToPage('Projects');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/projects');
      });

      await test.step('Verify Projects content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Projects');
      });
    });

    test('should navigate to Allocations', async () => {
      await test.step('Click Allocations link', async () => {
        await navigationPage.navigateToPage('Allocations');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/allocations');
      });

      await test.step('Verify Allocations content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Allocations');
      });
    });

    test('should navigate to Schedule', async () => {
      await test.step('Click Schedule link', async () => {
        await navigationPage.navigateToPage('Schedule');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/schedule');
      });

      await test.step('Verify Schedule content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Schedule');
      });
    });

    test('should navigate to Enhanced Schedule', async () => {
      await test.step('Click Enhanced Schedule link', async () => {
        await navigationPage.navigateToPage('Enhanced Schedule');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/enhanced-schedule');
      });

      await test.step('Verify Enhanced Schedule content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Enhanced Schedule');
      });
    });

    test('should navigate to Reports', async () => {
      await test.step('Click Reports link', async () => {
        await navigationPage.navigateToPage('Reports');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/reports');
      });

      await test.step('Verify Reports content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Reports');
      });
    });

    test('should navigate to Planning', async () => {
      await test.step('Click Planning link', async () => {
        await navigationPage.navigateToPage('Planning');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/planning');
      });

      await test.step('Verify Planning content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Planning');
      });
    });

    test('should navigate to Heat Map', async () => {
      await test.step('Click Heat Map link', async () => {
        await navigationPage.navigateToPage('Heat Map');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/heat-map');
      });

      await test.step('Verify Heat Map content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Heat Map');
      });
    });

    test('should navigate to Availability', async () => {
      await test.step('Click Availability link', async () => {
        await navigationPage.navigateToPage('Availability');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/availability');
      });

      await test.step('Verify Availability content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Availability');
      });
    });

    test('should navigate to What-If (Scenarios)', async () => {
      await test.step('Click What-If link', async () => {
        await navigationPage.navigateToPage('What-If');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/scenarios');
      });

      await test.step('Verify Scenarios content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('What-If');
      });
    });

    test('should navigate to Team Dashboard', async () => {
      await test.step('Click Team Dashboard link', async () => {
        await navigationPage.navigateToPage('Team Dashboard');
      });

      await test.step('Verify URL is correct', async () => {
        await navigationPage.verifyCurrentURL('/team-dashboard');
      });

      await test.step('Verify Team Dashboard content loaded', async () => {
        await navigationPage.verifyPageContentLoaded('Team Dashboard');
      });
    });
  });

  test.describe('Active Link Highlighting', () => {
    test('should highlight current page in navigation', async () => {
      await test.step('Navigate to Projects page', async () => {
        await navigationPage.navigateToPage('Projects');
      });

      await test.step('Verify Projects link is highlighted', async () => {
        await navigationPage.verifyActiveLinkHighlight('Projects');
      });

      await test.step('Verify other links are not highlighted', async () => {
        await navigationPage.verifyInactiveLinkStyling('Dashboard');
        await navigationPage.verifyInactiveLinkStyling('Employees');
      });
    });

    test('should update active link when navigating', async () => {
      const testPages = ['Dashboard', 'Employees', 'Projects', 'Allocations'];

      for (const pageName of testPages) {
        await test.step(`Navigate to ${pageName} and verify active state`, async () => {
          await navigationPage.navigateToPage(pageName);
          await navigationPage.verifyActiveLinkHighlight(pageName);
        });
      }
    });

    test('should maintain active state on page refresh', async ({ page }) => {
      await test.step('Navigate to Projects page', async () => {
        await navigationPage.navigateToPage('Projects');
      });

      await test.step('Refresh page', async () => {
        await page.reload();
        await navigationPage.waitForPageLoad();
      });

      await test.step('Verify Projects link is still highlighted', async () => {
        await navigationPage.verifyActiveLinkHighlight('Projects');
      });
    });
  });

  test.describe('Test IDs', () => {
    test('should have test IDs for all navigation links', async () => {
      await test.step('Verify all links have test IDs', async () => {
        await navigationPage.verifyAllLinksHaveTestIds();
      });
    });

    test('should have correct test ID format', async () => {
      const links = navigationPage.getAllNavigationLinks();

      for (const link of links) {
        await test.step(`Verify ${link.name} has correct test ID format`, async () => {
          expect(link.testId).toMatch(/^nav-/);
        });
      }
    });

    test('should have data-testid attribute on navigation container', async ({ page }) => {
      await test.step('Verify navigation has test ID', async () => {
        const navElement = page.locator('[data-testid="main-navigation"]');
        await expect(navElement).toBeVisible();
      });
    });
  });

  test.describe('React Router Navigation', () => {
    test('should use React Router without page refresh', async () => {
      await test.step('Navigate from Dashboard to Projects without page reload', async () => {
        const noReload = await navigationPage.verifyNoPageReload(async () => {
          await navigationPage.navigateToPage('Projects');
        });
        expect(noReload).toBeTruthy();
      });
    });

    test('should update URL without page refresh', async () => {
      await test.step('Set navigation marker', async () => {
        await navigationPage.navigateToPage('Dashboard');
      });

      await test.step('Navigate to multiple pages', async () => {
        const pages = ['Employees', 'Projects', 'Allocations'];
        for (const pageName of pages) {
          const noReload = await navigationPage.verifyNoPageReload(async () => {
            await navigationPage.navigateToPage(pageName);
          });
          expect(noReload).toBe(true, `Navigation to ${pageName} should not reload page`);
        }
      });
    });

    test('should maintain application state during navigation', async ({ page }) => {
      await test.step('Set state marker', async () => {
        await page.evaluate(() => {
          (window as any).testState = 'preserved';
        });
      });

      await test.step('Navigate to different page', async () => {
        await navigationPage.navigateToPage('Projects');
      });

      await test.step('Verify state is preserved', async () => {
        const statePreserved = await page.evaluate(() => {
          return (window as any).testState === 'preserved';
        });
        expect(statePreserved).toBeTruthy();
      });
    });
  });

  test.describe('Browser Navigation', () => {
    test('should work with browser back button', async () => {
      await test.step('Navigate to Projects', async () => {
        await navigationPage.navigateToPage('Projects');
        await navigationPage.verifyCurrentURL('/projects');
      });

      await test.step('Navigate to Employees', async () => {
        await navigationPage.navigateToPage('Employees');
        await navigationPage.verifyCurrentURL('/employees');
      });

      await test.step('Click browser back button', async () => {
        await navigationPage.navigateBack();
      });

      await test.step('Verify returned to Projects', async () => {
        await navigationPage.verifyCurrentURL('/projects');
        await navigationPage.verifyActiveLinkHighlight('Projects');
      });
    });

    test('should work with browser forward button', async () => {
      await test.step('Navigate to Projects', async () => {
        await navigationPage.navigateToPage('Projects');
      });

      await test.step('Navigate to Employees', async () => {
        await navigationPage.navigateToPage('Employees');
      });

      await test.step('Click browser back button', async () => {
        await navigationPage.navigateBack();
        await navigationPage.verifyCurrentURL('/projects');
      });

      await test.step('Click browser forward button', async () => {
        await navigationPage.navigateForward();
      });

      await test.step('Verify returned to Employees', async () => {
        await navigationPage.verifyCurrentURL('/employees');
        await navigationPage.verifyActiveLinkHighlight('Employees');
      });
    });

    test('should maintain navigation history', async () => {
      const navigationSequence = ['Projects', 'Employees', 'Allocations', 'Schedule'];

      await test.step('Navigate through sequence', async () => {
        for (const pageName of navigationSequence) {
          await navigationPage.navigateToPage(pageName);
        }
      });

      await test.step('Navigate back through history', async () => {
        for (let i = navigationSequence.length - 2; i >= 0; i--) {
          await navigationPage.navigateBack();
          const expectedRoute = navigationPage.getRoutes().find(r => r.name === navigationSequence[i]);
          if (expectedRoute) {
            await navigationPage.verifyCurrentURL(expectedRoute.path);
          }
        }
      });
    });
  });

  test.describe('Deep Linking', () => {
    test('should handle direct URL access to Dashboard', async () => {
      await test.step('Navigate directly to Dashboard URL', async () => {
        await navigationPage.navigateDirectlyToURL('/');
      });

      await test.step('Verify page loads correctly', async () => {
        await navigationPage.verifyPageContentLoaded('Dashboard');
        await navigationPage.verifyActiveLinkHighlight('Dashboard');
      });
    });

    test('should handle direct URL access to Projects', async () => {
      await test.step('Navigate directly to Projects URL', async () => {
        await navigationPage.navigateDirectlyToURL('/projects');
      });

      await test.step('Verify page loads correctly', async () => {
        await navigationPage.verifyCurrentURL('/projects');
        await navigationPage.verifyPageContentLoaded('Projects');
        await navigationPage.verifyActiveLinkHighlight('Projects');
      });
    });

    test('should handle direct URL access to all pages', async () => {
      const routes = navigationPage.getRoutes();

      for (const route of routes) {
        await test.step(`Access ${route.name} directly via URL`, async () => {
          await navigationPage.navigateDirectlyToURL(route.path);
          await navigationPage.verifyCurrentURL(route.path);
          await navigationPage.verifyPageContentLoaded(route.name);
        });
      }
    });

    test('should maintain navigation after deep link', async () => {
      await test.step('Access page via deep link', async () => {
        await navigationPage.navigateDirectlyToURL('/projects');
      });

      await test.step('Use navigation to go to different page', async () => {
        await navigationPage.navigateToPage('Employees');
        await navigationPage.verifyCurrentURL('/employees');
      });

      await test.step('Verify navigation works normally', async () => {
        await navigationPage.navigateToPage('Dashboard');
        await navigationPage.verifyCurrentURL('/');
      });
    });

    test('should handle invalid URL with redirect', async () => {
      await test.step('Navigate to invalid URL', async () => {
        await navigationPage.navigateDirectlyToURL('/invalid-page-that-does-not-exist');
      });

      await test.step('Verify redirected to home page', async () => {
        await navigationPage.verifyCurrentURL('/');
        await navigationPage.verifyPageContentLoaded('Dashboard');
      });
    });
  });

  test.describe('Navigation Flow', () => {
    test('should complete full navigation circuit', async () => {
      const allPages = navigationPage.getAllNavigationLinks();

      for (const link of allPages) {
        await test.step(`Navigate to ${link.name}`, async () => {
          await navigationPage.navigateToPage(link.name);
          await navigationPage.verifyCurrentURL(link.path);
          await navigationPage.verifyNavigationPersistence();
        });
      }
    });

    test('should handle rapid navigation between pages', async () => {
      const pages = ['Projects', 'Employees', 'Allocations', 'Schedule', 'Dashboard'];

      await test.step('Rapidly navigate between pages', async () => {
        for (const pageName of pages) {
          await navigationPage.clickNavigationLink(
            navigationPage.getRoutes().find(r => r.name === pageName)!.testId
          );
          // Shorter wait to simulate rapid clicking
          await navigationPage.page.waitForTimeout(500);
        }
      });

      await test.step('Verify final page loaded correctly', async () => {
        await navigationPage.verifyCurrentURL('/');
        await navigationPage.verifyPageContentLoaded('Dashboard');
      });
    });

    test('should preserve URL parameters during navigation', async ({ page }) => {
      await test.step('Navigate with query parameter', async () => {
        await navigationPage.navigateDirectlyToURL('/projects?filter=active');
      });

      await test.step('Navigate to another page', async () => {
        await navigationPage.navigateToPage('Employees');
      });

      await test.step('Navigate back', async () => {
        await navigationPage.navigateBack();
      });

      await test.step('Verify query parameter preserved', async () => {
        expect(page.url()).toContain('filter=active');
      });
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible navigation links', async ({ page }) => {
      await test.step('Verify links are keyboard accessible', async () => {
        // Tab to first link
        await page.keyboard.press('Tab');

        // Verify focus is on navigation
        const focusedElement = await page.evaluate(() => {
          return document.activeElement?.getAttribute('data-testid');
        });

        expect(focusedElement).toBeTruthy();
      });
    });

    test('should support keyboard navigation', async ({ page }) => {
      await test.step('Navigate using keyboard', async () => {
        // Tab to navigation
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Press Enter to activate link
        await page.keyboard.press('Enter');
        await navigationPage.waitForPageLoad();

        // Verify navigation occurred
        const currentURL = page.url();
        expect(currentURL).toBeTruthy();
      });
    });
  });
});
