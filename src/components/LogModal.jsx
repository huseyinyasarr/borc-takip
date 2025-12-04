import { useEffect, useState } from 'react'
import { getLogs } from '../services/logService'
import { getUsers } from '../services/userService'
import { getCards } from '../services/cardService'
import { formatDateLong } from '../utils/dateUtils'

const ACTION_LABELS = {
  purchase_create: 'Harcama Eklendi',
  purchase_update: 'Harcama Güncellendi',
  purchase_delete: 'Harcama Silindi',
  user_create: 'Kişi Eklendi',
  user_update: 'Kişi Güncellendi',
  user_delete: 'Kişi Silindi',
  card_create: 'Kart Eklendi',
  card_update: 'Kart Güncellendi',
  card_delete: 'Kart Silindi'
}

const INITIAL_FILTERS = {
  actorEmail: '',
  userId: '',
  cardId: '',
  action: ''
}

const LogModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [actorOptions, setActorOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [cardOptions, setCardOptions] = useState([])
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  useEffect(() => {
    if (isOpen) {
      loadOptions()
      loadLogs()
    }
  }, [isOpen])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
    loadLogs({ ...filters, [name]: value })
  }

  const loadOptions = async () => {
    const [logData, users, cards] = await Promise.all([
      getLogs(),
      getUsers().catch(() => []),
      getCards().catch(() => [])
    ])

    const emails = [...new Set(logData.map((log) => log.actor?.email).filter(Boolean))]
    setActorOptions(emails)
    setUserOptions(users)
    setCardOptions(cards.filter((c) => c.isActive !== false))
  }

  const loadLogs = async (overrideFilters) => {
    setLoading(true)
    try {
      const activeFilters = overrideFilters ?? filters
      const cleanedFilters = Object.fromEntries(
        Object.entries(activeFilters).filter(([, v]) => v && v.trim() !== '')
      )
      const data = await getLogs(cleanedFilters)
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-60 transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">İşlem Logları</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Google Hesabı
                </label>
                <select
                  name="actorEmail"
                  value={filters.actorEmail}
                  onChange={handleFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                >
                  <option value="">Tüm Hesaplar</option>
                  {actorOptions.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Kişi
                </label>
                <select
                  name="userId"
                  value={filters.userId}
                  onChange={handleFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                >
                  <option value="">Tüm Kişiler</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Kart
                </label>
                <select
                  name="cardId"
                  value={filters.cardId}
                  onChange={handleFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                >
                  <option value="">Tüm Kartlar</option>
                  {cardOptions.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  İşlem Tipi
                </label>
                <select
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                >
                  <option value="">Tümü</option>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setFilters(INITIAL_FILTERS)
                  loadLogs(INITIAL_FILTERS)
                }}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Tümünü Göster
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="text-gray-500 text-sm">Yükleniyor...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                Kayıtlı log bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Google Hesabı
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlem
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Açıklama
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                          {log.createdAt ? formatDateLong(log.createdAt) : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">
                          {log.actor?.email || '-'}
                          {log.actor?.displayName && (
                            <div className="text-[11px] text-gray-400">
                              {log.actor.displayName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">
                          {ACTION_LABELS[log.action] || log.action}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 max-w-xl">
                          <div className="text-sm text-gray-900">
                            {log.description || ACTION_LABELS[log.action] || 'İşlem kaydı'}
                          </div>
                          {log.meta && (
                            <div className="text-[11px] text-gray-500 mt-1 space-x-2">
                              {log.meta.userName && <span>Kişi: {log.meta.userName}</span>}
                              {log.meta.cardName && <span>Kart: {log.meta.cardName}</span>}
                              {log.meta.storeLabel && <span>Mağaza: {log.meta.storeLabel}</span>}
                              {log.meta.newAmountText && <span>Tutar: {log.meta.newAmountText}</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogModal


