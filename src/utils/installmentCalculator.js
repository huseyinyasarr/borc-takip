// Taksit ve ekstre hesaplama yardımcı fonksiyonları
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

/**
 * Belirli bir ay için taksit tutarını hesapla
 * @param {number} totalAmount - Toplam tutar
 * @param {number} installmentCount - Toplam taksit sayısı
 * @param {Date} firstInstallmentDate - İlk taksit tarihi
 * @param {string} targetMonth - Hedef ay "YYYY-MM" formatında
 * @returns {number} O ay ödenecek tutar (0 ise o aya denk gelmiyor)
 */
export const calculateInstallmentForMonth = (
  totalAmount,
  installmentCount,
  firstInstallmentDate,
  targetMonth
) => {
  if (!totalAmount || !installmentCount || !firstInstallmentDate) {
    return 0
  }

  // İlk taksit tarihini parse et
  const firstDate = typeof firstInstallmentDate === 'string'
    ? parseISO(firstInstallmentDate)
    : firstInstallmentDate

  // Hedef ayın başlangıç ve bitiş tarihlerini belirle
  const targetDate = parseISO(`${targetMonth}-01`)
  const targetStart = startOfMonth(targetDate)
  const targetEnd = endOfMonth(targetDate)

  // Taksit tutarını hesapla (küsuratlı olabilir, 2 ondalık basamakla)
  const installmentAmount = totalAmount / installmentCount

  // İlk taksit tarihinden itibaren hangi aylarda taksit ödeneceğini kontrol et
  let installmentMonth = startOfMonth(firstDate)
  let installmentNumber = 1

  while (installmentNumber <= installmentCount) {
    // Bu taksit ayı hedef ay ile eşleşiyor mu?
    if (
      installmentMonth >= targetStart &&
      installmentMonth <= targetEnd
    ) {
      // Son taksitte kalan küsuratı ekle
      if (installmentNumber === installmentCount) {
        const previousTotal = installmentAmount * (installmentCount - 1)
        return Math.round((totalAmount - previousTotal) * 100) / 100
      }
      return Math.round(installmentAmount * 100) / 100
    }

    // Bir sonraki ayı hesapla
    installmentMonth = new Date(
      installmentMonth.getFullYear(),
      installmentMonth.getMonth() + 1,
      1
    )
    installmentNumber++
  }

  return 0
}

/**
 * Bir harcama için belirli bir aydaki taksit bilgisini getir
 * @param {Object} purchase - Harcama objesi
 * @param {string} targetMonth - Hedef ay "YYYY-MM" formatında
 * @returns {Object|null} Taksit bilgisi veya null
 */
export const getInstallmentInfoForMonth = (purchase, targetMonth) => {
  const amount = calculateInstallmentForMonth(
    purchase.totalAmount,
    purchase.installmentCount,
    purchase.firstInstallmentDate,
    targetMonth
  )

  if (amount === 0) {
    return null
  }

  // Hangi taksit numarası olduğunu hesapla
  const firstDate = typeof purchase.firstInstallmentDate === 'string'
    ? parseISO(purchase.firstInstallmentDate)
    : purchase.firstInstallmentDate
  const targetDate = parseISO(`${targetMonth}-01`)

  const monthDiff =
    (targetDate.getFullYear() - firstDate.getFullYear()) * 12 +
    (targetDate.getMonth() - firstDate.getMonth())

  const installmentNumber = monthDiff + 1

  // Mağaza Adı - Ürün Adı formatında göster (ürün adı varsa)
  const purchaseDescription = purchase.storeName
    ? (purchase.productName 
        ? `${purchase.storeName} - ${purchase.productName}`
        : purchase.storeName)
    : purchase.description || 'Harcama'

  return {
    amount,
    installmentNumber,
    totalInstallments: purchase.installmentCount,
    purchaseId: purchase.id,
    purchaseDescription
  }
}

/**
 * Tüm harcamalar için belirli bir ayın taksitlerini hesapla
 * @param {Array} purchases - Tüm harcamalar
 * @param {string} targetMonth - Hedef ay "YYYY-MM" formatında
 * @returns {Array} O ayki taksitlerin listesi
 */
export const calculateInstallmentsForMonth = (purchases, targetMonth) => {
  const installments = []

  purchases.forEach((purchase) => {
    const installmentInfo = getInstallmentInfoForMonth(purchase, targetMonth)
    if (installmentInfo) {
      installments.push({
        ...installmentInfo,
        userId: purchase.userId
      })
    }
  })

  return installments
}

