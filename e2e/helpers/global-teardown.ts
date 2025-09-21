/**
 * Global teardown for E2E tests
 * Runs once after all tests complete
 */
async function globalTeardown() {
  console.log('\n🧹 Starting E2E Test Suite Global Teardown');
  
  // Clean up any test data if needed
  try {
    // This could include database cleanup, file cleanup, etc.
    console.log('🗑️ Cleaning up test artifacts...');
    
    // Example: Clean up test files
    // await fs.rm('./test-results/debug-*.png', { force: true });
    
    console.log('✅ Test cleanup complete');
  } catch (error) {
    console.log('⚠️ Warning: Test cleanup encountered issues:', error.message);
  }
  
  // Log test completion
  console.log('🎉 E2E Test Suite Complete');
  console.log('📊 Check test-results/ directory for detailed reports');
  console.log('🔍 View HTML report: npx playwright show-report\n');
}

export default globalTeardown;