#!/usr/bin/env node

// Test script to debug date validation issue

const startDate = '2025-12-31';
const endDate = '2025-01-01';

console.log('Testing date validation logic:');
console.log('startDate:', startDate);
console.log('endDate:', endDate);

const start = new Date(startDate);
const end = new Date(endDate);

console.log('Parsed start:', start);
console.log('Parsed end:', end);
console.log('end < start?', end < start);  // Should be true
console.log('end.getTime():', end.getTime());
console.log('start.getTime():', start.getTime());
console.log('end.getTime() < start.getTime()?', end.getTime() < start.getTime());

// Test the validation logic
if (startDate && endDate) {
  console.log('\nValidation check 1: Both dates exist');
  const start = new Date(startDate);
  const end = new Date(endDate);
  console.log('Comparison result:', end < start);
  if (end < start) {
    console.log('WOULD RETURN 400 ERROR');
  } else {
    console.log('WOULD ALLOW REQUEST');
  }
}

// Test what the controller sends
const requestBody = {
  employeeId: 'test-id',
  name: 'Invalid Dates',
  patternType: 'weekly',
  startDate: '2025-12-31',
  endDate: '2025-01-01'
};

console.log('\nRequest body:', JSON.stringify(requestBody, null, 2));
console.log('startDate present?', !!requestBody.startDate);
console.log('endDate present?', !!requestBody.endDate);