import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getUsers } from '../services/userService'
import { getPurchases } from '../services/purchaseService'
import { getCards } from '../services/cardService'
import {
  calculateUserTotalForMonth,
  calculateUserTotalDebt,
  calculateInstallmentsForMonth
} from '../utils/installmentCalculator'
import { getCurrentMonth, formatMonthDisplayLong, formatCurrency } from '../utils/dateUtils'
import MonthSelector from '../components/MonthSelector'
import UserColorBadge from '../components/UserColorBadge'
import UserDetailModal from '../components/UserDetailModal'
import CardColorBadge from '../components/CardColorBadge'

/**
 * Ana Dashboard sayfası - Ekstre görünümü ve özet bilgiler
 */
const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [users, setUsers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('all')
  const [selectedCardId, setSelectedCardId] = useState('all')
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null)

  // Verileri yükle
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, purchasesData, cardsData] = await Promise.all([
        getUsers(),
        getPurchases(),
        getCards()
      ])
      setUsers(usersData)
      setPurchases(purchasesData)
      setCards(cardsData.filter(c => c.isActive))
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error)
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Firestore Security Rules izin vermiyor. Firebase Console\'dan Rules\'ı kontrol edin.')
      }
    } finally {
      setLoading(false)
    }
  }


  // Kullanıcı istatistiklerini hesapla
  const calculateUserStats = () => {
    if (!users.length || !purchases.length) return []

    // Kart filtresi uygula
    let filteredPurchases = purchases
    if (selectedCardId !== 'all') {
      filteredPurchases = purchases.filter((p) => p.cardId === selectedCardId)
    }

    return users.map((user) => {
      const userPurchases = filteredPurchases.filter((p) => p.userId === user.id)
      const monthTotal = calculateUserTotalForMonth(userPurchases, selectedMonth)
      const totalDebt = calculateUserTotalDebt(userPurchases, selectedMonth)
      const totalSpending = userPurchases.reduce((sum, p) => sum + p.totalAmount, 0)

      return {
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        monthTotal,
        totalDebt,
        totalSpending
      }
    })
  }

  const userStats = calculateUserStats()

  // Filtrelenmiş istatistikler
  let filteredStats =
    selectedUserId === 'all'
      ? userStats
      : userStats.filter((stat) => stat.userId === selectedUserId)

  // Borcu olmayan kullanıcıları gizle (Bu Ay Ödenecek ve Toplam Borç 0 ise)
  filteredStats = filteredStats.filter(
    (stat) => stat.monthTotal > 0 || stat.totalDebt > 0
  )

  // Genel toplamlar (seçili filtrelere göre)
  const grandTotal = filteredStats.reduce(
    (sum, stat) => sum + stat.monthTotal,
    0
  )
  const totalDebtSum = filteredStats.reduce(
    (sum, stat) => sum + stat.totalDebt,
    0
  )
  const totalSpendingSum = filteredStats.reduce(
    (sum, stat) => sum + stat.totalSpending,
    0
  )

  // Grafik verileri (kullanıcı renkleri ile)
  const chartData = filteredStats.map((stat) => ({
    name: stat.userName,
    'Bu Ay Ödenecek': stat.monthTotal,
    'Toplam Borç': stat.totalDebt,
    'Toplam Harcama': stat.totalSpending,
    color: stat.userColor // Kullanıcı rengini ekle
  }))

  // Kart bazında istatistikler
  const calculateCardStats = () => {
    if (!cards.length || !purchases.length) return []

    // Kullanıcı filtresi uygula
    let filteredPurchasesForCards = purchases
    if (selectedUserId !== 'all') {
      filteredPurchasesForCards = purchases.filter((p) => p.userId === selectedUserId)
    }

    return cards.map((card) => {
      const cardPurchases = filteredPurchasesForCards.filter((p) => p.cardId === card.id)
      const monthTotal = calculateUserTotalForMonth(cardPurchases, selectedMonth)
      const totalDebt = calculateUserTotalDebt(cardPurchases, selectedMonth)
      const totalSpending = cardPurchases.reduce((sum, p) => sum + p.totalAmount, 0)

      return {
        cardId: card.id,
        cardName: card.name,
        cardColor: card.color,
        monthTotal,
        totalDebt,
        totalSpending
      }
    }).filter((stat) => stat.monthTotal > 0 || stat.totalDebt > 0) // Sadece borcu olan kartları göster
  }

  const cardStats = calculateCardStats()

  // Kart bazında grafik verileri
  const cardChartData = cardStats.map((stat) => ({
    name: stat.cardName,
    'Bu Ay Ödenecek': stat.monthTotal,
    'Toplam Borç': stat.totalDebt,
    'Toplam Harcama': stat.totalSpending,
    color: stat.cardColor
  }))

  // Kart bazında toplamlar
  const cardGrandTotal = cardStats.reduce((sum, stat) => sum + stat.monthTotal, 0)
  const cardTotalDebtSum = cardStats.reduce((sum, stat) => sum + stat.totalDebt, 0)
  const cardTotalSpendingSum = cardStats.reduce((sum, stat) => sum + stat.totalSpending, 0)

  // Ekstre detayları (kart filtresi ile)
  let filteredPurchasesForStatement = purchases
  if (selectedCardId !== 'all') {
    filteredPurchasesForStatement = purchases.filter((p) => p.cardId === selectedCardId)
  }
  const statementDetails = calculateInstallmentsForMonth(filteredPurchasesForStatement, selectedMonth)
  const filteredStatementDetails =
    selectedUserId === 'all'
      ? statementDetails
      : statementDetails.filter((detail) => detail.userId === selectedUserId)


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
        <h2 className="text-2xl font-bold text-gray-900">
          Ana Sayfa - {formatMonthDisplayLong(selectedMonth)}
        </h2>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Bu Ay Ödenecek Toplam</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(grandTotal)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Aktif Kullanıcı</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {users.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Toplam Harcama</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(
              purchases.reduce((sum, p) => sum + p.totalAmount, 0)
            )}
          </div>
        </div>
      </div>

      {/* Ay seçici ve filtreler */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MonthSelector
            value={selectedMonth}
            onChange={setSelectedMonth}
            label="Ekstre Ayı Seç"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kart Filtresi
            </label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
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
              Kullanıcı Filtresi
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            >
              <option value="all">Tüm Kullanıcılar</option>
              {userStats
                .filter((stat) => stat.monthTotal > 0 || stat.totalDebt > 0)
                .map((stat) => {
                  const user = users.find((u) => u.id === stat.userId)
                  return user ? (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ) : null
                })}
            </select>
          </div>
        </div>

      </div>

      {/* Tablo */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bu Ay Ödenecek
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Borç
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStats.map((stat) => (
                <tr key={stat.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedUserForDetail(stat.userId)}
                      className="hover:underline cursor-pointer"
                    >
                      <UserColorBadge
                        color={stat.userColor}
                        name={stat.userName}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(stat.monthTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(stat.totalDebt)}
                  </td>
                </tr>
              ))}
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                    Veri bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
            {filteredStats.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    TOPLAM
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(
                      filteredStats.reduce((sum, stat) => sum + stat.totalDebt, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Ekstre Detayı - Her zaman görünür */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Ekstre Detayı - {formatMonthDisplayLong(selectedMonth)}
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
                    Harcama Açıklaması
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taksit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStatementDetails.map((detail, index) => {
                  const user = users.find((u) => u.id === detail.userId)
                  return (
                    <tr key={index} className="hover:bg-gray-50">
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
                        {detail.purchaseDescription}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {detail.installmentNumber}/{detail.totalInstallments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(detail.amount)}
                      </td>
                    </tr>
                  )
                })}
                {filteredStatementDetails.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      Bu ay için taksit bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Grafikler - Ana sayfanın en altı */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Bu Ayki Ödeme Dağılımı Grafiği */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Bu Ayki Ödeme Dağılımı
              </h3>
              <span className="text-sm font-bold text-gray-700">
                {formatCurrency(grandTotal)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="Bu Ay Ödenecek">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-payment-${index}`} fill={entry.color || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Toplam Borçlar Dağılımı Grafiği */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Toplam Borçlar Dağılımı
              </h3>
              <span className="text-sm font-bold text-gray-700">
                {formatCurrency(totalDebtSum)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="Toplam Borç">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-debt-${index}`} fill={entry.color || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Toplam Harcama Dağılımı Grafiği */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Toplam Harcama Dağılımı
              </h3>
              <span className="text-sm font-bold text-gray-700">
                {formatCurrency(totalSpendingSum)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="Toplam Harcama">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-spending-${index}`} fill={entry.color || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Kart Bazında Grafikler */}
      {cardChartData.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Kart Bazında Grafikler</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Kart Bazında Bu Ayki Ödeme Dağılımı Grafiği */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Kart - Bu Ayki Ödeme Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cardChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="Bu Ay Ödenecek">
                    {cardChartData.map((entry, index) => (
                      <Cell key={`cell-card-payment-${index}`} fill={entry.color || '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Kart Bazında Toplam Borçlar Dağılımı Grafiği */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Kart - Toplam Borçlar Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cardChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="Toplam Borç">
                    {cardChartData.map((entry, index) => (
                      <Cell key={`cell-card-debt-${index}`} fill={entry.color || '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Kart Bazında Toplam Harcama Dağılımı Grafiği */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Kart - Toplam Harcama Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cardChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="Toplam Harcama">
                    {cardChartData.map((entry, index) => (
                      <Cell key={`cell-card-spending-${index}`} fill={entry.color || '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
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

export default Dashboard

