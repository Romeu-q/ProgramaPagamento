import Checkout from './components/Checkout'
import AdminPanel from './components/AdminPanel'
import { useState } from 'react'
import { Settings } from 'lucide-react'

function App() {
  const [mode, setMode] = useState('checkout')

  if (mode === 'admin') {
    return <AdminPanel onBack={() => setMode('checkout')} />
  }

  return (
    <>
      <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9999 }}>
        <button
          onClick={() => setMode('admin')}
          title="Admin Estoque"
          aria-label="Abrir admin estoque"
          style={{
            width: 56,
            height: 56,
            borderRadius: 9999,
            border: '1px solid rgba(148,163,184,0.25)',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
          }}
        >
          <Settings size={22} />
        </button>
      </div>
      <Checkout />
    </>
  )
}

export default App
