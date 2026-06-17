import {
  Project,
  DocumentItem,
  CreateProjectRequest,
  UpdateDocumentRequest,
  AddCommentRequest,
  UpdateSubmissionRequest,
  AddMilestoneRequest,
  ApplicationTemplate,
  Milestone,
  Comment,
  BatchUpdateDocumentsRequest,
  Activity,
  UserRole,
} from '../../shared/types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `请求失败 (${response.status})`;
    throw new Error(errorMessage);
  }
  return data as T;
}

interface ActorInfo {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
}

export const projectService = {
  getProjects: async (userId: string, role: string): Promise<(Project & { completionPercentage: number })[]> => {
    const response = await fetch(`${API_BASE}/projects?userId=${userId}&role=${role}`);
    return handleResponse(response);
  },

  createProject: async (data: CreateProjectRequest): Promise<Project & { completionPercentage: number }> => {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getProject: async (id: string): Promise<Project & { completionPercentage: number }> => {
    const response = await fetch(`${API_BASE}/projects/${id}`);
    return handleResponse(response);
  },

  updateDocument: async (
    projectId: string,
    docId: string,
    data: UpdateDocumentRequest,
    actor: ActorInfo
  ): Promise<DocumentItem> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ...actor }),
    });
    return handleResponse(response);
  },

  batchUpdateDocuments: async (
    projectId: string,
    data: BatchUpdateDocumentsRequest,
    actor: ActorInfo
  ): Promise<{ success: boolean; updatedCount: number; documents: DocumentItem[]; completionPercentage: number }> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/documents/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ...actor }),
    });
    return handleResponse(response);
  },

  uploadDocument: async (
    projectId: string,
    docId: string,
    file: File,
    actor: ActorInfo,
    note?: string
  ): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaderId', actor.actorId);
    formData.append('uploaderName', actor.actorName);
    formData.append('uploaderRole', actor.actorRole);
    if (note) formData.append('note', note);

    const response = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  setCurrentVersion: async (
    projectId: string,
    docId: string,
    versionId: string,
    actor: ActorInfo
  ): Promise<DocumentItem> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}/versions/${versionId}/set-current`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actor),
    });
    return handleResponse(response);
  },

  addComment: async (
    projectId: string,
    docId: string,
    data: AddCommentRequest
  ): Promise<Comment> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateSubmission: async (
    projectId: string,
    data: UpdateSubmissionRequest,
    actor: ActorInfo
  ): Promise<any> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/submission`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ...actor }),
    });
    return handleResponse(response);
  },

  addMilestone: async (
    projectId: string,
    data: AddMilestoneRequest,
    actor: ActorInfo
  ): Promise<Milestone[]> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ...actor }),
    });
    return handleResponse(response);
  },

  updateMilestone: async (
    projectId: string,
    milestoneId: string,
    data: Partial<Milestone>,
    actor: ActorInfo
  ): Promise<Milestone> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ...actor }),
    });
    return handleResponse(response);
  },

  getActivities: async (projectId: string): Promise<Activity[]> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/activities`);
    return handleResponse(response);
  },
};

export const templateService = {
  getTemplates: async (type?: string, country?: string): Promise<ApplicationTemplate[]> => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (country) params.append('country', country);
    const response = await fetch(`${API_BASE}/templates?${params.toString()}`);
    return handleResponse(response);
  },

  getCountries: async (): Promise<string[]> => {
    const templates = await templateService.getTemplates();
    return [...new Set(templates.map((t) => t.country))];
  },
};
