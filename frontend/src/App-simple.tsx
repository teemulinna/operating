import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Employee Management System</h1>
      <p>System Status: Loading...</p>
      
      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Quick Test</h2>
        <button 
          onClick={() => setCount(count + 1)}
          style={{ 
            padding: '10px 20px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer' 
          }}
        >
          Count: {count}
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#e8f5e8', borderRadius: '8px' }}>
        <h3>Frontend Status</h3>
        <ul>
          <li>✅ React is working</li>
          <li>✅ State management functional</li>
          <li>✅ Event handlers working</li>
          <li>✅ Component rendering successfully</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>Backend Connection Test</h3>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('http://localhost:3001/health');
              const data = await response.json();
              alert(`Backend Status: ${data.status}\nUptime: ${Math.round(data.uptime)}s`);
            } catch (error) {
              alert(`Backend Error: ${error}`);
            }
          }}
          style={{ 
            padding: '10px 20px', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer' 
          }}
        >
          Test Backend Connection
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#d1ecf1', borderRadius: '8px' }}>
        <h3>System Information</h3>
        <p><strong>Frontend URL:</strong> http://localhost:3000</p>
        <p><strong>Backend API:</strong> http://localhost:3001</p>
        <p><strong>Build Date:</strong> {new Date().toISOString()}</p>
      </div>
    </div>
  )
}

export default App