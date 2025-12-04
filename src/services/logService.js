// Log servis fonksiyonları - işlemlerin kim tarafından, ne için yapıldığını takip etmek için
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import { db, auth } from '../config/firebase'

const LOGS_COLLECTION = 'logs'

/**
 * Yeni bir log kaydı oluşturur
 * @param {Object} data
 * @param {string} data.action - Örn: 'purchase_create', 'purchase_update', 'user_create'
 * @param {string} [data.description] - Özet açıklama
 * @param {Object} [data.meta] - Ek bilgiler (userId, cardId, targetUserId, purchaseId vs.)
 */
export const createLog = async (data) => {
  if (!db) return

  try {
    const currentUser = auth?.currentUser || null

    const payload = {
      action: data.action,
      description: data.description || '',
      meta: data.meta || {},
      createdAt: Timestamp.now(),
      // İşlemi yapan Google hesabı bilgileri
      actor: currentUser
        ? {
            uid: currentUser.uid,
            email: currentUser.email || null,
            displayName: currentUser.displayName || null
          }
        : null
    }

    await addDoc(collection(db, LOGS_COLLECTION), payload)
  } catch (error) {
    console.error('Log kaydedilirken hata:', error)
  }
}

/**
 * Log kayıtlarını getirir (isteğe bağlı filtrelerle)
 * @param {Object} filters
 * @param {string} [filters.actorEmail]
 * @param {string} [filters.userId]
 * @param {string} [filters.cardId]
 * @param {string} [filters.action]
 */
export const getLogs = async (filters = {}) => {
  if (!db) return []

  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    const logs = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      let createdAt = data.createdAt
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate()
      }

      logs.push({
        id: doc.id,
        ...data,
        createdAt
      })
    })

    // Filtreleri frontend tarafında uygula (küçük veri seti için uygun)
    const {
      actorEmail,
      userId,
      cardId,
      action
    } = filters

    return logs.filter((log) => {
      if (actorEmail && log.actor?.email !== actorEmail) return false
      if (userId && log.meta?.userId !== userId) return false
      if (cardId && log.meta?.cardId !== cardId) return false
      if (action && log.action !== action) return false
      return true
    })
  } catch (error) {
    console.error('Loglar getirilirken hata:', error)
    return []
  }
}


