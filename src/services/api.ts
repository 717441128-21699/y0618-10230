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
} from '../../shared/types';

const API_BASE = '/api';

export const projectService = {
  getProjects: async (userId: string, role: string): Promise<(Project & { completionPercentage: number })[]> => {
    const response = await fetch(`${API_BASE}/projects?userId=${userId}&role=${role}`);
    return response.json();
  },

  createProject: async (data: CreateProjectRequest): Promise<Project & { completionPercentage: number }> => {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getProject: async (id: string): Promise<Project & { completionPercentage: number }> => {
    const response = await fetch(`${API_BASE}/projects/${id}`);
    return response.json();
  },

  updateDocument: async (
    projectId: string,
    docId: string,
    data: UpdateDocumentRequest
  ): Promise<DocumentItem> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  uploadDocument: async (
    projectId: string,
    docId: string,
    file: File,
    uploaderId: string,
    uploaderName: string,
    note?: string
  ): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaderId', uploaderId);
    formData.append('uploaderName', uploaderName);
    if (note) formData.append('note', note);

    const response = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
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
    return response.json();
  },

  updateSubmission: async (
    projectId: string,
    data: UpdateSubmissionRequest
  ): Promise<any> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/submission`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  addMilestone: async (
    projectId: string,
    data: AddMilestoneRequest
  ): Promise<Milestone[]> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateMilestone: async (
    projectId: string,
    milestoneId: string,
    data: Partial<Milestone>
  ): Promise<Milestone> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

export const templateService = {
  getTemplates: async (type?: string, country?: string): Promise<ApplicationTemplate[]> => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (country) params.append('country', country);
    const response = await fetch(`${API_BASE}/templates?${params.toString()}`);
    return response.json();
  },

  getCountries: async (): Promise<string[]> => {
    const templates = await templateService.getTemplates();
    return [...new Set(templates.map((t) => t.country))];
  },
};
