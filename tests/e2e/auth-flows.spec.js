"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Authentication and Authorization Flows', () => {
    test_1.test.describe('Login Flow', () => {
        (0, test_1.test)('should login with valid credentials', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await (0, test_1.expect)(page.locator('[data-testid="user-menu"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="user-name"]')).toContainText('Admin User');
        });
        (0, test_1.test)('should show error for invalid credentials', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'invalid@company.com');
            await page.fill('[data-testid="password-input"]', 'wrongpassword');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
            await (0, test_1.expect)(page).toHaveURL('/login');
        });
        (0, test_1.test)('should validate required fields', async ({ page }) => {
            await page.goto('/login');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="password-error"]')).toBeVisible();
        });
        (0, test_1.test)('should validate email format', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'invalid-email');
            await page.blur('[data-testid="email-input"]');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
        });
        (0, test_1.test)('should handle "Remember Me" functionality', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.check('[data-testid="remember-me-checkbox"]');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await page.reload();
            await (0, test_1.expect)(page.locator('[data-testid="user-menu"]')).toBeVisible();
        });
    });
    test_1.test.describe('Logout Flow', () => {
        test_1.test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
        });
        (0, test_1.test)('should logout successfully', async ({ page }) => {
            await page.click('[data-testid="user-menu"]');
            await page.click('[data-testid="logout-button"]');
            await (0, test_1.expect)(page).toHaveURL('/login');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('Successfully logged out');
        });
        (0, test_1.test)('should clear user session on logout', async ({ page }) => {
            await page.click('[data-testid="user-menu"]');
            await page.click('[data-testid="logout-button"]');
            await page.goto('/dashboard');
            await (0, test_1.expect)(page).toHaveURL('/login');
        });
    });
    test_1.test.describe('Registration Flow', () => {
        (0, test_1.test)('should register new user successfully', async ({ page }) => {
            await page.goto('/register');
            await page.fill('[data-testid="first-name-input"]', 'New');
            await page.fill('[data-testid="last-name-input"]', 'User');
            await page.fill('[data-testid="email-input"]', 'newuser@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.fill('[data-testid="confirm-password-input"]', 'password123');
            await page.click('[data-testid="role-select"]');
            await page.click('[data-testid="role-option-employee"]');
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');
            await (0, test_1.expect)(page).toHaveURL(/\/(login|dashboard)/);
        });
        (0, test_1.test)('should validate password confirmation', async ({ page }) => {
            await page.goto('/register');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.fill('[data-testid="confirm-password-input"]', 'differentpassword');
            await page.blur('[data-testid="confirm-password-input"]');
            await (0, test_1.expect)(page.locator('[data-testid="password-confirmation-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="password-confirmation-error"]')).toContainText('Passwords do not match');
        });
        (0, test_1.test)('should validate password strength', async ({ page }) => {
            await page.goto('/register');
            await page.fill('[data-testid="password-input"]', '123');
            await page.blur('[data-testid="password-input"]');
            await (0, test_1.expect)(page.locator('[data-testid="password-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
        });
        (0, test_1.test)('should prevent duplicate email registration', async ({ page }) => {
            await page.goto('/register');
            await page.fill('[data-testid="first-name-input"]', 'Duplicate');
            await page.fill('[data-testid="last-name-input"]', 'User');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.fill('[data-testid="confirm-password-input"]', 'password123');
            await page.click('[data-testid="register-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
        });
    });
    test_1.test.describe('Password Reset Flow', () => {
        (0, test_1.test)('should initiate password reset', async ({ page }) => {
            await page.goto('/login');
            await page.click('[data-testid="forgot-password-link"]');
            await (0, test_1.expect)(page).toHaveURL('/forgot-password');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.click('[data-testid="send-reset-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('Password reset email sent');
        });
        (0, test_1.test)('should handle invalid email for password reset', async ({ page }) => {
            await page.goto('/forgot-password');
            await page.fill('[data-testid="email-input"]', 'nonexistent@company.com');
            await page.click('[data-testid="send-reset-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText('Email not found');
        });
        (0, test_1.test)('should reset password with valid token', async ({ page }) => {
            const resetToken = 'valid-reset-token-123';
            await page.goto(`/reset-password?token=${resetToken}`);
            await page.fill('[data-testid="new-password-input"]', 'newpassword123');
            await page.fill('[data-testid="confirm-new-password-input"]', 'newpassword123');
            await page.click('[data-testid="reset-password-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toContainText('Password reset successful');
            await (0, test_1.expect)(page).toHaveURL('/login');
        });
    });
    test_1.test.describe('Role-Based Access Control', () => {
        (0, test_1.test)('should allow admin access to all features', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await (0, test_1.expect)(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="delete-employee-button"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="export-employees-button"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="admin-settings-link"]')).toBeVisible();
        });
        (0, test_1.test)('should restrict employee access to read-only features', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'employee@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await (0, test_1.expect)(page.locator('[data-testid="add-employee-button"]')).not.toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="delete-employee-button"]')).not.toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="admin-settings-link"]')).not.toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="employee-list"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="search-input"]')).toBeVisible();
        });
        (0, test_1.test)('should restrict HR access appropriately', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'hr@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await (0, test_1.expect)(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="edit-employee-button"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="export-employees-button"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="admin-settings-link"]')).not.toBeVisible();
        });
    });
    test_1.test.describe('Session Management', () => {
        (0, test_1.test)('should handle session timeout', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await page.evaluate(() => {
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
            });
            await page.reload();
            await (0, test_1.expect)(page).toHaveURL('/login');
            await (0, test_1.expect)(page.locator('[data-testid="info-message"]')).toContainText('Session expired');
        });
        (0, test_1.test)('should refresh token automatically', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await page.waitForTimeout(5000);
            await (0, test_1.expect)(page.locator('[data-testid="user-menu"]')).toBeVisible();
        });
        (0, test_1.test)('should handle concurrent sessions correctly', async ({ page, context }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            const newPage = await context.newPage();
            await newPage.goto('/login');
            await newPage.fill('[data-testid="email-input"]', 'admin@company.com');
            await newPage.fill('[data-testid="password-input"]', 'password123');
            await newPage.click('[data-testid="login-button"]');
            await (0, test_1.expect)(newPage).toHaveURL('/dashboard');
            await (0, test_1.expect)(page.locator('[data-testid="user-menu"]')).toBeVisible();
            await (0, test_1.expect)(newPage.locator('[data-testid="user-menu"]')).toBeVisible();
        });
    });
    test_1.test.describe('Security Features', () => {
        (0, test_1.test)('should redirect unauthenticated users', async ({ page }) => {
            await page.goto('/dashboard');
            await (0, test_1.expect)(page).toHaveURL('/login');
        });
        (0, test_1.test)('should prevent brute force attacks', async ({ page }) => {
            await page.goto('/login');
            for (let i = 0; i < 5; i++) {
                await page.fill('[data-testid="email-input"]', 'admin@company.com');
                await page.fill('[data-testid="password-input"]', 'wrongpassword');
                await page.click('[data-testid="login-button"]');
                await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toBeVisible();
                await page.waitForTimeout(1000);
            }
            await (0, test_1.expect)(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="rate-limit-error"]')).toContainText('Too many failed attempts');
        });
        (0, test_1.test)('should handle CSRF protection', async ({ page }) => {
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', 'admin@company.com');
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-button"]');
            await (0, test_1.expect)(page).toHaveURL('/dashboard');
            await page.click('[data-testid="add-employee-button"]');
            const csrfToken = await page.locator('[name="_token"]').getAttribute('value');
            (0, test_1.expect)(csrfToken).toBeTruthy();
        });
    });
});
//# sourceMappingURL=auth-flows.spec.js.map