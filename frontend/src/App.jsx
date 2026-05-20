import Checkout from './components/Checkout'
import AdminPanel from './components/AdminPanel'
import { useState } from 'react'

function App() {
  const [mode, setMode] = useState('checkout')

  if (mode === 'admin') {
    return <AdminPanel onBack={() => setMode('checkout')} />
  }

  return (
    <>
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
        <button onClick={() => setMode('admin')} style={{ background: '#1e293b', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
          Admin Estoque
        </button>
      </div>
      <Checkout />
    </>
  )
}

export default App
