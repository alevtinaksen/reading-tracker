import { STATUS } from '../constants'

const STYLES = {
  [STATUS.read]: 'bg-lime-400 text-lime-950',
  [STATUS.reading]: 'bg-violet-300 text-violet-950',
  [STATUS.abandoned]: 'bg-orange-300 text-orange-950',
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
