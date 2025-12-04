/**
 * Kullanıcı renk rozeti componenti
 */
const UserColorBadge = ({ color, name, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full`}
        style={{ backgroundColor: color }}
        title={name}
      />
      <span>{name}</span>
    </div>
  )
}

export default UserColorBadge

