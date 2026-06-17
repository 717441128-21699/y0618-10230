export type UserRole = 'client' | 'consultant';

export type ApplicationType = 'work_visa' | 'permanent_residence' | 'citizenship';

export type DocumentStatus = 'pending' | 'uploaded' | 'notarization_pending' | 'notarized' | 'submitted';

export type DocumentCategory = 'identity' | 'education' | 'work' | 'finance' | 'health' | 'other';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  consultantId?: string;
  avatar?: string;
}

export interface FileVersion {
  id: string;
  version: number;
  filename: string;
  originalName: string;
  fileSize: number;
  uploadDate: string;
  uploaderId: string;
  uploaderName: string;
  note?: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
  resolved: boolean;
}

export interface DocumentItem {
  id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  description: string;
  deadline?: string;
  currentVersion?: FileVersion;
  versions: FileVersion[];
  comments: Comment[];
  required: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  reminder: boolean;
}

export interface SubmissionInfo {
  submitted: boolean;
  submissionDate?: string;
  applicationNumber?: string;
  authority?: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  applicationType: ApplicationType;
  targetCountry: string;
  clientId: string;
  clientName: string;
  consultantId?: string;
  createdAt: string;
  updatedAt: string;
  documents: DocumentItem[];
  submission: SubmissionInfo;
  milestones: Milestone[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: DocumentCategory;
  description: string;
  required: boolean;
}

export interface ApplicationTemplate {
  type: ApplicationType;
  country: string;
  documents: DocumentTemplate[];
}

export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  success: boolean;
  user?: Omit<User, 'password'>;
  token?: string;
  message?: string;
}

export interface CreateProjectRequest {
  name: string;
  applicationType: ApplicationType;
  targetCountry: string;
  clientId: string;
  clientName: string;
  consultantId?: string;
}

export interface UpdateDocumentRequest {
  status?: DocumentStatus;
  deadline?: string;
}

export interface AddCommentRequest {
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
}

export interface UpdateSubmissionRequest {
  submitted: boolean;
  submissionDate?: string;
  applicationNumber?: string;
  authority?: string;
  notes?: string;
}

export interface AddMilestoneRequest {
  title: string;
  description: string;
  date: string;
  reminder: boolean;
}

export interface BatchUpdateDocumentsRequest {
  documentIds: string[];
  status?: DocumentStatus;
  deadline?: string;
}

export interface SetCurrentVersionRequest {
  versionId: string;
}

export type ActivityType =
  | 'document_uploaded'
  | 'document_status_changed'
  | 'document_deadline_set'
  | 'comment_added'
  | 'submission_updated'
  | 'milestone_added'
  | 'milestone_completed'
  | 'project_created'
  | 'version_restored';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  metadata?: Record<string, any>;
}

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  work_visa: '工作签证',
  permanent_residence: '永久居留',
  citizenship: '入籍',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: '待准备',
  uploaded: '已上传',
  notarization_pending: '待公证',
  notarized: '已公证',
  submitted: '已提交',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  pending: 'bg-gray-500',
  uploaded: 'bg-blue-500',
  notarization_pending: 'bg-orange-500',
  notarized: 'bg-purple-500',
  submitted: 'bg-green-500',
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  identity: '身份证明',
  education: '教育背景',
  work: '工作经历',
  finance: '财务证明',
  health: '健康证明',
  other: '其他材料',
};
