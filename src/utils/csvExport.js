// CSV export yardımcı fonksiyonları

/**
 * Verileri CSV formatına çevir ve indir
 * @param {Array} data - Export edilecek veri dizisi
 * @param {string} filename - Dosya adı
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('Export edilecek veri bulunamadı')
    return
  }

  // Başlıkları al
  const headers = Object.keys(data[0])

  // CSV satırlarını oluştur
  const csvRows = []

  // Başlık satırı (Türkçe karakter desteği için BOM ekle)
  csvRows.push('\uFEFF' + headers.join(','))

  // Veri satırları
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header]
      // Değer içinde virgül veya tırnak varsa tırnak içine al
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(values.join(','))
  })

  // CSV içeriğini oluştur
  const csvContent = csvRows.join('\n')

  // Blob oluştur ve indir
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Dashboard verilerini CSV olarak export et
 * @param {Array} userStats - Kullanıcı istatistikleri
 * @param {string} month - Ay "YYYY-MM" formatında
 */
export const exportDashboardToCSV = (userStats, month) => {
  const data = userStats.map((stat) => ({
    Kullanıcı: stat.userName,
    'Bu Ay Ödenecek': stat.monthTotal.toFixed(2),
    'Toplam Borç': stat.totalDebt.toFixed(2),
    'Kalan Taksit': stat.remainingInstallments
  }))

  // Genel toplam satırını ekle
  const grandTotal = userStats.reduce(
    (sum, stat) => ({
      monthTotal: sum.monthTotal + stat.monthTotal,
      totalDebt: sum.totalDebt + stat.totalDebt
    }),
    { monthTotal: 0, totalDebt: 0 }
  )

  data.push({
    Kullanıcı: 'TOPLAM',
    'Bu Ay Ödenecek': grandTotal.monthTotal.toFixed(2),
    'Toplam Borç': grandTotal.totalDebt.toFixed(2),
    'Kalan Taksit': '-'
  })

  const filename = `borc-takip-${month}.csv`
  exportToCSV(data, filename)
}

