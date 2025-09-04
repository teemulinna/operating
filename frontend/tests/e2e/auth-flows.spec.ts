import { test, expect } from '@playwright/test';

test.describe('Authentication and Authorization Flows', () => {
  test.describe('Login Flow', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      
      // Submit login
      await page.click('[data-testid="login-button"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      
      // Should show user info in header
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText('Admin User');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'invalid@company.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      
      await page.click('[data-testid="login-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
      
      // Should stay on login page
      await expect(page).toHaveURL('/login');
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit empty form
      await page.click('[data-testid="login-button"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.blur('[data-testid="email-input"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
    });

    test('should handle "Remember Me" functionality', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      
      // Check "Remember Me"
      await page.check('[data-testid="remember-me-checkbox"]');
      
      await page.click('[data-testid="login-button"]');
      
      // Should redirect successfully
      await expect(page).toHaveURL('/dashboard');
      
      // Refresh page to test persistence
      await page.reload();
      
      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should logout successfully', async ({ page }) => {
      // Click user menu
      await page.click('[data-testid="user-menu"]');
      
      // Click logout
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await expect(page).toHaveURL('/login');
      
      // Should show logout success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Successfully logged out');
    });

    test('should clear user session on logout', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Try to access protected page directly
      await page.goto('/dashboard');
      
      // Should redirect back to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Registration Flow', () => {
    test('should register new user successfully', async ({ page }) => {
      await page.goto('/register');
      
      // Fill registration form
      await page.fill('[data-testid="first-name-input"]', 'New');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.fill('[data-testid="email-input"]', 'newuser@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      
      // Select role
      await page.click('[data-testid="role-select"]');
      await page.click('[data-testid="role-option-employee"]');
      
      await page.click('[data-testid="register-button"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');
      
      // Should redirect to login or dashboard
      await expect(page).toHaveURL(/\/(login|dashboard)/);
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'differentpassword');
      
      await page.blur('[data-testid="confirm-password-input"]');
      
      await expect(page.locator('[data-testid="password-confirmation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-confirmation-error"]')).toContainText('Passwords do not match');
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');
      
      // Test weak password
      await page.fill('[data-testid="password-input"]', '123');
      await page.blur('[data-testid="password-input"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('[data-testid="first-name-input"]', 'Duplicate');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.fill('[data-testid="email-input"]', 'admin@company.com'); // Existing email
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should initiate password reset', async ({ page }) => {
      await page.goto('/login');
      
      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]');
      
      await expect(page).toHaveURL('/forgot-password');
      
      // Enter email
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.click('[data-testid="send-reset-button"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset email sent');
    });

    test('should handle invalid email for password reset', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await page.fill('[data-testid="email-input"]', 'nonexistent@company.com');
      await page.click('[data-testid="send-reset-button"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email not found');
    });

    test('should reset password with valid token', async ({ page }) => {
      // This test would require a valid reset token
      // In a real scenario, you'd get this from email or database
      const resetToken = 'valid-reset-token-123';
      
      await page.goto(`/reset-password?token=${resetToken}`);
      
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-new-password-input"]', 'newpassword123');
      
      await page.click('[data-testid="reset-password-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset successful');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should allow admin access to all features', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Admin should see all features
      await expect(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-employee-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-employees-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-settings-link"]')).toBeVisible();
    });

    test('should restrict employee access to read-only features', async ({ page }) => {
      // Login as employee
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'employee@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Employee should not see admin features
      await expect(page.locator('[data-testid="add-employee-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="delete-employee-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="admin-settings-link"]')).not.toBeVisible();
      
      // But should see read-only features
      await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    });

    test('should restrict HR access appropriately', async ({ page }) => {
      // Login as HR user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'hr@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // HR should see employee management features
      await expect(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="edit-employee-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-employees-button"]')).toBeVisible();
      
      // But not admin system settings
      await expect(page.locator('[data-testid="admin-settings-link"]')).not.toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should handle session timeout', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Simulate session expiry by manipulating storage/cookies
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
      });
      
      // Try to access protected resource
      await page.reload();
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="info-message"]')).toContainText('Session expired');
    });

    test('should refresh token automatically', async ({ page }) => {
      // This test would check automatic token refresh
      // Implementation depends on your auth system
      
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Wait for token refresh interval (if applicable)
      await page.waitForTimeout(5000);
      
      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle concurrent sessions correctly', async ({ page, context }) => {
      // Open first session
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Open second session in new tab
      const newPage = await context.newPage();
      await newPage.goto('/login');
      await newPage.fill('[data-testid="email-input"]', 'admin@company.com');
      await newPage.fill('[data-testid="password-input"]', 'password123');
      await newPage.click('[data-testid="login-button"]');
      
      await expect(newPage).toHaveURL('/dashboard');
      
      // Both sessions should work (or handle according to your policy)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Security Features', () => {
    test('should redirect unauthenticated users', async ({ page }) => {
      // Try to access protected page without login
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should prevent brute force attacks', async ({ page }) => {
      await page.goto('/login');
      
      // Try multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="email-input"]', 'admin@company.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');
        
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await page.waitForTimeout(1000);
      }
      
      // After multiple failures, should show rate limiting
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText('Too many failed attempts');
    });

    test('should handle CSRF protection', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@company.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Check that forms include CSRF tokens
      await page.click('[data-testid="add-employee-button"]');
      
      const csrfToken = await page.locator('[name="_token"]').getAttribute('value');
      expect(csrfToken).toBeTruthy();
    });
  });
});