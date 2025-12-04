import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import LogModal from './LogModal'

/**
 * Ana layout componenti - Navigation ve sayfa yapısı
 */
const Layout = ({ children }) => {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)

  const handleSignOut = async () => {
    if (window.confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      try {
        await signOut(auth)
      } catch (error) {
        console.error('Çıkış yapılırken hata:', error)
      }
    }
  }

  const isActive = (path) => {
    return location.pathname === path
      ? 'bg-blue-600 text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex flex-1 justify-between">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="flex items-center">
                    <img 
                      src={`${import.meta.env.BASE_URL}logo.png`} 
                      alt="Borç Takip Sistemi" 
                      className="h-10 w-auto"
                      onError={(e) => {
                        // Logo yüklenemezse metin göster
                        e.target.style.display = 'none'
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'block'
                        }
                      }}
                    />
                    <span className="text-xl font-bold text-gray-900 ml-2" style={{ display: 'none' }}>
                      Borç Takip Sistemi
                    </span>
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Ana Sayfa
                </Link>
                <Link
                  to="/users"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/users')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Kullanıcılar
                </Link>
                <Link
                  to="/purchases"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/purchases')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Harcamalar
                </Link>
                <Link
                  to="/cards"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/cards')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Kartlar
                </Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLogModalOpen(true)}
                  className="hidden sm:inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Loglar
                </button>
                {/* Hamburger Menu Button - Sadece mobilde görünür */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-label="Menüyü aç"
                >
                  {/* Hamburger Icon */}
                  <svg
                    className="h-6 w-6"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    {mobileMenuOpen ? (
                      // X icon (menü açıkken)
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      // Hamburger icon (menü kapalıyken)
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors font-medium shadow-sm"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu - Sadece açıkken görünür */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive('/')
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Ana Sayfa
              </Link>
              <Link
                to="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive('/users')
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Kullanıcılar
              </Link>
              <Link
                to="/purchases"
                onClick={() => setMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive('/purchases')
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Harcamalar
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  setLogModalOpen(true)
                }}
                className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Loglar
              </button>
              <div className="pt-2 pb-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="w-full text-left block pl-3 pr-4 py-2 text-base font-medium text-white bg-red-600 hover:bg-red-700 rounded-md mx-3 transition-colors"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{children}</div>
      </main>
      <LogModal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} />
    </div>
  )
}

export default Layout

