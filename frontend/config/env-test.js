#!/usr/bin/env node
/**
 * Environment Configuration Test Script
 * Tests environment variable loading and validation across different modes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  const statusColor = exists ? 'green' : 'red';
  
  log(`${status} ${description}: ${filePath}`, statusColor);
  
  if (exists) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      log(`   Variables found: ${lines.length}`, 'cyan');
    } catch (error) {
      log(`   Error reading file: ${error.message}`, 'red');
    }
  }
  
  return exists;
}

function validateEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const errors = [];
  const variables = new Set();

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    // Check for valid variable format
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      errors.push(`Line ${lineNum}: Invalid variable format: ${trimmed}`);
      return;
    }

    const [, varName, varValue] = match;
    
    // Check for duplicates
    if (variables.has(varName)) {
      errors.push(`Line ${lineNum}: Duplicate variable: ${varName}`);
    }
    variables.add(varName);

    // Validate specific variables
    if (varName === 'VITE_API_URL') {
      try {
        new URL(varValue);
      } catch {
        errors.push(`Line ${lineNum}: Invalid URL format for VITE_API_URL: ${varValue}`);
      }
    }

    if (varName === 'VITE_PORT') {
      const port = parseInt(varValue);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push(`Line ${lineNum}: Invalid port number for VITE_PORT: ${varValue}`);
      }
    }

    if (varName === 'NODE_ENV') {
      if (!['development', 'production', 'test'].includes(varValue)) {
        errors.push(`Line ${lineNum}: Invalid NODE_ENV value: ${varValue}`);
      }
    }
  });

  return { valid: errors.length === 0, errors, variables: Array.from(variables) };
}

function checkPortConflicts() {
  const portConfigs = [
    { file: '.env', port: 3000, service: 'Frontend (dev)' },
    { file: 'docker-compose.yml', port: 5000, service: 'Backend (dev)' },
    { file: 'docker-compose.yml', port: 5432, service: 'Database (dev)' },
    { file: 'docker-compose.yml', port: 6379, service: 'Redis (dev)' },
    { file: 'docker-compose.test.yml', port: 5001, service: 'Backend (test)' },
    { file: 'docker-compose.test.yml', port: 5433, service: 'Database (test)' },
    { file: 'docker-compose.test.yml', port: 6380, service: 'Redis (test)' }
  ];

  log('\n📋 Port Configuration Analysis:', 'bright');
  
  const portMap = new Map();
  
  portConfigs.forEach(config => {
    if (portMap.has(config.port)) {
      portMap.get(config.port).push(config.service);
    } else {
      portMap.set(config.port, [config.service]);
    }
  });

  portMap.forEach((services, port) => {
    const color = services.length > 1 ? 'red' : 'green';
    const status = services.length > 1 ? '⚠️' : '✅';
    log(`${status} Port ${port}: ${services.join(', ')}`, color);
  });
}

function main() {
  log('🔧 Environment Configuration Test', 'bright');
  log('=====================================\n', 'bright');

  // Check for environment files
  log('📁 Environment Files:', 'bright');
  const envFiles = [
    { path: '.env', desc: 'Main environment file' },
    { path: '.env.example', desc: 'Environment template' },
    { path: 'config/.env.development', desc: 'Development config' },
    { path: 'config/.env.production', desc: 'Production config' },
    { path: 'config/.env.test', desc: 'Test config' }
  ];

  let allFilesExist = true;
  envFiles.forEach(({ path: filePath, desc }) => {
    const exists = checkFile(filePath, desc);
    allFilesExist = allFilesExist && exists;
  });

  // Check Docker Compose files
  log('\n🐳 Docker Compose Files:', 'bright');
  const dockerFiles = [
    { path: 'docker-compose.yml', desc: 'Development compose' },
    { path: 'docker-compose.prod.yml', desc: 'Production compose' },
    { path: 'docker-compose.test.yml', desc: 'Test compose' }
  ];

  dockerFiles.forEach(({ path: filePath, desc }) => {
    checkFile(filePath, desc);
  });

  // Validate environment files
  log('\n✅ Environment Validation:', 'bright');
  envFiles.forEach(({ path: filePath, desc }) => {
    if (fs.existsSync(filePath)) {
      const validation = validateEnvironmentFile(filePath);
      const status = validation.valid ? '✅' : '❌';
      const color = validation.valid ? 'green' : 'red';
      
      log(`${status} ${desc}`, color);
      if (!validation.valid) {
        validation.errors.forEach(error => {
          log(`   ${error}`, 'red');
        });
      } else {
        log(`   Found ${validation.variables.length} variables`, 'cyan');
      }
    }
  });

  // Check port conflicts
  checkPortConflicts();

  // Configuration files
  log('\n📋 Configuration Files:', 'bright');
  const configFiles = [
    { path: 'vite.config.ts', desc: 'Vite configuration' },
    { path: 'config/env-validation.ts', desc: 'Environment validation' },
    { path: 'config/README.md', desc: 'Configuration documentation' }
  ];

  configFiles.forEach(({ path: filePath, desc }) => {
    checkFile(filePath, desc);
  });

  // Summary
  log('\n📊 Summary:', 'bright');
  if (allFilesExist) {
    log('✅ All required environment files are present', 'green');
    log('🚀 Configuration appears ready for development', 'green');
  } else {
    log('❌ Some environment files are missing', 'red');
    log('💡 Run setup commands to create missing files', 'yellow');
  }

  log('\n💡 Next Steps:', 'bright');
  log('1. Copy .env.example to .env if needed');
  log('2. Update VITE_API_URL to match your backend');
  log('3. Adjust ports if there are conflicts');
  log('4. Test with: npm run dev');
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}