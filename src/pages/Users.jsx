import { useState, useEffect, useRef } from 'react'
import { getAllUsers, createUser, updateUser, softDeleteUser } from '../services/userService'
import { getPurchases } from '../services/purchaseService'
import { calculateUserTotalDebt } from '../utils/installmentCalculator'
import { getCurrentMonth, formatCurrency } from '../utils/dateUtils'
import UserColorBadge from '../components/UserColorBadge'
import UserDetailModal from '../components/UserDetailModal'

/**
 * Kullanıcı yönetimi sayfası
 */
const Users = () => {
  const [users, setUsers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    note: ''
  })
  const [errors, setErrors] = useState({})
  const formRef = useRef(null)

  // Hazır renk seçenekleri
  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316'  // Orange
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, purchasesData] = await Promise.all([
        getAllUsers(),
        getPurchases()
      ])
      setUsers(usersData)
      setPurchases(purchasesData)
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

    if (!formData.name.trim()) {
      newErrors.name = 'Kullanıcı adı gereklidir'
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
      if (editingUser) {
        const newName = formData.name.trim()
        const oldName = editingUser.name
        const description =
          oldName !== newName
            ? `${oldName} kişisinin adı ${newName} olarak güncellendi.`
            : `${newName} kişisi güncellendi.`

        await updateUser(
          editingUser.id,
          {
            name: newName,
            color: formData.color,
            note: formData.note.trim()
          },
          {
            description,
            meta: {
              userName: newName,
              oldName
            }
          }
        )
        alert('Kullanıcı güncellendi')
      } else {
        // Yeni kullanıcı
        const newName = formData.name.trim()
        await createUser(
          {
            ...formData,
            name: newName
          },
          {
            description: `${newName} kişisi eklendi.`,
            meta: { userName: newName }
          }
        )
        alert('Kullanıcı eklendi')
      }

      resetForm()
      loadData()
    } catch (error) {
      console.error('Kullanıcı kaydedilirken hata:', error)
      console.error('Kullanıcı kaydedilirken bir hata oluştu:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3B82F6',
      note: ''
    })
    setEditingUser(null)
    setShowForm(false)
    setErrors({})
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      color: user.color || '#3B82F6',
      note: user.note || ''
    })
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  const handleDelete = async (user) => {
    if (!window.confirm('Bu kullanıcıyı pasif yapmak istediğinize emin misiniz?')) {
      return
    }

    try {
      await softDeleteUser(user.id, {
        description: `${user.name} kişisi silindi.`,
        meta: {
          userId: user.id,
          userName: user.name
        }
      })
      alert('Kullanıcı pasif yapıldı')
      loadData()
    } catch (error) {
      console.error('Kullanıcı pasif yapılırken hata:', error)
      console.error('Kullanıcı pasif yapılırken bir hata oluştu:', error)
    }
  }

  const handleActivate = async (user) => {
    try {
      await updateUser(
        user.id,
        { isActive: true },
        {
          description: `${user.name} kişisi yeniden aktif edildi.`,
          meta: {
            userId: user.id,
            userName: user.name
          }
        }
      )
      alert('Kullanıcı aktif yapıldı')
      loadData()
    } catch (error) {
      console.error('Kullanıcı aktif yapılırken hata:', error)
      console.error('Kullanıcı aktif yapılırken bir hata oluştu:', error)
    }
  }

  // Kullanıcının toplam borcunu hesapla
  const getUserTotalDebt = (userId) => {
    const userPurchases = purchases.filter((p) => p.userId === userId)
    return calculateUserTotalDebt(userPurchases, getCurrentMonth())
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  const activeUsers = users.filter((u) => u.isActive)
  const inactiveUsers = users.filter((u) => !u.isActive)

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
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
          Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div ref={formRef} className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanıcı Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  placeholder="Örn: Ahmet"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renk
                </label>
                <div className="flex gap-2">
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
                {editingUser ? 'Güncelle' : 'Kaydet'}
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

      {/* Aktif Kullanıcılar */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Aktif Kullanıcılar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Borç
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedUserForDetail(user.id)}
                      className="hover:underline cursor-pointer text-left"
                    >
                      <UserColorBadge color={user.color} name={user.name} />
                    </button>
                    {user.note && (
                      <p className="text-xs text-gray-500 mt-1">{user.note}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(getUserTotalDebt(user.id))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Pasif Yap
                    </button>
                  </td>
                </tr>
              ))}
              {activeUsers.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                    Aktif kullanıcı bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pasif Kullanıcılar */}
      {inactiveUsers.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pasif Kullanıcılar</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam Borç
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inactiveUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 opacity-60">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedUserForDetail(user.id)}
                        className="hover:underline cursor-pointer text-left"
                      >
                        <UserColorBadge color={user.color} name={user.name} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(getUserTotalDebt(user.id))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleActivate(user)}
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

      {/* User Detail Modal */}
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

export default Users

