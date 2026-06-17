import {
  DocumentStatus,
  DocumentCategory,
  ApplicationType,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_CATEGORY_LABELS,
  APPLICATION_TYPE_LABELS,
} from '../../shared/types';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABELS[status];
}

export function getStatusColor(status: DocumentStatus): string {
  return DOCUMENT_STATUS_COLORS[status];
}

export function getCategoryLabel(category: DocumentCategory): string {
  return DOCUMENT_CATEGORY_LABELS[category];
}

export function getApplicationTypeLabel(type: ApplicationType): string {
  return APPLICATION_TYPE_LABELS[type];
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getDaysUntilDeadline(deadline?: string): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function isDeadlineNear(deadline?: string): boolean {
  const days = getDaysUntilDeadline(deadline);
  return days !== null && days <= 7 && days >= 0;
}

export function isDeadlineOverdue(deadline?: string): boolean {
  const days = getDaysUntilDeadline(deadline);
  return days !== null && days < 0;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
