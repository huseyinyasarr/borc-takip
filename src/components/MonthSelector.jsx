import { useState } from 'react'

/**
 * Ay seçici component - Ekstre ayı seçimi için
 */
const MonthSelector = ({ value, onChange, label = 'Ekstre Ayı', wrapperClassName = 'mb-4' }) => {
  const handleChange = (e) => {
    onChange(e.target.value)
  }

  return (
    <div className={wrapperClassName}>
      <label htmlFor="month-selector" className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id="month-selector"
        type="month"
        value={value}
        onChange={handleChange}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-9 px-3 border leading-5"
      />
    </div>
  )
}

export default MonthSelector

