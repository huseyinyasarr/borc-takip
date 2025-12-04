// Ödeme durumu yönetimi servis fonksiyonları
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { createLog } from './logService'

const PAYMENTS_COLLECTION = 'payments'
const PAYMENT_RECORDS_COLLECTION = 'paymentRecords' // Yeni: Parça parça ödeme kayıtları

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

/**
 * Tüm ödeme kayıtlarını getir
 */
export const getAllPaymentRecords = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, PAYMENT_RECORDS_COLLECTION))
    const records = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      let paymentDate = data.paymentDate
      if (paymentDate?.toDate) {
        paymentDate = paymentDate.toDate()
      } else if (paymentDate) {
        paymentDate = new Date(paymentDate)
      }

      let createdAt = data.createdAt
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate()
      } else if (createdAt) {
        createdAt = new Date(createdAt)
      }

      records.push({
        id: doc.id,
        ...data,
        paymentDate,
        createdAt
      })
    })
    // Tarihe göre sırala (en yeni üstte)
    records.sort((a, b) => b.paymentDate - a.paymentDate)
    return records
  } catch (error) {
    console.error('Ödeme kayıtları getirilirken hata:', error)
    throw error
  }
}

/**
 * Belirli bir kullanıcı ve ay için ödeme kayıtlarını getir
 * @param {string} userId - Kullanıcı ID'si
 * @param {string} month - "YYYY-MM" formatında ay (örn: "2024-12")
 */
export const getPaymentRecords = async (userId, month) => {
  try {
    const q = query(
      collection(db, PAYMENT_RECORDS_COLLECTION),
      where('userId', '==', userId),
      where('month', '==', month)
    )
    const querySnapshot = await getDocs(q)
    const records = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      let paymentDate = data.paymentDate
      if (paymentDate?.toDate) {
        paymentDate = paymentDate.toDate()
      } else if (paymentDate) {
        paymentDate = new Date(paymentDate)
      }

      let createdAt = data.createdAt
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate()
      } else if (createdAt) {
        createdAt = new Date(createdAt)
      }

      records.push({
        id: doc.id,
        ...data,
        paymentDate,
        createdAt
      })
    })
    // Client-side sıralama (tarihe göre azalan)
    records.sort((a, b) => b.paymentDate - a.paymentDate)
    return records
  } catch (error) {
    console.error('Ödeme kayıtları getirilirken hata:', error)
    throw error
  }
}

/**
 * Yeni ödeme kaydı oluştur
 * @param {Object} paymentData - Ödeme verisi
 * @param {string} paymentData.userId - Kullanıcı ID'si
 * @param {string} paymentData.month - "YYYY-MM" formatında ay
 * @param {number} paymentData.amount - Ödeme tutarı
 * @param {Date|string} paymentData.paymentDate - Ödeme tarihi
 * @param {string} paymentData.description - Açıklama (opsiyonel)
 */
export const createPaymentRecord = async (paymentData, logContext = {}) => {
  try {
    const paymentDateTimestamp = paymentData.paymentDate instanceof Date
      ? Timestamp.fromDate(paymentData.paymentDate)
      : Timestamp.fromDate(new Date(paymentData.paymentDate))

    const docRef = await addDoc(collection(db, PAYMENT_RECORDS_COLLECTION), {
      userId: paymentData.userId,
      month: paymentData.month,
      amount: parseFloat(paymentData.amount),
      paymentDate: paymentDateTimestamp,
      description: paymentData.description?.trim() || null,
      createdAt: Timestamp.now()
    })

    await createLog({
      action: 'payment_record_create',
      description:
        logContext.description ||
        `${paymentData.amount} TL ödeme kaydı eklendi`,
      meta: {
        paymentRecordId: docRef.id,
        userId: paymentData.userId,
        month: paymentData.month,
        amount: parseFloat(paymentData.amount),
        ...(logContext.meta || {})
      }
    })

    return docRef.id
  } catch (error) {
    console.error('Ödeme kaydı oluşturulurken hata:', error)
    throw error
  }
}

/**
 * Ödeme kaydını güncelle
 * @param {string} paymentRecordId - Ödeme kaydı ID'si
 * @param {Object} paymentData - Güncellenecek ödeme verisi
 */
export const updatePaymentRecord = async (paymentRecordId, paymentData, logContext = {}) => {
  try {
    const updateData = {}
    
    if (paymentData.amount !== undefined) {
      updateData.amount = parseFloat(paymentData.amount)
    }
    
    if (paymentData.paymentDate !== undefined) {
      updateData.paymentDate = paymentData.paymentDate instanceof Date
        ? Timestamp.fromDate(paymentData.paymentDate)
        : Timestamp.fromDate(new Date(paymentData.paymentDate))
    }
    
    if (paymentData.description !== undefined) {
      updateData.description = paymentData.description?.trim() || null
    }

    updateData.updatedAt = Timestamp.now()

    const paymentRef = doc(db, PAYMENT_RECORDS_COLLECTION, paymentRecordId)
    await updateDoc(paymentRef, updateData)

    await createLog({
      action: 'payment_record_update',
      description:
        logContext.description || 'Ödeme kaydı güncellendi',
      meta: {
        paymentRecordId,
        ...updateData,
        ...(logContext.meta || {})
      }
    })
  } catch (error) {
    console.error('Ödeme kaydı güncellenirken hata:', error)
    throw error
  }
}

/**
 * Ödeme kaydını sil
 * @param {string} paymentRecordId - Ödeme kaydı ID'si
 */
export const deletePaymentRecord = async (paymentRecordId, logContext = {}) => {
  try {
    await deleteDoc(doc(db, PAYMENT_RECORDS_COLLECTION, paymentRecordId))

    await createLog({
      action: 'payment_record_delete',
      description: logContext.description || 'Ödeme kaydı silindi',
      meta: {
        paymentRecordId,
        ...(logContext.meta || {})
      }
    })
  } catch (error) {
    console.error('Ödeme kaydı silinirken hata:', error)
    throw error
  }
}

