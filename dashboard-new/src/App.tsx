import React, { useState, useEffect } from 'react'
import AuthLayout from './components/auth/AuthLayout'
import './App.css'

function App() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    if (user) {
      window.location.href = "http://localhost:8080/";
    }
  }, [user]);

  if (!user) {
    return <AuthLayout onLogin={setUser} />
  }

  return null;
}

export default App
