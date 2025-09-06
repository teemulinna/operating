export const testData = {
  departments: [
    { id: 1, name: 'Engineering', description: 'Software development team' },
    { id: 2, name: 'Design', description: 'User experience and design team' },
    { id: 3, name: 'Marketing', description: 'Marketing and communications team' }
  ],
  employees: [
    {
      id: 1,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@company.com',
      position: 'Senior Software Engineer',
      departmentId: 1,
      salary: 95000,
      hireDate: '2022-01-15',
      skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL']
    },
    {
      id: 2,
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@company.com',
      position: 'UX Designer',
      departmentId: 2,
      salary: 75000,
      hireDate: '2022-03-20',
      skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research']
    },
    {
      id: 3,
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie@company.com',
      position: 'Marketing Manager',
      departmentId: 3,
      salary: 80000,
      hireDate: '2021-11-10',
      skills: ['Digital Marketing', 'SEO', 'Analytics', 'Content Strategy']
    },
    {
      id: 4,
      firstName: 'Diana',
      lastName: 'Wilson',
      email: 'existing@company.com',
      position: 'Frontend Developer',
      departmentId: 1,
      salary: 70000,
      hireDate: '2023-02-01',
      skills: ['Vue.js', 'CSS', 'JavaScript', 'TypeScript']
    }
  ]
};