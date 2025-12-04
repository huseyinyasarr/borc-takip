// Tarih yardımcı fonksiyonları
import { format, parseISO, addMonths, startOfMonth } from 'date-fns'

/**
 * Bugünün ayını "YYYY-MM" formatında döndür
 */
export const getCurrentMonth = () => {
  return format(new Date(), 'yyyy-MM')
}

/**
 * Belirli bir ay için bir sonraki ayı getir
 * @param {string} month - "YYYY-MM" formatında ay
 * @returns {string} Sonraki ay "YYYY-MM" formatında
 */
export const getNextMonth = (month) => {
  const date = parseISO(`${month}-01`)
  const nextDate = addMonths(date, 1)
  return format(nextDate, 'yyyy-MM')
}

/**
 * Belirli bir ay için bir önceki ayı getir
 * @param {string} month - "YYYY-MM" formatında ay
 * @returns {string} Önceki ay "YYYY-MM" formatında
 */
export const getPreviousMonth = (month) => {
  const date = parseISO(`${month}-01`)
  const previousDate = addMonths(date, -1)
  return format(previousDate, 'yyyy-MM')
}

// Türkçe ay isimleri
const turkishMonths = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const turkishMonthsShort = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
]

/**
 * Ay formatını "YYYY-MM"den "MMM YYYY" formatına çevir (örn: "2024-03" -> "Mar 2024")
 * @param {string} month - "YYYY-MM" formatında ay
 * @returns {string} Formatlanmış ay
 */
export const formatMonthDisplay = (month) => {
  const date = parseISO(`${month}-01`)
  const monthIndex = date.getMonth()
  const year = date.getFullYear()
  return `${turkishMonthsShort[monthIndex]} ${year}`
}

/**
 * Ay formatını "YYYY-MM"den "MMMM YYYY" formatına çevir (örn: "2024-03" -> "Mart 2024")
 * @param {string} month - "YYYY-MM" formatında ay
 * @returns {string} Formatlanmış ay
 */
export const formatMonthDisplayLong = (month) => {
  const date = parseISO(`${month}-01`)
  const monthIndex = date.getMonth()
  const year = date.getFullYear()
  return `${turkishMonths[monthIndex]} ${year}`
}

/**
 * Gelecek N ayı liste halinde getir
 * @param {string} startMonth - Başlangıç ayı "YYYY-MM" formatında
 * @param {number} count - Kaç ay gelecek
 * @returns {Array} Ay listesi ["YYYY-MM", ...]
 */
export const getFutureMonths = (startMonth, count = 12) => {
  const months = []
  let currentMonth = startMonth

  for (let i = 0; i < count; i++) {
    months.push(currentMonth)
    currentMonth = getNextMonth(currentMonth)
  }

  return months
}

/**
 * Para formatını TRY olarak formatla
 * @param {number} amount - Tutar
 * @returns {string} Formatlanmış tutar (örn: "1.234,56 TL")
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Tarihi Türkçe formatta göster (örn: "15 Mart 2024")
 * @param {Date|string} date - Tarih
 * @returns {string} Formatlanmış tarih
 */
export const formatDateLong = (date) => {
  const dateObj = date instanceof Date ? date : new Date(date)
  const day = dateObj.getDate()
  const monthIndex = dateObj.getMonth()
  const year = dateObj.getFullYear()
  return `${day} ${turkishMonths[monthIndex]} ${year}`
}

