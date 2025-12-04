// Kullanıcı yönetimi servis fonksiyonları
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

const USERS_COLLECTION = 'users'

/**
 * Tüm aktif kullanıcıları getir
 */
export const getUsers = async () => {
  try {
    // Index gerektirmemek için önce tümünü al, sonra filtrele
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy('name')
    )
    const querySnapshot = await getDocs(q)
    const users = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // Aktif kullanıcıları filtrele
      if (data.isActive !== false) {
        users.push({ id: doc.id, ...data })
      }
    })
    return users
  } catch (error) {
    console.error('Kullanıcılar getirilirken hata:', error)
    throw error
  }
}

/**
 * Tüm kullanıcıları getir (pasif olanlar dahil)
 */
export const getAllUsers = async () => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy('name')
    )
    const querySnapshot = await getDocs(q)
    const users = []
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() })
    })
    return users
  } catch (error) {
    // Eğer index hatası varsa, orderBy olmadan dene
    if (error.code === 'failed-precondition') {
      console.warn('Index hatası, orderBy olmadan deniyor...')
      const querySnapshot = await getDocs(collection(db, USERS_COLLECTION))
      const users = []
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() })
      })
      // Frontend'de sırala
      return users.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    console.error('Kullanıcılar getirilirken hata:', error)
    throw error
  }
}

/**
 * Yeni kullanıcı oluştur
 */
export const createUser = async (userData) => {
  try {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      name: userData.name,
      color: userData.color || '#3B82F6',
      isActive: true,
      note: userData.note || '',
      createdAt: Timestamp.now()
    })
    return docRef.id
  } catch (error) {
    console.error('Kullanıcı oluşturulurken hata:', error)
    throw error
  }
}

/**
 * Kullanıcı bilgilerini güncelle
 */
export const updateUser = async (userId, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId)
    await updateDoc(userRef, {
      ...userData,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Kullanıcı güncellenirken hata:', error)
    throw error
  }
}

/**
 * Kullanıcıyı pasif yap (soft delete)
 */
export const softDeleteUser = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId)
    await updateDoc(userRef, {
      isActive: false,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Kullanıcı pasif yapılırken hata:', error)
    throw error
  }
}

