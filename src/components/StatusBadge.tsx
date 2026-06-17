import { DocumentStatus, DOCUMENT_STATUS_LABELS } from '../../shared/types';
import { getStatusColor } from '../utils/helpers';

interface StatusBadgeProps {
  status: DocumentStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white ${colorClass} ${sizeClasses} transition-all duration-200 hover:scale-105`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 mr-1.5 animate-pulse" />
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}
