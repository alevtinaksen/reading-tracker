import { STATUS } from '../constants'

const STYLES = {
  [STATUS.wantToRead]: 'bg-[#F3E8FF] text-[#7C3AED]',
  [STATUS.reading]: 'bg-[#E0F2FE] text-[#0369A1]',
  [STATUS.read]: 'bg-[#DCFFDF] text-[#15803D]',
  [STATUS.abandoned]: 'bg-[#FFE5E5] text-[#D32F2F]',
}

export function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STYLES[status] ?? STYLES[STATUS.read]}`}
    >
      {label}
    </span>
  )
}
