import { Person } from '../../types/Person';

export const mockPersons: Omit<Person, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'John Doe',
    age: 30,
    occupation: 'Software Engineer',
    email: 'john.doe@email.com',
    phone: '+1-555-0123',
    address: '123 Main St, Anytown, USA',
  },
  {
    name: 'Jane Smith',
    age: 28,
    occupation: 'Data Scientist',
    email: 'jane.smith@email.com',
    phone: '+1-555-0124',
    address: '456 Oak Ave, Somewhere, USA',
  },
  {
    name: 'Bob Johnson',
    age: 35,
    occupation: 'Product Manager',
    email: 'bob.johnson@email.com',
    phone: '+1-555-0125',
    address: '789 Pine Rd, Elsewhere, USA',
  },
  {
    name: 'Alice Brown',
    age: 32,
    occupation: 'UX Designer',
    email: 'alice.brown@email.com',
    phone: '+1-555-0126',
    address: '321 Elm St, Nowhere, USA',
  },
  {
    name: 'Charlie Wilson',
    age: 40,
    occupation: 'DevOps Engineer',
    email: 'charlie.wilson@email.com',
    phone: '+1-555-0127',
    address: '654 Maple Ave, Anyplace, USA',
  },
];

export const invalidPersonData = [
  {
    name: '', // Empty name
    age: 30,
    occupation: 'Test',
    email: 'invalid@email.com',
    phone: '+1-555-0000',
    address: 'Test Address',
  },
  {
    name: 'Test Person',
    age: -5, // Invalid age
    occupation: 'Test',
    email: 'invalid@email.com',
    phone: '+1-555-0000',
    address: 'Test Address',
  },
  {
    name: 'Test Person',
    age: 30,
    occupation: 'Test',
    email: 'invalid-email', // Invalid email format
    phone: '+1-555-0000',
    address: 'Test Address',
  },
  {
    name: 'Test Person',
    age: 30,
    occupation: 'Test',
    email: 'test@email.com',
    phone: 'invalid-phone', // Invalid phone format
    address: 'Test Address',
  },
];

export const csvTestData = `name,age,occupation,email,phone,address
"CSV User 1",25,"Software Developer","csv1@email.com","+1-555-0201","123 CSV St"
"CSV User 2",30,"Designer","csv2@email.com","+1-555-0202","456 CSV Ave"
"CSV User 3",35,"Manager","csv3@email.com","+1-555-0203","789 CSV Rd"`;

export const largeBatchData = Array.from({ length: 100 }, (_, i) => ({
  name: `Batch User ${i + 1}`,
  age: 20 + (i % 50),
  occupation: `Job Title ${i + 1}`,
  email: `batch${i + 1}@email.com`,
  phone: `+1-555-${String(i + 1).padStart(4, '0')}`,
  address: `${i + 1} Batch St, Testville, USA`,
}));

export const searchTestData = [
  {
    name: 'Software Engineer Alpha',
    age: 28,
    occupation: 'Software Engineer',
    email: 'alpha@engineering.com',
    phone: '+1-555-0301',
    address: '100 Tech Blvd',
  },
  {
    name: 'Software Engineer Beta',
    age: 32,
    occupation: 'Software Engineer',
    email: 'beta@engineering.com',
    phone: '+1-555-0302',
    address: '200 Tech Blvd',
  },
  {
    name: 'Data Analyst Gamma',
    age: 26,
    occupation: 'Data Analyst',
    email: 'gamma@data.com',
    phone: '+1-555-0303',
    address: '300 Data St',
  },
];

export const performanceTestData = Array.from({ length: 1000 }, (_, i) => ({
  name: `Performance Test User ${i + 1}`,
  age: 18 + (i % 60),
  occupation: `Occupation ${(i % 50) + 1}`,
  email: `perf${i + 1}@performance.com`,
  phone: `+1-555-${String((i % 10000) + 1).padStart(4, '0')}`,
  address: `${i + 1} Performance Ave, Load Test City, USA`,
}));