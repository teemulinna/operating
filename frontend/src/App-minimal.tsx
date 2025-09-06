function App() {
  return (
    <div>
      <h1>Employee Management System</h1>
      <p>Frontend is working!</p>
      <div style={{ marginTop: '20px', padding: '20px', background: '#f0f0f0' }}>
        <h2>System Status</h2>
        <ul>
          <li>✅ React is rendering</li>
          <li>✅ Frontend server is running on port 3000</li>
          <li>✅ Backend server is running on port 3001</li>
        </ul>
        <button 
          onClick={() => alert('Button clicked! React is working.')}
          style={{ 
            padding: '10px 20px', 
            marginTop: '10px',
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          Test React
        </button>
      </div>
    </div>
  )
}

export default App