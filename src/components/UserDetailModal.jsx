import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { getUsers } from '../services/userService'
import { getPurchases } from '../services/purchaseService'
import { getCards } from '../services/cardService'
import {
  calculateUserTotalForMonth,
  calculateUserTotalDebt,
  calculateUserRemainingInstallments,
  calculateInstallmentsForMonth,
  getInstallmentInfoForMonth
} from '../utils/installmentCalculator'
import {
  formatMonthDisplayLong,
  formatCurrency,
  formatDateLong
} from '../utils/dateUtils'
import { parseISO } from 'date-fns'
import MonthSelector from './MonthSelector'
import UserColorBadge from './UserColorBadge'

/**
 * Kullanıcı detay modal component - Kullanıcının tüm harcamaları ve taksit detayları
 */
const UserDetailModal = ({ userId, selectedMonth: parentSelectedMonth, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState(parentSelectedMonth)
  const [user, setUser] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedStore, setSelectedStore] = useState('all') // Mağaza filtresi
  const [selectedCard, setSelectedCard] = useState('all') // Kart filtresi
  const [cards, setCards] = useState([])
  const [showAllPurchasesInPdf, setShowAllPurchasesInPdf] = useState(false) // PDF'de tüm harcamaları göster
  const modalContentRef = useRef(null)

  useEffect(() => {
    setSelectedMonth(parentSelectedMonth)
  }, [parentSelectedMonth])

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const [usersData, purchasesData, cardsData] = await Promise.all([
        getUsers(),
        getPurchases(),
        getCards()
      ])
      
      const foundUser = usersData.find((u) => u.id === userId)
      if (!foundUser) {
        onClose()
        return
      }
      
      setUser(foundUser)
      setCards(cardsData.filter((c) => c.isActive))
      
      // Kullanıcının harcamalarını filtrele
      const userPurchases = purchasesData.filter((p) => p.userId === userId)
      setPurchases(userPurchases)
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Kullanıcının tüm unique mağazalarını (storeName) bul
  const uniqueStores = [...new Set(purchases.map((p) => p.storeName || p.description).filter(Boolean))].sort()

  // Kart ve mağaza filtresine göre harcamaları filtrele
  let filteredPurchases = purchases
  
  // Kart filtresi
  if (selectedCard !== 'all') {
    filteredPurchases = filteredPurchases.filter((p) => p.cardId === selectedCard)
  }
  
  // Mağaza filtresi - sadece mağaza adına göre filtrele
  if (selectedStore !== 'all') {
    filteredPurchases = filteredPurchases.filter((p) => (p.storeName || p.description) === selectedStore)
  }

  // Bu ay için taksit bilgilerini hesapla (filtrelenmiş harcamalara göre)
  const monthInstallments = calculateInstallmentsForMonth(filteredPurchases, selectedMonth)
  const filteredMonthInstallments = monthInstallments.filter(
    (installment) => installment.userId === userId
  )
  
  // Bu ay ödenecek tutarların toplamı (zaten monthTotal'da var, ama harcama sayısını gösterelim)
  const thisMonthInstallmentCount = filteredMonthInstallments.length

  // Kullanıcı istatistikleri (filtrelenmiş harcamalara göre)
  const monthTotal = calculateUserTotalForMonth(filteredPurchases, selectedMonth)
  const totalDebt = calculateUserTotalDebt(filteredPurchases, selectedMonth)
  const remainingInstallments = calculateUserRemainingInstallments(
    filteredPurchases,
    selectedMonth
  )

  // Her harcama için detaylı bilgi (filtrelenmiş harcamalara göre)
  const purchaseDetails = filteredPurchases.map((purchase) => {
    const installmentInfo = getInstallmentInfoForMonth(purchase, selectedMonth)
    const firstDate =
      typeof purchase.firstInstallmentDate === 'string'
        ? new Date(purchase.firstInstallmentDate)
        : purchase.firstInstallmentDate
    
    // Kalan taksit sayısını hesapla
    const currentMonthStart = new Date(`${selectedMonth}-01`)
    const purchaseMonthStart = new Date(
      firstDate.getFullYear(),
      firstDate.getMonth(),
      1
    )
    
    const monthDiff =
      (currentMonthStart.getFullYear() - purchaseMonthStart.getFullYear()) * 12 +
      (currentMonthStart.getMonth() - purchaseMonthStart.getMonth())
    
    let paidInstallments = 0
    let remainingInstallmentCount = purchase.installmentCount
    
    if (purchase.installmentCount === 1) {
      // Tek çekim için: Seçilen ayın başlangıcına göre kontrol et
      const currentMonthStartDate = parseISO(`${selectedMonth}-01`)
      
      // firstDate'ten tarih bilgilerini al
      const firstDateYear = firstDate.getFullYear()
      const firstDateMonth = firstDate.getMonth()
      const firstDateDay = firstDate.getDate()
      
      // Tarih string olarak karşılaştır
      const firstDateStr = `${firstDateYear}-${String(firstDateMonth + 1).padStart(2, '0')}-${String(firstDateDay).padStart(2, '0')}`
      const refDateStr = `${currentMonthStartDate.getFullYear()}-${String(currentMonthStartDate.getMonth() + 1).padStart(2, '0')}-${String(currentMonthStartDate.getDate()).padStart(2, '0')}`
      
      if (firstDateStr < refDateStr) {
        // Ödeme tarihi seçilen ayın başlangıcından önce -> Ödenmiş
        paidInstallments = 1
        remainingInstallmentCount = 0
      } else {
        // Ödeme tarihi seçilen ayın başlangıcında veya sonrasında -> Henüz ödenmemiş
        paidInstallments = 0
        remainingInstallmentCount = 1
      }
    } else {
      // Taksitli için
      // Seçilen ay ödenmemiş gibi davran, sadece seçilen aydan önceki taksitler ödenmiş sayılır
      if (monthDiff >= 0) {
        // monthDiff = seçilen ay ile ilk taksit ayı arasındaki ay farkı
        // monthDiff = 0 ise ilk taksit seçilen ayda (henüz ödenmemiş)
        // monthDiff = 1 ise ilk taksit geçen ayda (sadece geçen ay ödenmiş)
        paidInstallments = Math.min(monthDiff, purchase.installmentCount)
        remainingInstallmentCount = purchase.installmentCount - paidInstallments
      } else {
        // monthDiff < 0 ise ilk taksit gelecekte, hiç ödenmemiş
        paidInstallments = 0
        remainingInstallmentCount = purchase.installmentCount
      }
    }
    
    // Kalan tutarı hesapla
    const installmentAmount = purchase.totalAmount / purchase.installmentCount
    const paidAmount = paidInstallments * installmentAmount
    const remainingAmount = purchase.totalAmount - paidAmount

    return {
      ...purchase,
      firstDate,
      installmentInfo,
      paidInstallments,
      remainingInstallmentCount,
      paidAmount,
      remainingAmount,
      installmentAmount
    }
  })

  // PDF olarak export et
  const handleExportAsPdf = async () => {
    if (!modalContentRef.current || isExporting) return

    try {
      setIsExporting(true)
      
      // "Tüm Harcamalar Detayı" bölümünü bul ve geçici olarak gizle/göster
      // Başlık metnini içeren tüm elementleri bul
      const allHeadings = modalContentRef.current.querySelectorAll('h3')
      let allPurchasesSection = null
      for (const heading of allHeadings) {
        if (heading.textContent.includes('Tüm Harcamalar Detayı')) {
          // Parent container'ı bul (bg-white.border.border-gray-200.rounded-lg.overflow-hidden)
          allPurchasesSection = heading.closest('.bg-white.border.border-gray-200.rounded-lg.overflow-hidden')
          break
        }
      }
      let originalAllPurchasesDisplay = ''
      if (allPurchasesSection && !showAllPurchasesInPdf) {
        originalAllPurchasesDisplay = allPurchasesSection.style.display
        allPurchasesSection.style.display = 'none'
      }
      
      // Orijinal stilleri kaydet
      const originalStyle = modalContentRef.current.style.cssText
      const originalMaxHeight = modalContentRef.current.style.maxHeight
      const originalOverflow = modalContentRef.current.style.overflow
      
      // Modal'ı geçici olarak 1920px genişliğe ayarla ve tüm içeriği göster
      modalContentRef.current.style.width = '1920px'
      modalContentRef.current.style.minWidth = '1920px'
      modalContentRef.current.style.maxWidth = '1920px'
      modalContentRef.current.style.maxHeight = 'none' // Yükseklik kısıtlamasını kaldır
      modalContentRef.current.style.overflow = 'visible' // Overflow'u kaldır ki tüm içerik görünsün
      
      // İçerik div'ini de kontrol et
      const contentDiv = modalContentRef.current.querySelector('.flex-1.overflow-y-auto')
      let originalContentOverflow = ''
      if (contentDiv) {
        originalContentOverflow = contentDiv.style.overflow
        contentDiv.style.overflow = 'visible'
        contentDiv.style.maxHeight = 'none'
      }
      
      // Biraz bekle ki stil değişiklikleri uygulanabilsin
      await new Promise(resolve => setTimeout(resolve, 200))

      // Tüm içeriğin yüksekliğini al
      const fullHeight = modalContentRef.current.scrollHeight

      // Modal içeriğini yakala - tüm scroll edilen içeriği de dahil et
      const canvas = await html2canvas(modalContentRef.current, {
        width: 1920,
        height: fullHeight,
        scale: 2, // kaliteyi artır
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        removeContainer: false,
        windowWidth: 1920,
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0
      })

      // Orijinal stilleri geri yükle
      modalContentRef.current.style.cssText = originalStyle
      if (originalMaxHeight) modalContentRef.current.style.maxHeight = originalMaxHeight
      if (originalOverflow) modalContentRef.current.style.overflow = originalOverflow
      
      // İçerik div'ini de geri yükle
      if (contentDiv && originalContentOverflow !== undefined) {
        contentDiv.style.overflow = originalContentOverflow
        contentDiv.style.maxHeight = ''
      }
      
      // "Tüm Harcamalar Detayı" bölümünü geri göster
      if (allPurchasesSection && originalAllPurchasesDisplay !== undefined) {
        allPurchasesSection.style.display = originalAllPurchasesDisplay
      }

      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Canvas boyutlarını al
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Resmin genişliğini sayfa genişliğine göre ölçekle
      const imgWidthInMM = pageWidth
      const imgHeightInMM = (imgHeight * pageWidth) / imgWidth

      // Kaç sayfa gerektiğini hesapla
      const totalPages = Math.ceil(imgHeightInMM / pageHeight)

      // Her sayfa için resmin ilgili kısmını ekle
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage()
        }

        // Bu sayfada gösterilecek resim yüksekliği (mm)
        const remainingHeight = imgHeightInMM - (page * pageHeight)
        const pageImgHeight = Math.min(pageHeight, remainingHeight)
        
        // Canvas'tan bu sayfanın görüntüsünü almak için yeni bir canvas oluştur
        const pageCanvas = document.createElement('canvas')
        const pageCtx = pageCanvas.getContext('2d')
        
        // Sayfa canvas boyutlarını ayarla
        const pageCanvasHeight = Math.ceil((pageImgHeight / imgHeightInMM) * imgHeight)
        pageCanvas.width = imgWidth
        pageCanvas.height = pageCanvasHeight
        
        // Orijinal canvas'tan bu sayfanın kısmını çiz
        const sourceY = Math.floor((page * pageHeight / imgHeightInMM) * imgHeight)
        const sourceHeight = Math.min(pageCanvasHeight, imgHeight - sourceY)
        
        pageCtx.drawImage(
          canvas,
          0, sourceY, imgWidth, sourceHeight, // source rectangle
          0, 0, imgWidth, pageCanvasHeight     // destination rectangle
        )
        
        // Bu sayfa canvas'ını PDF'e ekle
        const pageImgData = pageCanvas.toDataURL('image/png')
        pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidthInMM, pageImgHeight)
      }

      const fileName = `${user?.name || 'Kullanici'}_${selectedMonth}_detay.pdf`
      pdf.save(fileName)

      setIsExporting(false)
    } catch (error) {
      console.error('Fotoğraf export edilirken hata:', error)
      alert('Fotoğraf export edilirken bir hata oluştu.')
      setIsExporting(false)
      
      // Hata durumunda da orijinal stilleri geri yükle
      if (modalContentRef.current) {
        modalContentRef.current.style.width = ''
        modalContentRef.current.style.minWidth = ''
        modalContentRef.current.style.maxWidth = ''
        modalContentRef.current.style.maxHeight = ''
        modalContentRef.current.style.overflow = ''
        
        const contentDiv = modalContentRef.current.querySelector('.flex-1.overflow-y-auto')
        if (contentDiv) {
          contentDiv.style.overflow = ''
          contentDiv.style.maxHeight = ''
        }
        
        // "Tüm Harcamalar Detayı" bölümünü geri göster
        const allHeadings = modalContentRef.current.querySelectorAll('h3')
        let allPurchasesSection = null
        for (const heading of allHeadings) {
          if (heading.textContent.includes('Tüm Harcamalar Detayı')) {
            allPurchasesSection = heading.closest('.bg-white.border.border-gray-200.rounded-lg.overflow-hidden')
            break
          }
        }
        if (allPurchasesSection) {
          allPurchasesSection.style.display = ''
        }
      }
    }
  }

  // Hex rengi rgba formatına çevir (opacity ile)
  const hexToRgba = (hex, opacity = 0.15) => {
    if (!hex) return `rgba(249, 250, 251, ${opacity})` // Fallback gray
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return `rgba(249, 250, 251, ${opacity})`
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  if (!userId) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalContentRef}
          className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
            style={{
              backgroundColor: hexToRgba(user?.color, 0.15)
            }}
          >
            <div className="flex items-center gap-4">
              {user && (
                <h2 className="text-xl font-bold text-gray-900">
                  <UserColorBadge color={user.color} name={user.name} />
                </h2>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-4 justify-end">
              {user && (
                <div className="flex flex-col">
                <MonthSelector
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  label="Ekstre Ayı"
                    wrapperClassName="mb-0 min-w-[180px]"
                />
                </div>
              )}
              {cards.length > 0 && (
                <div className="flex flex-col">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Kart
                  </label>
                  <select
                    value={selectedCard}
                    onChange={(e) => setSelectedCard(e.target.value)}
                    className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-9 px-3 border min-w-[180px] leading-5 bg-white"
                  >
                    <option value="all">Tüm Kartlar</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {uniqueStores.length > 0 && (
                <div className="flex flex-col">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mağaza
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm h-9 px-3 border min-w-[180px] leading-5 bg-white"
                  >
                    <option value="all">Tüm Mağazalar</option>
                    {uniqueStores.map((store) => (
                      <option key={store} value={store}>
                        {store}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllPurchasesInPdf}
                    onChange={(e) => setShowAllPurchasesInPdf(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs">Tüm Harcamaları PDF'e Ekle</span>
                </label>
                <button
                  onClick={handleExportAsPdf}
                  disabled={isExporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="PDF İndir"
                >
                  {isExporting ? 'Export Ediliyor...' : 'PDF İndir'}
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Yükleniyor...</div>
              </div>
            ) : !user ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Kullanıcı bulunamadı</div>
              </div>
            ) : (
              <>
                {/* Özet kartlar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-500">
                      Bu Ay Ödenecek
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(monthTotal)}
                    </div>
                    {thisMonthInstallmentCount > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {thisMonthInstallmentCount} harcamadan toplam
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-500">Toplam Borç</div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(totalDebt)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-500">Kalan Taksit</div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">
                      {remainingInstallments}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-500">Toplam Harcama</div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(
                        filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0)
                      )}
                    </div>
                    {selectedStore !== 'all' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedStore} mağazasından
                      </div>
                    )}
                  </div>
                </div>

                {/* Mağaza filtresi bilgisi */}
                {selectedStore !== 'all' && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">{selectedStore}</span> mağazasından yapılan tüm alışverişler gösteriliyor.
                    </p>
                  </div>
                )}

                {/* Bu ay ödenecek taksitler */}
                {filteredMonthInstallments.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatMonthDisplayLong(selectedMonth)} Ekstresinde Ödenecek Taksitler
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Harcama Açıklaması
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Taksit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bu Ay Ödenecek Tutar
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kalan Taksit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kalan Tutar
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredMonthInstallments.map((installment, index) => {
                            const purchase = purchases.find(
                              (p) => p.id === installment.purchaseId
                            )
                            const detail = purchaseDetails.find(
                              (d) => d.id === installment.purchaseId
                            )

                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {installment.purchaseDescription}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {installment.installmentNumber}/{installment.totalInstallments}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency(installment.amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {detail
                                    ? detail.remainingInstallmentCount
                                    : installment.totalInstallments -
                                      installment.installmentNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {detail
                                    ? formatCurrency(detail.remainingAmount)
                                    : formatCurrency(purchase.totalAmount - installment.amount)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              TOPLAM
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {formatCurrency(monthTotal)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {formatCurrency(totalDebt)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tüm harcamalar detay tablosu */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tüm Harcamalar Detayı
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Harcama Açıklaması
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Alışveriş Tarihi
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Toplam Tutar
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Taksit Sayısı
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aylık Taksit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İlk Taksit Tarihi
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ödenen Taksit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kalan Taksit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ödenen Tutar
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kalan Tutar
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {purchaseDetails.length === 0 ? (
                          <tr>
                            <td
                              colSpan="9"
                              className="px-6 py-4 text-center text-gray-500"
                            >
                              Harcama bulunamadı
                            </td>
                          </tr>
                        ) : (
                          purchaseDetails.map((detail) => (
                            <tr key={detail.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {detail.storeName 
                                  ? (detail.productName 
                                      ? `${detail.storeName} - ${detail.productName}`
                                      : detail.storeName)
                                  : detail.description || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {detail.purchaseDate
                                  ? formatDateLong(detail.purchaseDate)
                                  : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(detail.totalAmount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {detail.installmentCount === 1
                                  ? 'Tek Çekim'
                                  : `${detail.installmentCount} Taksit`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(detail.installmentAmount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDateLong(detail.firstDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {detail.paidInstallments}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {detail.remainingInstallmentCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(detail.paidAmount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(detail.remainingAmount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {purchaseDetails.length > 0 && (
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              TOPLAM
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {formatCurrency(
                                purchaseDetails.reduce(
                                  (sum, d) => sum + d.totalAmount,
                                  0
                                )
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {formatCurrency(
                                purchaseDetails.reduce(
                                  (sum, d) => sum + d.installmentAmount,
                                  0
                                )
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {formatCurrency(
                                purchaseDetails.reduce((sum, d) => sum + d.paidAmount, 0)
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {formatCurrency(
                                purchaseDetails.reduce((sum, d) => sum + d.remainingAmount, 0)
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDetailModal

