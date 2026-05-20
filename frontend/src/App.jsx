import { Analytics } from '@vercel/analytics/react'
import Checkout from './components/Checkout'

function App() {
  return (
    <>
      <Checkout />
      <Analytics />
    </>
  )
}

export default App
