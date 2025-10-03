"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_helpers_1 = require("../helpers/test-helpers");
test_1.test.describe('Authentication System', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });
    test_1.test.describe('Login Form', () => {
        test_1.test.beforeEach(async ({ page }) => {
            await page.goto('/auth/login');
        });
        (0, test_1.test)('should display login form correctly', async ({ page, testHelpers }) => {
            const loginForm = await testHelpers.waitForElement('[data-testid="login-form"]');
            await (0, test_1.expect)(loginForm).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Welcome Back')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="email-input"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="password-input"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="login-button"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="google-login-btn"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="github-login-btn"]')).toBeVisible();
        });
        (0, test_1.test)('should validate email input', async ({ page, testHelpers }) => {
            const loginButton = await testHelpers.waitForElement('[data-testid="login-button"]');
            await loginButton.click();
            await (0, test_1.expect)(page.locator('text=Email is required')).toBeVisible();
            await testHelpers.fillFormField('[data-testid="email-input"]', 'invalid-email');
            await loginButton.click();
            await (0, test_1.expect)(page.locator('text=Please enter a valid email address')).toBeVisible();
        });
        (0, test_1.test)('should validate password input', async ({ page, testHelpers }) => {
            await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
            const loginButton = await testHelpers.waitForElement('[data-testid="login-button"]');
            await loginButton.click();
            await (0, test_1.expect)(page.locator('text=Password is required')).toBeVisible();
            await testHelpers.fillFormField('[data-testid="password-input"]', '123');
            await loginButton.click();
            await (0, test_1.expect)(page.locator('text=Password must be at least 6 characters')).toBeVisible();
        });
        (0, test_1.test)('should toggle password visibility', async ({ page, testHelpers }) => {
            const passwordInput = await testHelpers.waitForElement('[data-testid="password-input"]');
            const toggleButton = await testHelpers.waitForElement('[data-testid="toggle-password"]');
            await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'password');
            await toggleButton.click();
            await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'text');
            await toggleButton.click();
            await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'password');
        });
        (0, test_1.test)('should handle remember me checkbox', async ({ page, testHelpers }) => {
            const rememberCheckbox = await testHelpers.waitForElement('[data-testid="remember-me-checkbox"]');
            await (0, test_1.expect)(rememberCheckbox).not.toBeChecked();
            await rememberCheckbox.click();
            await (0, test_1.expect)(rememberCheckbox).toBeChecked();
        });
        (0, test_1.test)('should perform successful login', async ({ page, testHelpers }) => {
            await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
            await testHelpers.fillFormField('[data-testid="password-input"]', 'password123');
            const loginButton = await testHelpers.waitForElement('[data-testid="login-button"]');
            await loginButton.click();
            await (0, test_1.expect)(loginButton).toContainText('Signing in...');
            await (0, test_1.expect)(loginButton).toBeDisabled();
            await testHelpers.verifyToast('Welcome back!', 'success');
            const token = await page.evaluate(() => localStorage.getItem('authToken'));
            (0, test_1.expect)(token).toBeTruthy();
        });
        (0, test_1.test)('should handle social login buttons', async ({ page, testHelpers }) => {
            const googleBtn = await testHelpers.waitForElement('[data-testid="google-login-btn"]');
            await googleBtn.click();
            await testHelpers.verifyToast('Google Login', 'success');
            const githubBtn = await testHelpers.waitForElement('[data-testid="github-login-btn"]');
            await githubBtn.click();
            await testHelpers.verifyToast('GitHub Login', 'success');
        });
        (0, test_1.test)('should handle forgot password', async ({ page, testHelpers }) => {
            await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
            const forgotPasswordLink = await testHelpers.waitForElement('[data-testid="forgot-password-link"]');
            await forgotPasswordLink.click();
        });
        (0, test_1.test)('should navigate to signup', async ({ page, testHelpers }) => {
            const signupLink = await testHelpers.waitForElement('[data-testid="signup-link"]');
            await signupLink.click();
        });
    });
    test_1.test.describe('Signup Form', () => {
        test_1.test.beforeEach(async ({ page }) => {
            await page.goto('/auth/signup');
        });
        (0, test_1.test)('should display signup form correctly', async ({ page, testHelpers }) => {
            const signupForm = await testHelpers.waitForElement('[data-testid="signup-form"]');
            await (0, test_1.expect)(signupForm).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Create Account')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="name-input"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="email-input"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="password-input"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="terms-checkbox"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="signup-button"]')).toBeVisible();
        });
        (0, test_1.test)('should validate all form fields', async ({ page, testHelpers }) => {
            const signupButton = await testHelpers.waitForElement('[data-testid="signup-button"]');
            await signupButton.click();
            await (0, test_1.expect)(page.locator('text=Full name is required')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Email is required')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Password is required')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=You must agree to the terms')).toBeVisible();
        });
        (0, test_1.test)('should show password strength indicator', async ({ page, testHelpers }) => {
            const passwordInput = await testHelpers.waitForElement('[data-testid="password-input"]');
            await passwordInput.fill('123');
            const strengthIndicator = await testHelpers.waitForElement('[data-testid="password-strength"]');
            await (0, test_1.expect)(strengthIndicator).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Weak')).toBeVisible();
            await passwordInput.fill('StrongP@ssw0rd123');
            await (0, test_1.expect)(page.locator('text=Strong')).toBeVisible();
            await (0, test_1.expect)(page.locator('.text-green-600').first()).toBeVisible();
        });
        (0, test_1.test)('should validate password confirmation', async ({ page, testHelpers }) => {
            await testHelpers.fillFormField('[data-testid="password-input"]', 'password123');
            await testHelpers.fillFormField('[data-testid="confirm-password-input"]', 'different');
            const signupButton = await testHelpers.waitForElement('[data-testid="signup-button"]');
            await signupButton.click();
            await (0, test_1.expect)(page.locator('text=Passwords do not match')).toBeVisible();
            await testHelpers.fillFormField('[data-testid="confirm-password-input"]', 'password123');
            await (0, test_1.expect)(page.locator('text=Passwords match')).toBeVisible();
        });
        (0, test_1.test)('should handle successful signup', async ({ page, testHelpers }) => {
            await testHelpers.fillFormField('[data-testid="name-input"]', 'John Doe');
            await testHelpers.fillFormField('[data-testid="email-input"]', 'john@example.com');
            await testHelpers.fillFormField('[data-testid="password-input"]', 'StrongP@ssw0rd123');
            await testHelpers.fillFormField('[data-testid="confirm-password-input"]', 'StrongP@ssw0rd123');
            const termsCheckbox = await testHelpers.waitForElement('[data-testid="terms-checkbox"]');
            await termsCheckbox.click();
            const signupButton = await testHelpers.waitForElement('[data-testid="signup-button"]');
            await signupButton.click();
            await (0, test_1.expect)(signupButton).toContainText('Creating Account...');
            await (0, test_1.expect)(signupButton).toBeDisabled();
            await testHelpers.verifyToast('Account Created Successfully!', 'success');
        });
        (0, test_1.test)('should toggle password visibility for both fields', async ({ page, testHelpers }) => {
            const passwordToggle = await testHelpers.waitForElement('[data-testid="toggle-password"]');
            const confirmPasswordToggle = await testHelpers.waitForElement('[data-testid="toggle-confirm-password"]');
            const passwordInput = page.locator('[data-testid="password-input"]');
            const confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]');
            await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'password');
            await passwordToggle.click();
            await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'text');
            await (0, test_1.expect)(confirmPasswordInput).toHaveAttribute('type', 'password');
            await confirmPasswordToggle.click();
            await (0, test_1.expect)(confirmPasswordInput).toHaveAttribute('type', 'text');
        });
    });
    test_1.test.describe('Protected Routes', () => {
        (0, test_1.test)('should redirect to login when not authenticated', async ({ page, testHelpers }) => {
            await page.goto('/protected-page');
            const loginRequired = await testHelpers.waitForElement('[data-testid="login-required"]');
            await (0, test_1.expect)(loginRequired).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Authentication Required')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Please sign in to access this page')).toBeVisible();
        });
        (0, test_1.test)('should show loading state during auth check', async ({ page, testHelpers }) => {
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
            const authLoading = page.locator('[data-testid="auth-loading"]');
            await (0, test_1.expect)(authLoading).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Verifying Access')).toBeVisible();
        });
        (0, test_1.test)('should allow access when authenticated', async ({ page, testHelpers }) => {
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
            await testHelpers.verifyLoading(false);
            const protectedContent = await testHelpers.waitForElement('[data-testid="protected-content"]');
            await (0, test_1.expect)(protectedContent).toBeVisible();
        });
        (0, test_1.test)('should handle role-based access control', async ({ page, testHelpers }) => {
            await page.addInitScript(() => {
                localStorage.setItem('authToken', 'valid-token');
                localStorage.setItem('user', JSON.stringify({
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'user'
                }));
            });
            await page.goto('/admin-only-page');
            const accessDenied = await testHelpers.waitForElement('[data-testid="access-denied"]');
            await (0, test_1.expect)(accessDenied).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Access Denied')).toBeVisible();
        });
        (0, test_1.test)('should handle expired tokens', async ({ page, testHelpers }) => {
            await page.addInitScript(() => {
                localStorage.setItem('authToken', 'expired-token');
                localStorage.setItem('user', JSON.stringify({
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'user'
                }));
                const expiry = new Date();
                expiry.setHours(expiry.getHours() - 1);
                localStorage.setItem('tokenExpiry', expiry.toISOString());
            });
            await page.goto('/protected-page');
            const loginRequired = await testHelpers.waitForElement('[data-testid="login-required"]');
            await (0, test_1.expect)(loginRequired).toBeVisible();
            const token = await page.evaluate(() => localStorage.getItem('authToken'));
            (0, test_1.expect)(token).toBeNull();
        });
    });
    test_1.test.describe('Responsive Design', () => {
        (0, test_1.test)('should be responsive on mobile devices', async ({ page, testHelpers }) => {
            await page.setViewportSize(test_helpers_1.VIEWPORTS.MOBILE);
            await page.goto('/auth/login');
            const loginForm = await testHelpers.waitForElement('[data-testid="login-form"]');
            await (0, test_1.expect)(loginForm).toBeVisible();
            const formCard = loginForm.locator('..');
            await (0, test_1.expect)(formCard).toBeVisible();
            await page.screenshot({ path: 'test-results/auth-mobile.png' });
        });
        (0, test_1.test)('should handle keyboard navigation', async ({ page, testHelpers }) => {
            await page.goto('/auth/login');
            await testHelpers.testKeyboardNavigation();
            await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
            await testHelpers.fillFormField('[data-testid="password-input"]', 'password123');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Enter');
            await testHelpers.verifyToast('Welcome back!', 'success');
        });
    });
    test_1.test.describe('Accessibility', () => {
        (0, test_1.test)('should have proper ARIA labels and roles', async ({ page, testHelpers }) => {
            await page.goto('/auth/login');
            await testHelpers.testAccessibility();
            const emailInput = page.locator('[data-testid="email-input"]');
            await (0, test_1.expect)(emailInput).toHaveAttribute('type', 'email');
            const passwordInput = page.locator('[data-testid="password-input"]');
            await (0, test_1.expect)(passwordInput).toHaveAttribute('type', 'password');
        });
        (0, test_1.test)('should support screen readers', async ({ page }) => {
            await page.goto('/auth/login');
            await (0, test_1.expect)(page.locator('label[for="email"]')).toContainText('Email Address');
            await (0, test_1.expect)(page.locator('label[for="password"]')).toContainText('Password');
            const form = page.locator('[data-testid="login-form"]');
            await (0, test_1.expect)(form).toHaveAttribute('role', 'form');
        });
    });
});
//# sourceMappingURL=authentication.spec.js.map