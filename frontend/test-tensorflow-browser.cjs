/**
 * Browser Test for TensorFlow.js Integration
 * This script opens the browser and tests TensorFlow.js functionality
 */

const puppeteer = require('puppeteer');

async function testTensorFlowInBrowser() {
  console.log('🚀 Starting TensorFlow.js browser test...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'log') {
        console.log('🖥️  Browser LOG:', text);
      } else if (type === 'error') {
        console.log('❌ Browser ERROR:', text);
      } else if (type === 'warn') {
        console.log('⚠️  Browser WARN:', text);
      }
    });

    // Handle page errors
    page.on('pageerror', error => {
      console.error('💥 Page error:', error.message);
    });

    // Navigate to the frontend
    console.log('📱 Navigating to frontend...');
    await page.goto('http://localhost:3003', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    console.log('✅ Page loaded successfully');

    // Test TensorFlow.js initialization
    console.log('🧪 Testing TensorFlow.js in browser...');
    
    const testResult = await page.evaluate(async () => {
      try {
        // Wait for ML services to be available
        let attempts = 0;
        let mlServices = null;
        
        while (attempts < 10 && !mlServices) {
          try {
            // Try to access the ML services
            const mlModule = await import('/src/services/ml/index.ts');
            mlServices = mlModule;
            break;
          } catch (e) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (!mlServices) {
          return {
            success: false,
            error: 'Could not import ML services after 10 attempts'
          };
        }

        console.log('ML services imported successfully');

        // Test TensorFlow.js basic functionality
        const tf = await import('@tensorflow/tfjs');
        console.log('TensorFlow.js imported, version:', tf.version.tfjs);

        // Create a simple tensor to test
        const tensor = tf.tensor1d([1, 2, 3, 4]);
        const sum = tf.sum(tensor);
        const result = await sum.data();
        
        tensor.dispose();
        sum.dispose();

        const isWorking = result[0] === 10;
        console.log('Tensor test result:', result[0], 'Expected: 10, Working:', isWorking);

        // Test prediction service
        const { predictionService } = mlServices;
        const isInitialized = predictionService.isInitialized();
        
        let systemInfo = null;
        if (isInitialized) {
          systemInfo = predictionService.getSystemInfo();
        }

        console.log('Prediction service initialized:', isInitialized);
        if (systemInfo) {
          console.log('Backend:', systemInfo.backend);
          console.log('Version:', systemInfo.version);
        }

        return {
          success: isWorking && isInitialized,
          tensorTest: isWorking,
          serviceInitialized: isInitialized,
          backend: systemInfo?.backend || 'unknown',
          version: systemInfo?.version || 'unknown',
          memory: systemInfo?.memoryInfo || null
        };

      } catch (error) {
        console.error('Test error:', error);
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    });

    console.log('🏁 Test completed. Results:');
    console.log('Success:', testResult.success);
    
    if (testResult.success) {
      console.log('✅ TensorFlow.js is working in the browser!');
      console.log('  Tensor operations:', testResult.tensorTest);
      console.log('  Service initialized:', testResult.serviceInitialized);
      console.log('  Backend:', testResult.backend);
      console.log('  Version:', testResult.version);
      if (testResult.memory) {
        console.log('  Memory usage:', JSON.stringify(testResult.memory, null, 2));
      }
    } else {
      console.log('❌ TensorFlow.js test failed');
      console.log('Error:', testResult.error);
      if (testResult.stack) {
        console.log('Stack:', testResult.stack);
      }
    }

    return testResult;

  } catch (error) {
    console.error('🚨 Browser test failed:', error);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  testTensorFlowInBrowser().then(result => {
    console.log('\n📊 Final Result:', result.success ? 'PASSED' : 'FAILED');
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { testTensorFlowInBrowser };