// Firebase konfigürasyonu ve başlatılması
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Environment değişkenlerinden Firebase ayarlarını al
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Firebase config kontrolü
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase konfigürasyonu eksik! .env dosyasını kontrol edin.')
  console.error('Gerekli değişkenler:', {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: !!firebaseConfig.authDomain,
    projectId: !!firebaseConfig.projectId,
    storageBucket: !!firebaseConfig.storageBucket,
    messagingSenderId: !!firebaseConfig.messagingSenderId,
    appId: !!firebaseConfig.appId
  })
}

// Firebase'i başlat
let app
let db
let auth

try {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
  console.log('✅ Firebase başarıyla başlatıldı')
} catch (error) {
  console.error('❌ Firebase başlatılamadı:', error)
  // Hata durumunda bile export edelim ki uygulama çökmesin
  app = null
  db = null
  auth = null
}

export { db, auth }
export default app

