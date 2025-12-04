import { useState, useEffect } from 'react'
import { getAllCards, createCard, updateCard, softDeleteCard } from '../services/cardService'
import CardColorBadge from '../components/CardColorBadge'

/**
 * Kart yönetimi sayfası
 */
const Cards = () => {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    note: ''
  })
  const [errors, setErrors] = useState({})

  // Hazır renk seçenekleri
  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#6366F1'  // Indigo
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const cardsData = await getAllCards()
      setCards(cardsData)
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error)
      if (error.code === 'permission-denied' || error.code === 'permissions-denied') {
        console.warn('⚠️ Firestore Security Rules kart koleksiyonuna izin vermiyor. Firebase Console\'dan Rules\'ı kontrol edin ve cards koleksiyonu için kuralları ekleyin.')
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

    if (!formData.name.trim()) {
      newErrors.name = 'Kart adı gereklidir'
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
      if (editingCard) {
        // Güncelleme
        await updateCard(editingCard.id, {
          name: formData.name.trim(),
          color: formData.color,
          note: formData.note.trim()
        })
      } else {
        // Yeni kart
        await createCard(formData)
      }

      resetForm()
      loadData()
    } catch (error) {
      console.error('Kart kaydedilirken hata:', error)
      if (error.code === 'permission-denied' || error.code === 'permissions-denied') {
        alert('Kart eklenirken hata: Firebase Security Rules kart koleksiyonuna izin vermiyor. Firebase Console\'dan Rules\'ı kontrol edin ve cards koleksiyonu için kuralları ekleyin.')
      } else {
        alert(`Kart kaydedilirken bir hata oluştu: ${error.message}`)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3B82F6',
      note: ''
    })
    setEditingCard(null)
    setShowForm(false)
    setErrors({})
  }

  const handleEdit = (card) => {
    setEditingCard(card)
    setFormData({
      name: card.name,
      color: card.color || '#3B82F6',
      note: card.note || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (cardId) => {
    if (!window.confirm('Bu kartı pasif yapmak istediğinize emin misiniz?')) {
      return
    }

    try {
      await softDeleteCard(cardId)
      loadData()
    } catch (error) {
      console.error('Kart pasif yapılırken hata:', error)
    }
  }

  const handleActivate = async (cardId) => {
    try {
      await updateCard(cardId, { isActive: true })
      loadData()
    } catch (error) {
      console.error('Kart aktif yapılırken hata:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  const activeCards = cards.filter((c) => c.isActive)
  const inactiveCards = cards.filter((c) => !c.isActive)

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Kart Yönetimi</h2>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Yeni Kart Ekle
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCard ? 'Kart Düzenle' : 'Yeni Kart'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kart Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  placeholder="Örn: Visa, Mastercard, BKM"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renk
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-full border-2 ${
                        formData.color === color
                          ? 'border-gray-900 ring-2 ring-offset-2 ring-blue-500'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Not
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="3"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="İsteğe bağlı not..."
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingCard ? 'Güncelle' : 'Kaydet'}
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

      {/* Aktif Kartlar */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Aktif Kartlar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kart
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeCards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CardColorBadge color={card.color} name={card.name} />
                    {card.note && (
                      <p className="text-xs text-gray-500 mt-1">{card.note}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(card)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Pasif Yap
                    </button>
                  </td>
                </tr>
              ))}
              {activeCards.length === 0 && (
                <tr>
                  <td colSpan="2" className="px-6 py-4 text-center text-gray-500">
                    Aktif kart bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pasif Kartlar */}
      {inactiveCards.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pasif Kartlar</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kart
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inactiveCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50 opacity-60">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CardColorBadge color={card.color} name={card.name} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleActivate(card.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Aktif Yap
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cards
