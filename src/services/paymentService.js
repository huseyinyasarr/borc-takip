// Ödeme durumu yönetimi servis fonksiyonları
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

const PAYMENTS_COLLECTION = 'payments'

/**
 * Belirli bir ay için ödeme durumunu getir
 * @param {string} month - "YYYY-MM" formatında ay (örn: "2024-03")
 */
export const getPaymentStatus = async (month) => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('month', '==', month)
    )
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) {
      return { month, isPaid: false }
    }
    const doc = querySnapshot.docs[0]
    return { id: doc.id, month, isPaid: doc.data().isPaid }
  } catch (error) {
    console.error('Ödeme durumu getirilirken hata:', error)
    throw error
  }
}

/**
 * Belirli bir ay için ödeme durumunu kaydet veya güncelle
 * @param {string} month - "YYYY-MM" formatında ay
 * @param {boolean} isPaid - Ödeme yapıldı mı?
 */
export const setPaymentStatus = async (month, isPaid) => {
  try {
    const existingStatus = await getPaymentStatus(month)
    
    if (existingStatus.id) {
      // Mevcut kaydı güncelle
      const paymentRef = doc(db, PAYMENTS_COLLECTION, existingStatus.id)
      await updateDoc(paymentRef, {
        isPaid,
        updatedAt: Timestamp.now()
      })
    } else {
      // Yeni kayıt oluştur
      await addDoc(collection(db, PAYMENTS_COLLECTION), {
        month,
        isPaid,
        createdAt: Timestamp.now()
      })
    }
  } catch (error) {
    console.error('Ödeme durumu kaydedilirken hata:', error)
    throw error
  }
}

