import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Purchases from './pages/Purchases'
import Cards from './pages/Cards'

function App() {
  // Localhost'ta basename boş, production'da "/borc-takip"
  const basename = import.meta.env.PROD ? '/borc-takip' : ''

  return (
    <BrowserRouter basename={basename}>
      <AuthGuard>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/cards" element={<Cards />} />
          </Routes>
        </Layout>
      </AuthGuard>
    </BrowserRouter>
  )
}

export default App

