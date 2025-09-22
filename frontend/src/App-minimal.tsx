import React from 'react';

function App() {
  console.log('App component rendering');

  return (
    <div data-testid="app-container" style={{ padding: '20px' }}>
      <h1>Frontend is Working!</h1>
      <p>This is a minimal test to verify React is mounting correctly.</p>
      <nav data-testid="navigation">
        <a href="/employees" data-testid="nav-employees">Employees</a>
        {' | '}
        <a href="/projects" data-testid="nav-projects">Projects</a>
      </nav>
    </div>
  );
}

export default App;