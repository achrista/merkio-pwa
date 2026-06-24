const COLORS = [
  '#0050AA', '#1565C0', '#283593', '#6A1B9A',
  '#AD1457', '#C62828', '#2E7D32', '#00695C',
  '#E65100', '#4527A0',
]

function colorFromId(id) {
  return COLORS[id % COLORS.length]
}

export default function GroupAvatar({ group, size = 32 }) {
  const bg = group.avatarColor || colorFromId(group.id)
  const initials = group.name ? group.name.slice(0, 2).toUpperCase() : '?'
  const fontSize = Math.round(size * 0.45)

  if (group.iconData) {
    return (
      <img
        src={group.iconData}
        alt={group.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  if (group.iconKey) {
    return (
      <div
        style={{
          width: size, height: size,
          borderRadius: '50%',
          backgroundColor: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize,
        }}
      >
        {group.iconKey}
      </div>
    )
  }

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        fontSize,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}
