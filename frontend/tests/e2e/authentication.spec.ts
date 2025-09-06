/**
 * JWT Authentication E2E Tests
 * Comprehensive testing of login, signup, and protected routes
 */
import { test, expect } from '../fixtures/test-fixtures';
import { TestHelpers, VIEWPORTS } from '../helpers/test-helpers';

test.describe('Authentication System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Login Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
    });

    test('should display login form correctly', async ({ page, testHelpers }) => {
      const loginForm = await testHelpers.waitForElement('[data-testid="login-form"]');
      await expect(loginForm).toBeVisible();

      // Check form elements
      await expect(page.locator('text=Welcome Back')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

      // Check social login buttons
      await expect(page.locator('[data-testid="google-login-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="github-login-btn"]')).toBeVisible();
    });

    test('should validate email input', async ({ page, testHelpers }) => {
      const loginButton = await testHelpers.waitForElement('[data-testid="login-button"]');
      
      // Try to submit without email
      await loginButton.click();
      await expect(page.locator('text=Email is required')).toBeVisible();

      // Try invalid email
      await testHelpers.fillFormField('[data-testid="email-input"]', 'invalid-email');
      await loginButton.click();
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    });

    test('should validate password input', async ({ page, testHelpers }) => {
      await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
      
      const loginButton = await testHelpers.waitForElement('[data-testid="login-button"]');
      await loginButton.click();
      
      await expect(page.locator('text=Password is required')).toBeVisible();

      // Try short password
      await testHelpers.fillFormField('[data-testid="password-input"]', '123');
      await loginButton.click();
      await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page, testHelpers }) => {
      const passwordInput = await testHelpers.waitForElement('[data-testid="password-input"]');
      const toggleButton = await testHelpers.waitForElement('[data-testid="toggle-password"]');

      // Password should be hidden initially
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle to hide password again
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should handle remember me checkbox', async ({ page, testHelpers }) => {
      const rememberCheckbox = await testHelpers.waitForElement('[data-testid="remember-me-checkbox"]');
      
      // Should be unchecked initially
      await expect(rememberCheckbox).not.toBeChecked();

      // Click to check
      await rememberCheckbox.click();
      await expect(rememberCheckbox).toBeChecked();
    });

    test('should perform successful login', async ({ page, testHelpers }) => {
      await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
      await testHelpers.fillFormField('[data-testid="password-input"]', 'password123');

      const loginButton = await testHelpers.waitForElement('[data-testid="login-button"]');
      await loginButton.click();

      // Check loading state
      await expect(loginButton).toContainText('Signing in...');
      await expect(loginButton).toBeDisabled();

      // Wait for success toast
      await testHelpers.verifyToast('Welcome back!', 'success');

      // Check that auth token is set
      const token = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(token).toBeTruthy();
    });

    test('should handle social login buttons', async ({ page, testHelpers }) => {
      // Test Google login
      const googleBtn = await testHelpers.waitForElement('[data-testid="google-login-btn"]');
      await googleBtn.click();
      await testHelpers.verifyToast('Google Login', 'success');

      // Test GitHub login
      const githubBtn = await testHelpers.waitForElement('[data-testid="github-login-btn"]');
      await githubBtn.click();
      await testHelpers.verifyToast('GitHub Login', 'success');
    });

    test('should handle forgot password', async ({ page, testHelpers }) => {
      await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
      
      const forgotPasswordLink = await testHelpers.waitForElement('[data-testid="forgot-password-link"]');
      await forgotPasswordLink.click();

      // Would typically navigate to forgot password page or show modal
    });

    test('should navigate to signup', async ({ page, testHelpers }) => {
      const signupLink = await testHelpers.waitForElement('[data-testid="signup-link"]');
      await signupLink.click();

      // Would typically navigate to signup page
    });
  });

  test.describe('Signup Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/signup');
    });

    test('should display signup form correctly', async ({ page, testHelpers }) => {
      const signupForm = await testHelpers.waitForElement('[data-testid="signup-form"]');
      await expect(signupForm).toBeVisible();

      // Check form elements
      await expect(page.locator('text=Create Account')).toBeVisible();
      await expect(page.locator('[data-testid="name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="terms-checkbox"]')).toBeVisible();
      await expect(page.locator('[data-testid="signup-button"]')).toBeVisible();
    });

    test('should validate all form fields', async ({ page, testHelpers }) => {
      const signupButton = await testHelpers.waitForElement('[data-testid="signup-button"]');
      await signupButton.click();

      // Check validation messages
      await expect(page.locator('text=Full name is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
      await expect(page.locator('text=You must agree to the terms')).toBeVisible();
    });

    test('should show password strength indicator', async ({ page, testHelpers }) => {
      const passwordInput = await testHelpers.waitForElement('[data-testid="password-input"]');
      
      // Type weak password
      await passwordInput.fill('123');
      
      const strengthIndicator = await testHelpers.waitForElement('[data-testid="password-strength"]');
      await expect(strengthIndicator).toBeVisible();
      await expect(page.locator('text=Weak')).toBeVisible();

      // Type strong password
      await passwordInput.fill('StrongP@ssw0rd123');
      await expect(page.locator('text=Strong')).toBeVisible();

      // Check requirement indicators
      await expect(page.locator('.text-green-600').first()).toBeVisible(); // At least one requirement met
    });

    test('should validate password confirmation', async ({ page, testHelpers }) => {
      await testHelpers.fillFormField('[data-testid="password-input"]', 'password123');
      await testHelpers.fillFormField('[data-testid="confirm-password-input"]', 'different');

      const signupButton = await testHelpers.waitForElement('[data-testid="signup-button"]');
      await signupButton.click();

      await expect(page.locator('text=Passwords do not match')).toBeVisible();

      // Test matching passwords
      await testHelpers.fillFormField('[data-testid="confirm-password-input"]', 'password123');
      await expect(page.locator('text=Passwords match')).toBeVisible();
    });

    test('should handle successful signup', async ({ page, testHelpers }) => {
      // Fill all required fields
      await testHelpers.fillFormField('[data-testid="name-input"]', 'John Doe');
      await testHelpers.fillFormField('[data-testid="email-input"]', 'john@example.com');
      await testHelpers.fillFormField('[data-testid="password-input"]', 'StrongP@ssw0rd123');
      await testHelpers.fillFormField('[data-testid="confirm-password-input"]', 'StrongP@ssw0rd123');

      // Accept terms
      const termsCheckbox = await testHelpers.waitForElement('[data-testid="terms-checkbox"]');
      await termsCheckbox.click();

      const signupButton = await testHelpers.waitForElement('[data-testid="signup-button"]');
      await signupButton.click();

      // Check loading state
      await expect(signupButton).toContainText('Creating Account...');
      await expect(signupButton).toBeDisabled();

      // Wait for success toast
      await testHelpers.verifyToast('Account Created Successfully!', 'success');
    });

    test('should toggle password visibility for both fields', async ({ page, testHelpers }) => {
      const passwordToggle = await testHelpers.waitForElement('[data-testid="toggle-password"]');
      const confirmPasswordToggle = await testHelpers.waitForElement('[data-testid="toggle-confirm-password"]');

      const passwordInput = page.locator('[data-testid="password-input"]');
      const confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]');

      // Test password field toggle
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await passwordToggle.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Test confirm password field toggle
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      await confirmPasswordToggle.click();
      await expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page, testHelpers }) => {
      await page.goto('/protected-page');

      // Should show login required message
      const loginRequired = await testHelpers.waitForElement('[data-testid="login-required"]');
      await expect(loginRequired).toBeVisible();
      
      await expect(page.locator('text=Authentication Required')).toBeVisible();
      await expect(page.locator('text=Please sign in to access this page')).toBeVisible();
    });

    test('should show loading state during auth check', async ({ page, testHelpers }) => {
      // Set token but delay the auth check
      await page.addInitScript(() => {
        localStorage.setItem('authToken', 'mock-token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'user'
        }));
      });

      await page.goto('/protected-page');

      // Should show loading state initially
      const authLoading = page.locator('[data-testid="auth-loading"]');
      await expect(authLoading).toBeVisible();
      await expect(page.locator('text=Verifying Access')).toBeVisible();
    });

    test('should allow access when authenticated', async ({ page, testHelpers }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('authToken', 'valid-token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }));
        
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1);
        localStorage.setItem('tokenExpiry', expiry.toISOString());
      });

      await page.goto('/protected-page');

      // Should show protected content
      await testHelpers.verifyLoading(false);
      const protectedContent = await testHelpers.waitForElement('[data-testid="protected-content"]');
      await expect(protectedContent).toBeVisible();
    });

    test('should handle role-based access control', async ({ page, testHelpers }) => {
      // Mock user with insufficient role
      await page.addInitScript(() => {
        localStorage.setItem('authToken', 'valid-token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'user' // Not admin
        }));
      });

      await page.goto('/admin-only-page'); // Requires admin role

      // Should show access denied
      const accessDenied = await testHelpers.waitForElement('[data-testid="access-denied"]');
      await expect(accessDenied).toBeVisible();
      await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test('should handle expired tokens', async ({ page, testHelpers }) => {
      // Mock expired token
      await page.addInitScript(() => {
        localStorage.setItem('authToken', 'expired-token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'user'
        }));
        
        const expiry = new Date();
        expiry.setHours(expiry.getHours() - 1); // 1 hour ago
        localStorage.setItem('tokenExpiry', expiry.toISOString());
      });

      await page.goto('/protected-page');

      // Should redirect to login
      const loginRequired = await testHelpers.waitForElement('[data-testid="login-required"]');
      await expect(loginRequired).toBeVisible();

      // Token should be cleared
      const token = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(token).toBeNull();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile devices', async ({ page, testHelpers }) => {
      await page.setViewportSize(VIEWPORTS.MOBILE);
      await page.goto('/auth/login');

      const loginForm = await testHelpers.waitForElement('[data-testid="login-form"]');
      await expect(loginForm).toBeVisible();

      // Form should be properly sized on mobile
      const formCard = loginForm.locator('..');
      await expect(formCard).toBeVisible();

      // Take screenshot for visual regression testing
      await page.screenshot({ path: 'test-results/auth-mobile.png' });
    });

    test('should handle keyboard navigation', async ({ page, testHelpers }) => {
      await page.goto('/auth/login');
      
      // Test tab navigation through form
      await testHelpers.testKeyboardNavigation();

      // Test form submission with Enter key
      await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
      await testHelpers.fillFormField('[data-testid="password-input"]', 'password123');
      
      await page.keyboard.press('Tab'); // Move to login button
      await page.keyboard.press('Enter');

      // Should trigger login
      await testHelpers.verifyToast('Welcome back!', 'success');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page, testHelpers }) => {
      await page.goto('/auth/login');
      await testHelpers.testAccessibility();

      // Check specific accessibility features
      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toHaveAttribute('type', 'email');

      const passwordInput = page.locator('[data-testid="password-input"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/auth/login');

      // Check for proper labels
      await expect(page.locator('label[for="email"]')).toContainText('Email Address');
      await expect(page.locator('label[for="password"]')).toContainText('Password');

      // Check form has proper structure
      const form = page.locator('[data-testid="login-form"]');
      await expect(form).toHaveAttribute('role', 'form');
    });
  });
});