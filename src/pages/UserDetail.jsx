import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getUsers } from '../services/userService'
import { getPurchases } from '../services/purchaseService'
import {
  calculateUserTotalForMonth,
  calculateUserTotalDebt,
  calculateUserRemainingInstallments,
  calculateInstallmentsForMonth,
  getInstallmentInfoForMonth
} from '../utils/installmentCalculator'
import {
  getCurrentMonth,
  formatMonthDisplayLong,
  formatCurrency,
  formatDateLong
} from '../utils/dateUtils'
import MonthSelector from '../components/MonthSelector'
import UserColorBadge from '../components/UserColorBadge'

/**
 * Kullanıcı detay sayfası - Kullanıcının tüm harcamaları ve taksit detayları
 */
const UserDetail = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [user, setUser] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, purchasesData] = await Promise.all([
        getUsers(),
        getPurchases()
      ])
      
      const foundUser = usersData.find((u) => u.id === userId)
      if (!foundUser) {
        navigate('/')
        return
      }
      
      setUser(foundUser)
      
      // Kullanıcının harcamalarını filtrele
      const userPurchases = purchasesData.filter((p) => p.userId === userId)
      setPurchases(userPurchases)
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Bu ay için taksit bilgilerini hesapla
  const monthInstallments = calculateInstallmentsForMonth(purchases, selectedMonth)
  const filteredMonthInstallments = monthInstallments.filter(
    (installment) => installment.userId === userId
  )

  // Kullanıcı istatistikleri
  const monthTotal = calculateUserTotalForMonth(purchases, selectedMonth)
  const totalDebt = calculateUserTotalDebt(purchases, selectedMonth)
  const remainingInstallments = calculateUserRemainingInstallments(
    purchases,
    selectedMonth
  )

  // Her harcama için detaylı bilgi
  const purchaseDetails = purchases.map((purchase) => {
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
      // Tek çekim için
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (firstDate < today) {
        paidInstallments = 1
        remainingInstallmentCount = 0
      } else {
        paidInstallments = 0
        remainingInstallmentCount = 1
      }
    } else {
      // Taksitli için
      if (monthDiff >= 0) {
        paidInstallments = Math.min(monthDiff + 1, purchase.installmentCount)
        remainingInstallmentCount = purchase.installmentCount - paidInstallments
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Kullanıcı bulunamadı</div>
      </div>
    )
  }

  return (
    <div>
      {/* Başlık ve geri butonu */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Dashboard'a Dön
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            <UserColorBadge color={user.color} name={user.name} /> Detayları
          </h2>
        </div>
        <MonthSelector
          value={selectedMonth}
          onChange={setSelectedMonth}
          label="Ekstre Ayı"
        />
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">
            Bu Ay Ödenecek
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(monthTotal)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Toplam Borç</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(totalDebt)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Kalan Taksit</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {remainingInstallments}
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

      {/* Bu ay ödenecek taksitler */}
      {filteredMonthInstallments.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
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
                  <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(monthTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {remainingInstallments}
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                      {detail.description}
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
                      {detail.paidInstallments}/{detail.installmentCount}
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
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {purchaseDetails.reduce(
                      (sum, d) => sum + d.paidInstallments,
                      0
                    )}
                    /
                    {purchaseDetails.reduce(
                      (sum, d) => sum + d.installmentCount,
                      0
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {remainingInstallments}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(
                      purchaseDetails.reduce((sum, d) => sum + d.paidAmount, 0)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(totalDebt)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

export default UserDetail

