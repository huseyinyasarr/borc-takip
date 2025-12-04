// Kart yönetimi servis fonksiyonları
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { createLog } from './logService'

const CARDS_COLLECTION = 'cards'

/**
 * Tüm kartları getir
 */
export const getCards = async () => {
  try {
    const q = query(
      collection(db, CARDS_COLLECTION),
      orderBy('name')
    )
    const querySnapshot = await getDocs(q)
    const cards = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      cards.push({
        id: doc.id,
        ...data
      })
    })
    return cards
  } catch (error) {
    console.error('Kartlar getirilirken hata:', error)
    throw error
  }
}

/**
 * Tüm kartları getir (aktif ve pasif)
 */
export const getAllCards = async () => {
  try {
    const q = query(
      collection(db, CARDS_COLLECTION),
      orderBy('name')
    )
    const querySnapshot = await getDocs(q)
    const cards = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      cards.push({
        id: doc.id,
        ...data
      })
    })
    return cards
  } catch (error) {
    console.error('Kartlar getirilirken hata:', error)
    throw error
  }
}

/**
 * Yeni kart oluştur
 */
export const createCard = async (cardData, logOptions = {}) => {
  try {
    const docRef = await addDoc(collection(db, CARDS_COLLECTION), {
      name: cardData.name.trim(),
      color: cardData.color || '#3B82F6',
      note: cardData.note?.trim() || '',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    const cardName = cardData.name?.trim() || cardData.name || 'Kart'

    await createLog({
      action: logOptions.action || 'card_create',
      description: logOptions.description || `${cardName} kartı eklendi.`,
      meta: {
        cardId: docRef.id,
        cardName,
        ...(logOptions.meta || {})
      }
    })

    return docRef.id
  } catch (error) {
    console.error('Kart oluşturulurken hata:', error)
    throw error
  }
}

/**
 * Kart bilgilerini güncelle
 */
export const updateCard = async (cardId, cardData, logOptions = {}) => {
  try {
    const cardRef = doc(db, CARDS_COLLECTION, cardId)
    const updateData = {
      updatedAt: Timestamp.now()
    }
    
    // Sadece gönderilen alanları güncelle
    if (cardData.name !== undefined) {
      updateData.name = cardData.name.trim()
    }
    if (cardData.color !== undefined) {
      updateData.color = cardData.color || '#3B82F6'
    }
    if (cardData.note !== undefined) {
      updateData.note = cardData.note?.trim() || ''
    }
    if (cardData.isActive !== undefined) {
      updateData.isActive = cardData.isActive
    }
    
    await updateDoc(cardRef, updateData)

    await createLog({
      action: logOptions.action || 'card_update',
      description: logOptions.description || 'Kart bilgileri güncellendi.',
      meta: {
        cardId,
        ...(logOptions.meta || {})
      }
    })
  } catch (error) {
    console.error('Kart güncellenirken hata:', error)
    throw error
  }
}

/**
 * Kartı pasif yap (soft delete)
 */
export const softDeleteCard = async (cardId, logOptions = {}) => {
  try {
    const cardRef = doc(db, CARDS_COLLECTION, cardId)
    await updateDoc(cardRef, {
      isActive: false,
      updatedAt: Timestamp.now()
    })

    await createLog({
      action: logOptions.action || 'card_delete',
      description: logOptions.description || 'Kart silindi.',
      meta: {
        cardId,
        ...(logOptions.meta || {})
      }
    })
  } catch (error) {
    console.error('Kart pasif yapılırken hata:', error)
    throw error
  }
}

/**
 * Kartı sil
 */
export const deleteCard = async (cardId) => {
  try {
    const cardRef = doc(db, CARDS_COLLECTION, cardId)
    await deleteDoc(cardRef)
  } catch (error) {
    console.error('Kart silinirken hata:', error)
    throw error
  }
}
