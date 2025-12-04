import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { getPurchases, createPurchase, updatePurchase, deletePurchase } from '../services/purchaseService'
import { getAllUsers } from '../services/userService'
import { getCards } from '../services/cardService'
import {
  getAllPaymentRecords,
  getPaymentRecords,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord
} from '../services/paymentService'
import { formatCurrency, formatDateLong, getCurrentMonth } from '../utils/dateUtils'
import UserColorBadge from '../components/UserColorBadge'
import CardColorBadge from '../components/CardColorBadge'
import UserDetailModal from '../components/UserDetailModal'

/**
 * Harcama yönetimi sayfası
 */
const Purchases = () => {
  const [purchases, setPurchases] = useState([])
  const [paymentRecords, setPaymentRecords] = useState([])
  const [users, setUsers] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [editingPayment, setEditingPayment] = useState(null)
  const [filterUserId, setFilterUserId] = useState('all')
  const [filterCardId, setFilterCardId] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'purchases', 'payments'
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const formRef = useRef(null)
  const [formData, setFormData] = useState({
    userId: '',
    cardId: '',
    storeName: '',
    productName: '',
    totalAmount: '',
    installmentCount: '',
    // Bilgi amaçlı alışveriş tarihi (logic'te kullanılmıyor)
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    firstInstallmentDate: format(new Date(), 'yyyy-MM-dd'),
    currency: 'TRY'
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [purchasesData, paymentData, usersData, cardsData] = await Promise.all([
        getPurchases(),
        getAllPaymentRecords(),
        getAllUsers(),
        getCards()
      ])
      setPurchases(purchasesData)
      setPaymentRecords(paymentData)
      setUsers(usersData.filter((u) => u.isActive))
      setCards(cardsData.filter((c) => c.isActive))
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error)
      console.error('Veriler yüklenirken bir hata oluştu:', error)
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Firestore Security Rules izin vermiyor. Firebase Console\'dan Rules\'ı kontrol edin.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Hata varsa temizle
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.userId) {
      newErrors.userId = 'Kullanıcı seçimi gereklidir'
    }

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'Mağaza adı gereklidir'
    }

    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Geçerli bir tutar giriniz'
    }

    if (!formData.installmentCount || parseInt(formData.installmentCount) <= 0) {
      newErrors.installmentCount = 'Geçerli bir taksit sayısı giriniz'
    }

    if (!formData.firstInstallmentDate) {
      newErrors.firstInstallmentDate = 'İlk taksit tarihi gereklidir'
    }

    if (!formData.cardId) {
      newErrors.cardId = 'Kart seçimi gereklidir'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (editingPurchase) {
        const userName = getUserNameById(formData.userId)
        const cardName = getCardNameById(formData.cardId)
        const storeLabel = buildStoreLabel(formData.storeName, formData.productName)
        const oldAmountText = formatAmountText(editingPurchase.totalAmount)
        const newAmountText = formatAmountText(formData.totalAmount)
        const oldInstallmentValue = formatInstallmentValue(editingPurchase.installmentCount)
        const newInstallmentValue = formatInstallmentValue(formData.installmentCount)

        await updatePurchase(
          editingPurchase.id,
          {
            userId: formData.userId,
            cardId: formData.cardId,
            storeName: formData.storeName.trim(),
            productName: formData.productName?.trim() || '',
            totalAmount: formData.totalAmount,
            installmentCount: formData.installmentCount,
            purchaseDate: formData.purchaseDate
              ? new Date(formData.purchaseDate)
              : null,
            firstInstallmentDate: new Date(formData.firstInstallmentDate),
            currency: formData.currency
          },
          {
            description: buildLogDescription('update', {
              userName,
              storeLabel,
              cardName,
              oldAmountText,
              newAmountText,
              oldInstallmentValue,
              newInstallmentValue
            }),
            meta: {
              userName,
              cardName,
              storeLabel,
              oldAmountText,
              newAmountText,
              oldInstallmentValue,
              newInstallmentValue
            }
          }
        )
        alert('Harcama güncellendi')
      } else {
        const userName = getUserNameById(formData.userId)
        const cardName = getCardNameById(formData.cardId)
        const storeLabel = buildStoreLabel(formData.storeName, formData.productName)
        const newAmountText = formatAmountText(formData.totalAmount)
        const newInstallmentValue = formatInstallmentValue(formData.installmentCount)

        await createPurchase(
          {
            userId: formData.userId,
            cardId: formData.cardId,
            storeName: formData.storeName.trim(),
            productName: formData.productName?.trim() || '',
            totalAmount: formData.totalAmount,
            installmentCount: formData.installmentCount,
            purchaseDate: formData.purchaseDate
              ? new Date(formData.purchaseDate)
              : null,
            firstInstallmentDate: new Date(formData.firstInstallmentDate),
            currency: formData.currency
          },
          {
            description: buildLogDescription('create', {
              userName,
              storeLabel,
              cardName,
              newAmountText
            }),
            meta: {
              userName,
              cardName,
              storeLabel,
              newAmountText,
              newInstallmentValue
            }
          }
        )
        alert('Harcama eklendi')
      }

      resetForm()
      loadData()
    } catch (error) {
      console.error('Harcama kaydedilirken hata:', error)
      console.error('Harcama kaydedilirken bir hata oluştu:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      userId: '',
      cardId: '',
      storeName: '',
      productName: '',
      totalAmount: '',
      installmentCount: '',
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      firstInstallmentDate: format(new Date(), 'yyyy-MM-dd'),
      currency: 'TRY'
    })
    setEditingPurchase(null)
    setShowForm(false)
    setErrors({})
  }

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase)
    setFormData({
      userId: purchase.userId,
      cardId: purchase.cardId || '',
      storeName: purchase.storeName || '',
      productName: purchase.productName || '',
      totalAmount: purchase.totalAmount.toString(),
      installmentCount: purchase.installmentCount.toString(),
      purchaseDate: purchase.purchaseDate
        ? format(new Date(purchase.purchaseDate), 'yyyy-MM-dd')
        : format(new Date(purchase.firstInstallmentDate), 'yyyy-MM-dd'),
      firstInstallmentDate: format(
        new Date(purchase.firstInstallmentDate),
        'yyyy-MM-dd'
      ),
      currency: purchase.currency || 'TRY'
    })
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  const handleEditPayment = (payment) => {
    setEditingPayment(payment)
    setShowPaymentForm(true)
  }

  const handleDeletePayment = async (payment) => {
    if (!window.confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) {
      return
    }
    try {
      await deletePaymentRecord(payment.id)
      alert('Ödeme kaydı silindi')
      loadData()
    } catch (error) {
      console.error('Ödeme silinirken hata:', error)
      alert('Ödeme silinirken bir hata oluştu.')
    }
  }

  const handleDelete = async (purchase) => {
    if (!window.confirm('Bu harcamayı silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      const userName = getUserNameById(purchase.userId)
      const cardName = getCardNameById(purchase.cardId)
      const storeLabel = buildStoreLabel(purchase.storeName, purchase.productName)
      const oldAmountText = formatAmountText(purchase.totalAmount)
      const oldInstallmentValue = formatInstallmentValue(purchase.installmentCount)

      await deletePurchase(purchase.id, {
        description: buildLogDescription('delete', {
          userName,
          storeLabel,
          cardName,
          oldAmountText
        }),
        meta: {
          userName,
          cardName,
          storeLabel,
          oldAmountText,
          oldInstallmentValue
        }
      })
      alert('Harcama silindi')
      loadData()
    } catch (error) {
      console.error('Harcama silinirken hata:', error)
      console.error('Harcama silinirken bir hata oluştu:', error)
    }
  }

  // Filtrelenmiş harcamalar
  const filteredPurchases = purchases.filter((purchase) => {
    // Kullanıcı filtresi
    if (filterUserId !== 'all' && purchase.userId !== filterUserId) {
      return false
    }

    // Kart filtresi
    if (filterCardId !== 'all' && purchase.cardId !== filterCardId) {
      return false
    }

    // Tarih filtresi
    if (filterDateFrom || filterDateTo) {
      const purchaseDate = new Date(purchase.firstInstallmentDate)
      const fromDate = filterDateFrom ? new Date(filterDateFrom) : null
      const toDate = filterDateTo ? new Date(filterDateTo) : null

      if (fromDate && purchaseDate < fromDate) {
        return false
      }

      if (toDate && purchaseDate > toDate) {
        return false
      }
    }

    return true
  })

  // Taksit tutarını hesapla
  const getInstallmentAmount = (purchase) => {
    return purchase.totalAmount / purchase.installmentCount
  }

  // Kullanıcı bilgisini getir
  const getUser = (userId) => {
    return users.find((u) => u.id === userId)
  }

  // Kart bilgisini getir
  const getCard = (cardId) => {
    return cards.find((c) => c.id === cardId)
  }

  const getUserNameById = (userId) => {
    const user = getUser(userId)
    return user?.name || 'Bilinmeyen kişi'
  }

  const getCardNameById = (cardId) => {
    const card = getCard(cardId)
    return card?.name || null
  }

  const buildStoreLabel = (storeName, productName) => {
    if (storeName && productName) {
      return `${storeName} - ${productName}`
    }
    return storeName || productName || 'Alışveriş'
  }

  const formatAmountText = (amount) => {
    if (!amount && amount !== 0) return ''
    const numeric = typeof amount === 'number' ? amount : parseFloat(amount)
    if (Number.isNaN(numeric)) {
      return ''
    }
    return formatCurrency(numeric)
  }

  const formatInstallmentValue = (count) => {
    if (count === undefined || count === null) return null
    const numeric = parseInt(count, 10)
    if (Number.isNaN(numeric)) return null
    return numeric.toString()
  }

  const buildLogDescription = (
    type,
    {
      userName,
      storeLabel,
      cardName,
      oldAmountText,
      newAmountText,
      oldInstallmentValue,
      newInstallmentValue
    }
  ) => {
    const cardText = cardName ? ` (${cardName} kartı)` : ''

    const detailParts = []
    if (
      oldAmountText &&
      newAmountText &&
      oldAmountText !== newAmountText
    ) {
      detailParts.push(
        `tutar ${oldAmountText} değerinden ${newAmountText} değerine güncellendi`
      )
    }

    if (
      oldInstallmentValue &&
      newInstallmentValue &&
      oldInstallmentValue !== newInstallmentValue
    ) {
      detailParts.push(
        `taksit sayısı ${oldInstallmentValue}'dan ${newInstallmentValue} olarak güncellendi`
      )
    }

    const detailText = detailParts.length ? ` ${detailParts.join(' ve ')}.` : ''

    switch (type) {
      case 'create':
        return `${userName} kişisi için ${storeLabel} alışverişi${cardText} ${newAmountText || ''} tutarıyla eklendi.`.trim()
      case 'update':
        return `${userName} kişisi için ${storeLabel} alışverişi${cardText} güncellendi.${detailText || ''}`.trim()
      case 'delete':
        return `${userName} kişisi için ${storeLabel} alışverişi${cardText} silindi${oldAmountText ? ` (tutar: ${oldAmountText})` : ''}.`
      default:
        return `${userName} kişisi için ${storeLabel} alışverişi işlem gördü.`
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Harcama Yönetimi</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
              setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 0)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Yeni Harcama Ekle
          </button>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Ödeme Ekle
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tip
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            >
              <option value="all">Hepsi</option>
              <option value="purchases">Harcamalar</option>
              <option value="payments">Ödemeler</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Filtresi
            </label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            >
              <option value="all">Tüm Kullanıcılar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kart Filtresi
            </label>
            <select
              value={filterCardId}
              onChange={(e) => setFilterCardId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            >
              <option value="all">Tüm Kartlar</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div ref={formRef} className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPurchase ? 'Harcama Düzenle' : 'Yeni Harcama'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanıcı <span className="text-red-500">*</span>
                </label>
                <select
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.userId ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Kullanıcı Seçin</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                {errors.userId && (
                  <p className="mt-1 text-sm text-red-600">{errors.userId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kart <span className="text-red-500">*</span>
                </label>
                <select
                  name="cardId"
                  value={formData.cardId}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.cardId ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Kart Seçin</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                {errors.cardId && (
                  <p className="mt-1 text-sm text-red-600">{errors.cardId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mağaza Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.storeName ? 'border-red-500' : ''
                  }`}
                  placeholder="Örn: Özgür Mobilya, Trendyol"
                />
                {errors.storeName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.storeName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ürün Adı
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.productName ? 'border-red-500' : ''
                  }`}
                  placeholder="Örn: Ahenk Kanepe, Telefon (Opsiyonel)"
                />
                {errors.productName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.productName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Toplam Tutar (TRY) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.totalAmount ? 'border-red-500' : ''
                  }`}
                  placeholder="12000.00"
                />
                {errors.totalAmount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.totalAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taksit Sayısı <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="installmentCount"
                  value={formData.installmentCount}
                  onChange={handleInputChange}
                  min="1"
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.installmentCount ? 'border-red-500' : ''
                  }`}
                  placeholder="12"
                />
                {errors.installmentCount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.installmentCount}
                  </p>
                )}
                {formData.totalAmount &&
                  formData.installmentCount &&
                  !errors.installmentCount && (
                    <p className="mt-1 text-xs text-gray-500">
                      Taksit başına:{' '}
                      {formatCurrency(
                        parseFloat(formData.totalAmount) /
                          parseInt(formData.installmentCount)
                      )}
                    </p>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alışveriş Tarihi
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İlk Taksit Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="firstInstallmentDate"
                  value={formData.firstInstallmentDate}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.firstInstallmentDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.firstInstallmentDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstInstallmentDate}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingPurchase ? 'Güncelle' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Harcama Listesi */}
      {(filterType === 'all' || filterType === 'purchases') && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Harcamalar ({filteredPurchases.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kart
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mağaza - Ürün
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taksit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İlk Taksit Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.map((purchase) => {
                const user = getUser(purchase.userId)
                const card = getCard(purchase.cardId)
                return (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user && (
                        <button
                          onClick={() => setSelectedUserForDetail(user.id)}
                          className="hover:underline cursor-pointer"
                        >
                          <UserColorBadge color={user.color} name={user.name} />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {card && (
                        <CardColorBadge color={card.color} name={card.name} />
                      )}
                      {!card && (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.storeName 
                        ? (purchase.productName 
                            ? `${purchase.storeName} - ${purchase.productName}`
                            : purchase.storeName)
                        : purchase.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(getInstallmentAmount(purchase))} x{' '}
                      {purchase.installmentCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateLong(purchase.firstInstallmentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(purchase)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(purchase)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Harcama bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ödemeler Listesi */}
      {(filterType === 'all' || filterType === 'payments') && (
        <div className={`bg-white shadow rounded-lg overflow-hidden ${(filterType === 'all' || filterType === 'purchases') ? 'mt-6' : ''}`}>
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Ödemeler ({paymentRecords.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ekstre Ayı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ödeme Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Açıklama
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentRecords.map((payment) => {
                const user = users.find((u) => u.id === payment.userId)
                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user && (
                        <button
                          onClick={() => setSelectedUserForDetail(user.id)}
                          className="hover:underline cursor-pointer"
                        >
                          <UserColorBadge color={user.color} name={user.name} />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateLong(payment.paymentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {payment.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditPayment(payment)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDeletePayment(payment)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                )
              })}
              {paymentRecords.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Ödeme kaydı bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Ödeme Ekleme/Düzenleme Modal */}
      {showPaymentForm && (
        <PaymentModal
          users={users}
          selectedMonth={selectedMonth}
          editingPayment={editingPayment}
          onClose={() => {
            setShowPaymentForm(false)
            setEditingPayment(null)
          }}
          onSave={async () => {
            await loadData()
            setShowPaymentForm(false)
            setEditingPayment(null)
          }}
        />
      )}

      {/* Kullanıcı Detay Modal */}
      {selectedUserForDetail && (
        <UserDetailModal
          userId={selectedUserForDetail}
          selectedMonth={selectedMonth}
          onClose={() => setSelectedUserForDetail(null)}
        />
      )}
    </div>
  )
}

/**
 * Ödeme Ekleme/Düzenleme Modal Component
 */
const PaymentModal = ({ users, selectedMonth, editingPayment, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    userId: editingPayment?.userId || '',
    amount: editingPayment?.amount || '',
    paymentDate: editingPayment?.paymentDate 
      ? format(editingPayment.paymentDate, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    description: editingPayment?.description || '',
    month: editingPayment?.month || selectedMonth || getCurrentMonth()
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingPayment) {
      setFormData({
        userId: editingPayment.userId,
        amount: editingPayment.amount,
        paymentDate: format(editingPayment.paymentDate, 'yyyy-MM-dd'),
        description: editingPayment.description || '',
        month: editingPayment.month
      })
    } else {
      setFormData({
        userId: '',
        amount: '',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        month: selectedMonth || getCurrentMonth()
      })
    }
  }, [editingPayment, selectedMonth])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const newErrors = {}
    if (!formData.userId) {
      newErrors.userId = 'Kullanıcı seçimi gereklidir'
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Geçerli bir tutar giriniz'
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Ödeme tarihi gereklidir'
    }
    if (!formData.month) {
      newErrors.month = 'Ekstre ayı gereklidir'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true)
      try {
        if (editingPayment) {
          await updatePaymentRecord(editingPayment.id, {
            amount: parseFloat(formData.amount),
            paymentDate: new Date(formData.paymentDate),
            description: formData.description.trim() || null
          })
          alert('Ödeme kaydı güncellendi')
        } else {
          await createPaymentRecord({
            userId: formData.userId,
            month: formData.month,
            amount: parseFloat(formData.amount),
            paymentDate: new Date(formData.paymentDate),
            description: formData.description.trim() || null
          })
          alert('Ödeme kaydı eklendi')
        }
        onSave()
      } catch (error) {
        console.error('Ödeme kaydedilirken hata:', error)
        alert(editingPayment ? 'Ödeme güncellenirken bir hata oluştu.' : 'Ödeme eklenirken bir hata oluştu.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {editingPayment ? 'Ödeme Düzenle' : 'Ödeme Ekle'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kullanıcı <span className="text-red-500">*</span>
                </label>
                <select
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  disabled={!!editingPayment}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border ${
                    errors.userId ? 'border-red-300' : ''
                  } ${editingPayment ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Kullanıcı Seçin</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                {errors.userId && (
                  <p className="mt-1 text-sm text-red-600">{errors.userId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ekstre Ayı <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                  disabled={!!editingPayment}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border ${
                    errors.month ? 'border-red-300' : ''
                  } ${editingPayment ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.month && (
                  <p className="mt-1 text-sm text-red-600">{errors.month}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tutar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border ${
                    errors.amount ? 'border-red-300' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ödeme Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border ${
                    errors.paymentDate ? 'border-red-300' : ''
                  }`}
                />
                {errors.paymentDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                  placeholder="Örn: Nakit ödeme, Banka transferi..."
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (editingPayment ? 'Güncelleniyor...' : 'Kaydediliyor...') : (editingPayment ? 'Güncelle' : 'Kaydet')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Purchases

