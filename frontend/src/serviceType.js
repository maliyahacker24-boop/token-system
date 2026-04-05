export const getServiceTypeLabel = (value) => {
  const normalized = `${value || ''}`.trim().toLowerCase().replace(/[\s_-]+/g, ' ')

  if (normalized === 'dine in' || normalized === 'dinein' || normalized === 'eat in' || normalized === 'eatin') {
    return 'Eat In'
  }

  if (
    normalized === 'take away' ||
    normalized === 'takeaway' ||
    normalized === 'take out' ||
    normalized === 'takeout'
  ) {
    return 'Take Out'
  }

  return `${value || ''}`.trim()
}