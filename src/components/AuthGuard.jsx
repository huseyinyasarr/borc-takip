import { useState, useEffect } from 'react'
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

/**
 * Authentication guard component - Sadece giriş yapmış kullanıcının erişimini sağlar
 * Email kontrolü Firebase Security Rules tarafından yapılıyor
 */
const AuthGuard = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Firestore erişim kontrolü
  const checkFirestoreAccess = async () => {
    try {
      // Basit bir test sorgusu yap - users koleksiyonuna erişim denemesi
      const q = query(collection(db, 'users'), limit(1))
      await getDocs(q)
      // Eğer hata yoksa yetki var
      return true
    } catch (error) {
      console.error('Firestore erişim kontrolü:', error)
      // permission-denied hatası yetki olmadığı anlamına gelir
      if (error.code === 'permission-denied' || error.code === 'permissions-denied') {
        return false
      }
      // Diğer hatalar için true döndür (ağ hatası vs. olabilir)
      return true
    }
  }

  useEffect(() => {
    // Auth state değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Firestore erişim kontrolü yap
        const hasAccess = await checkFirestoreAccess()
        if (hasAccess) {
          setUser(currentUser)
          setError(null)
        } else {
          // Yetkisi yoksa çıkış yap ve Google'ın credential cache'ini temizle
          await signOut(auth)
          
          // Google'ın credential'ını da temizle (localStorage'den)
          // Böylece bir sonraki girişte hesap seçim ekranı açılır
          try {
            if (window.localStorage) {
              // Google Auth credential'larını temizle
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('firebase:authUser:') || key.includes('firebaseui')) {
                  localStorage.removeItem(key)
                }
              })
            }
          } catch (e) {
            console.warn('LocalStorage temizlenirken hata:', e)
          }
          
          setUser(null)
          setError('Bu uygulamaya erişim yetkiniz bulunmamaktadır. Lütfen yetkili bir email adresi ile giriş yapın.')
        }
      } else {
        setUser(null)
        setError(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      const provider = new GoogleAuthProvider()
      
      // Domain'e özel scope ekle
      provider.addScope('email')
      provider.addScope('profile')
      
      // Her seferinde hesap seçim ekranını göster (önceden seçilen hesabı hatırlamasın)
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      // Google ile giriş yap
      await signInWithPopup(auth, provider)
      
      // onAuthStateChanged otomatik olarak tetiklenecek ve Firestore erişim kontrolü yapılacak
    } catch (error) {
      console.error('Giriş hatası:', error)
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Giriş penceresi kapatıldı. Lütfen tekrar deneyin.')
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('Domain yetkilendirme hatası! Firebase Console\'da: Authentication → Settings → Authorized domains sekmesine gidin ve \'localhost\' domain\'ini ekleyin.')
      } else if (error.code === 'auth/admin-restricted-operation') {
        setError('Google Authentication aktif değil. Firebase Console\'dan Google provider\'ını aktifleştirin ve Authorized domains\'e localhost ekleyin.')
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Google sign-in method is not enabled. Please enable it in the Firebase Console.')
      } else {
        setError('Giriş yapılırken bir hata oluştu: ' + (error.message || error.code))
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Borç Takip Sistemi
            </h2>
            <p className="text-gray-600 mb-6">
              Devam etmek için Google hesabınızla giriş yapın
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google ile Giriş Yap
            </button>
            <p className="mt-4 text-xs text-gray-500">
              Sadece yetkili kullanıcılar giriş yapabilir
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGuard

