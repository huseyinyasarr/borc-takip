// Alışveriş/Harcama yönetimi servis fonksiyonları
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

const PURCHASES_COLLECTION = 'purchases'

/**
 * Tüm harcamaları getir
 */
export const getPurchases = async () => {
  try {
    const q = query(
      collection(db, PURCHASES_COLLECTION),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    const purchases = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // Firestore Timestamp'lerini Date'e çevir
      let firstInstallmentDate = data.firstInstallmentDate
      if (firstInstallmentDate?.toDate) {
        firstInstallmentDate = firstInstallmentDate.toDate()
      } else if (firstInstallmentDate) {
        firstInstallmentDate = new Date(firstInstallmentDate)
      }

      let createdAt = data.createdAt
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate()
      } else if (createdAt) {
        createdAt = new Date(createdAt)
      }

      purchases.push({
        id: doc.id,
        ...data,
        firstInstallmentDate,
        createdAt
      })
    })
    return purchases
  } catch (error) {
    console.error('Harcamalar getirilirken hata:', error)
    throw error
  }
}

/**
 * Belirli bir kullanıcıya ait harcamaları getir
 */
export const getPurchasesByUserId = async (userId) => {
  try {
    const q = query(
      collection(db, PURCHASES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    const purchases = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // Firestore Timestamp'lerini Date'e çevir
      let firstInstallmentDate = data.firstInstallmentDate
      if (firstInstallmentDate?.toDate) {
        firstInstallmentDate = firstInstallmentDate.toDate()
      } else if (firstInstallmentDate) {
        firstInstallmentDate = new Date(firstInstallmentDate)
      }

      let createdAt = data.createdAt
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate()
      } else if (createdAt) {
        createdAt = new Date(createdAt)
      }

      purchases.push({
        id: doc.id,
        ...data,
        firstInstallmentDate,
        createdAt
      })
    })
    return purchases
  } catch (error) {
    console.error('Kullanıcı harcamaları getirilirken hata:', error)
    throw error
  }
}

/**
 * Yeni harcama oluştur
 */
export const createPurchase = async (purchaseData) => {
  try {
    // Tarihleri Timestamp'e çevir
    const firstInstallmentTimestamp = purchaseData.firstInstallmentDate instanceof Date
      ? Timestamp.fromDate(purchaseData.firstInstallmentDate)
      : Timestamp.fromDate(new Date(purchaseData.firstInstallmentDate))

    const docRef = await addDoc(collection(db, PURCHASES_COLLECTION), {
      userId: purchaseData.userId,
      cardId: purchaseData.cardId || null, // Kart ID'si (opsiyonel, geriye dönük uyumluluk için)
      storeName: purchaseData.storeName,
      productName: purchaseData.productName?.trim() || null, // Ürün adı opsiyonel
      totalAmount: parseFloat(purchaseData.totalAmount),
      installmentCount: parseInt(purchaseData.installmentCount),
      firstInstallmentDate: firstInstallmentTimestamp,
      currency: purchaseData.currency || 'TRY',
      createdAt: Timestamp.now()
    })
    return docRef.id
  } catch (error) {
    console.error('Harcama oluşturulurken hata:', error)
    throw error
  }
}

/**
 * Harcama bilgilerini güncelle
 */
export const updatePurchase = async (purchaseId, purchaseData) => {
  try {
    const purchaseRef = doc(db, PURCHASES_COLLECTION, purchaseId)
    
    // Tarihleri Timestamp'e çevir
    const updateData = {
      ...purchaseData,
      productName: purchaseData.productName?.trim() || null, // Ürün adı opsiyonel
      totalAmount: parseFloat(purchaseData.totalAmount),
      installmentCount: parseInt(purchaseData.installmentCount),
      updatedAt: Timestamp.now()
    }

    // firstInstallmentDate varsa Timestamp'e çevir
    if (updateData.firstInstallmentDate) {
      updateData.firstInstallmentDate = updateData.firstInstallmentDate instanceof Date
        ? Timestamp.fromDate(updateData.firstInstallmentDate)
        : Timestamp.fromDate(new Date(updateData.firstInstallmentDate))
    }

    await updateDoc(purchaseRef, updateData)
  } catch (error) {
    console.error('Harcama güncellenirken hata:', error)
    throw error
  }
}

/**
 * Harcamayı sil
 */
export const deletePurchase = async (purchaseId) => {
  try {
    await deleteDoc(doc(db, PURCHASES_COLLECTION, purchaseId))
  } catch (error) {
    console.error('Harcama silinirken hata:', error)
    throw error
  }
}