/**
 * Kullanıcı bazında belirli bir ay için ödenecek toplam tutarı hesapla
 * @param {Array} purchases - Kullanıcıya ait harcamalar
 * @param {string} targetMonth - Hedef ay "YYYY-MM" formatında
 * @returns {number} Toplam tutar
 */
export const calculateUserTotalForMonth = (purchases, targetMonth) => {
  return purchases.reduce((total, purchase) => {
    const amount = calculateInstallmentForMonth(
      purchase.totalAmount,
      purchase.installmentCount,
      purchase.firstInstallmentDate,
      targetMonth
    )
    return total + amount
  }, 0)
}

/**
 * Kullanıcının toplam borcunu hesapla (tüm kalan taksitler)
 * @param {Array} purchases - Kullanıcıya ait harcamalar
 * @param {string} currentMonth - Mevcut ay "YYYY-MM" formatında (bugünün ayı)
 * @returns {number} Toplam borç
 */
export const calculateUserTotalDebt = (purchases, currentMonth) => {
  // Toplam borç için seçilen ayın BAŞLANGIÇ gününü referans al
  // Örneğin Ocak 2026 seçildiyse, Ocak 2026'nın ilk gününe (01.01.2026) göre kontrol et
  // Eğer ödeme tarihi < seçilen ayın ilk günü ise → Borç yok (geçen ay ödendi)
  // Eğer ödeme tarihi >= seçilen ayın ilk günü ise → Borç var (henüz ödenmemiş)
  const currentMonthStart = parseISO(`${currentMonth}-01`)
  
  // Referans tarih: Seçilen ayın ilk günü
  const refYear = currentMonthStart.getFullYear()
  const refMonth = currentMonthStart.getMonth()
  const refDate = currentMonthStart.getDate()
  
  return purchases.reduce((total, purchase) => {
    // İlk taksit tarihini parse et
    let firstDate = purchase.firstInstallmentDate
    
    // Firestore'dan gelen Timestamp veya Date objesi olabilir
    if (firstDate && typeof firstDate === 'object' && firstDate.toDate) {
      // Firestore Timestamp ise
      firstDate = firstDate.toDate()
    } else if (typeof firstDate === 'string') {
      // String ise parse et
      firstDate = parseISO(firstDate)
    } else if (!(firstDate instanceof Date)) {
      // Date objesi değilse, Date'e çevirmeyi dene
      firstDate = new Date(firstDate)
    }
    
    // Geçerli bir tarih mi kontrol et
    if (!firstDate || isNaN(firstDate.getTime())) {
      console.warn('Geçersiz tarih:', purchase.firstInstallmentDate, purchase)
      return total
    }
    
    // Date objesinden tarih bilgilerini al (yerel saat diliminde)
    const firstDateYear = firstDate.getFullYear()
    const firstDateMonth = firstDate.getMonth()
    const firstDateDay = firstDate.getDate()
    
    const purchaseMonthStart = startOfMonth(firstDate)

    // Tek çekim alışverişler için özel mantık
    if (purchase.installmentCount === 1) {
      // Toplam borç: Seçilen ayın başlangıcında kalan borç
      // Eğer ödeme tarihi < seçilen ayın ilk günü ise → Borç yok (geçen ay ödendi)
      // Eğer ödeme tarihi >= seçilen ayın ilk günü ise → Borç var (henüz ödenmemiş)
      
      // Tarih string olarak hazırla (YYYY-MM-DD formatında, string karşılaştırması için)
      const firstDateStr = `${firstDateYear}-${String(firstDateMonth + 1).padStart(2, '0')}-${String(firstDateDay).padStart(2, '0')}`
      const refDateStr = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(refDate).padStart(2, '0')}`
      
      // Basit string karşılaştırması yap (YYYY-MM-DD formatında doğru çalışır)
      if (firstDateStr < refDateStr) {
        // Ödeme tarihi seçilen ayın ilk gününden önce -> Geçen ay ödendi, borç yok
        return total
      }
      
      // Ödeme tarihi seçilen ayın ilk günü veya sonrasında -> Henüz ödenmemiş, borç var
      return total + purchase.totalAmount
    }

    // Taksitli alışverişler için
    // Eğer ilk taksit ayı gelecekteyse, tüm tutarı ekle
    if (purchaseMonthStart > currentMonthStart) {
      return total + purchase.totalAmount
    }

    // Mevcut aydaki veya geçmiş aylardaki harcamalar için
    const monthDiff =
      (currentMonthStart.getFullYear() - purchaseMonthStart.getFullYear()) * 12 +
      (currentMonthStart.getMonth() - purchaseMonthStart.getMonth())

    // Seçilen ay ödenmemiş gibi davran
    // monthDiff = 0 ise ilk taksit seçilen ayda (henüz ödenmemiş)
    // monthDiff = 1 ise ilk taksit geçen ayda (sadece geçen ay ödenmiş)
    // monthsPassed = seçilen aydan önce ödenen taksit sayısı
    const monthsPassed = Math.max(0, monthDiff) // Seçilen aydan önceki aylar
    
    // Ödenen taksit sayısı (seçilen ay dahil değil)
    const paidInstallments = monthsPassed
    
    // Kalan taksit sayısı (seçilen ay dahil)
    let remainingInstallments = purchase.installmentCount - paidInstallments

    // Eğer tüm taksitlerin ödeme tarihi geçmişse, borç yok
    if (remainingInstallments <= 0) {
      return total
    }

    // Kalan taksit tutarını hesapla
    const installmentAmount = purchase.totalAmount / purchase.installmentCount
    
    // Eğer henüz hiç taksit ödeme tarihi gelmemişse (gelecekte)
    if (monthDiff < 0) {
      return total + purchase.totalAmount
    }

    // Kalan taksitlerin tutarını hesapla
    // paidInstallments kadar taksit ödenmiş
    // Kalan taksitlerin toplam tutarı
    const paidAmount = installmentAmount * paidInstallments
    const remainingAmount = purchase.totalAmount - paidAmount

    return total + Math.round(remainingAmount * 100) / 100
  }, 0)
}

/**
 * Kullanıcının kalan taksit sayısını hesapla
 * @param {Array} purchases - Kullanıcıya ait harcamalar
 * @param {string} currentMonth - Mevcut ay "YYYY-MM" formatında
 * @returns {number} Toplam kalan taksit sayısı
 */
export const calculateUserRemainingInstallments = (purchases, currentMonth) => {
  // Seçilen ay ödenmemiş gibi davran, kalan taksit sayısını buna göre hesapla
  const currentMonthStart = parseISO(`${currentMonth}-01`)
  
  return purchases.reduce((total, purchase) => {
    // İlk taksit tarihini parse et
    let firstDate = purchase.firstInstallmentDate
    
    if (firstDate && typeof firstDate === 'object' && firstDate.toDate) {
      firstDate = firstDate.toDate()
    } else if (typeof firstDate === 'string') {
      firstDate = parseISO(firstDate)
    } else if (!(firstDate instanceof Date)) {
      firstDate = new Date(firstDate)
    }
    
    if (!firstDate || isNaN(firstDate.getTime())) {
      return total
    }
    
    // Tek çekim alışverişler için özel mantık
    if (purchase.installmentCount === 1) {
      // Tek çekim için kalan taksit: Seçilen ay ödenmemiş gibi davran
      // Ödeme tarihi seçilen ayın başlangıcından önceyse ödenmiş, sonra veya içindeyse ödenmemiş
      const firstDateYear = firstDate.getFullYear()
      const firstDateMonth = firstDate.getMonth()
      const firstDateDay = firstDate.getDate()
      
      const firstDateStr = `${firstDateYear}-${String(firstDateMonth + 1).padStart(2, '0')}-${String(firstDateDay).padStart(2, '0')}`
      const refDateStr = `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}-${String(currentMonthStart.getDate()).padStart(2, '0')}`
      
      if (firstDateStr < refDateStr) {
        // Ödeme tarihi seçilen ayın başlangıcından önce -> Ödenmiş, kalan taksit 0
        return total
      }
      
      // Ödeme tarihi seçilen ayın başlangıcında veya sonrasında -> Henüz ödenmemiş, kalan taksit 1
      return total + 1
    }
    
    // Taksitli alışverişler için mevcut mantık
    const currentDate = currentMonthStart
    const purchaseStart = startOfMonth(firstDate)

    if (purchaseStart > currentDate) {
      return total + purchase.installmentCount
    }

    const monthDiff =
      (currentDate.getFullYear() - purchaseStart.getFullYear()) * 12 +
      (currentDate.getMonth() - purchaseStart.getMonth())

    // Seçilen ay ödenmemiş gibi davran
    // monthDiff = 0 ise ilk taksit seçilen ayda (henüz ödenmemiş)
    // monthDiff = 1 ise ilk taksit geçen ayda (sadece geçen ay ödenmiş)
    if (monthDiff < 0) {
      // İlk taksit gelecekte, hiç ödenmemiş
      return total + purchase.installmentCount
    }
    
    // Ödenen taksit sayısı (seçilen ay dahil değil)
    const paidInstallments = Math.min(monthDiff, purchase.installmentCount)
    const remainingInstallments = purchase.installmentCount - paidInstallments

    return total + Math.max(0, remainingInstallments)
  }, 0)
}

