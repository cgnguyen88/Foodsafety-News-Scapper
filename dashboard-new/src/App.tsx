import React, { useEffect } from 'react'
import './App.css'

function App() {
  useEffect(() => {
    // Redirect directly to the dashboard to bypass sign-up/login
    window.location.href = "/dashboard/";
  }, []);

  return (
    <div className="redirect-container">
      <p>Redirecting to dashboard...</p>
    </div>
  );
}

export default App
