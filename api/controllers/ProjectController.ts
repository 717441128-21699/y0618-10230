import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FileStorageService } from '../services/FileStorageService.js';
import {
  Project,
  DocumentItem,
  CreateProjectRequest,
  UpdateDocumentRequest,
  AddCommentRequest,
  UpdateSubmissionRequest,
  AddMilestoneRequest,
  FileVersion,
  Comment,
} from '../../shared/types/index.js';

export class ProjectController {
  static async getProjects(req: Request, res: Response) {
    try {
      const { userId, role } = req.query as { userId: string; role: string };
      let projects = FileStorageService.readProjects();

      if (role === 'client') {
        projects = projects.filter((p: Project) => p.clientId === userId);
      } else if (role === 'consultant') {
        projects = projects.filter((p: Project) => p.consultantId === userId || !p.consultantId);
      }

      const projectsWithProgress = projects.map((project: Project) => ({
        ...project,
        completionPercentage: calculateCompletion(project),
      }));

      return res.json(projectsWithProgress);
    } catch (error) {
      console.error('Get projects error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async createProject(req: Request, res: Response) {
    try {
      const data: CreateProjectRequest = req.body;
      const templates = FileStorageService.readTemplates();
      
      const template = templates.find(
        (t: any) => t.type === data.applicationType && t.country === data.targetCountry
      );

      if (!template) {
        return res.status(400).json({ error: '未找到对应申请类型的材料模板' });
      }

      const documents: DocumentItem[] = template.documents.map((doc: any) => ({
        id: uuidv4(),
        name: doc.name,
        category: doc.category,
        status: 'pending',
        description: doc.description,
        versions: [],
        comments: [],
        required: doc.required,
      }));

      const now = new Date().toISOString();
      const project: Project = {
        id: uuidv4(),
        name: data.name,
        applicationType: data.applicationType,
        targetCountry: data.targetCountry,
        clientId: data.clientId,
        clientName: data.clientName,
        consultantId: data.consultantId,
        createdAt: now,
        updatedAt: now,
        documents,
        submission: { submitted: false },
        milestones: [],
      };

      const projects = FileStorageService.readProjects();
      projects.push(project);
      FileStorageService.writeProjects(projects);

      return res.status(201).json({ ...project, completionPercentage: 0 });
    } catch (error) {
      console.error('Create project error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projects = FileStorageService.readProjects();
      const project = projects.find((p: Project) => p.id === id);

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      return res.json({
        ...project,
        completionPercentage: calculateCompletion(project),
      });
    } catch (error) {
      console.error('Get project error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const projects = FileStorageService.readProjects();
      const index = projects.findIndex((p: Project) => p.id === id);

      if (index === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      FileStorageService.writeProjects(projects);
      return res.json({
        ...projects[index],
        completionPercentage: calculateCompletion(projects[index]),
      });
    } catch (error) {
      console.error('Update project error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async updateDocument(req: Request, res: Response) {
    try {
      const { id, docId } = req.params;
      const data: UpdateDocumentRequest = req.body;
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const docIndex = projects[projectIndex].documents.findIndex((d: DocumentItem) => d.id === docId);
      if (docIndex === -1) {
        return res.status(404).json({ error: '材料不存在' });
      }

      projects[projectIndex].documents[docIndex] = {
        ...projects[projectIndex].documents[docIndex],
        ...data,
      };
      projects[projectIndex].updatedAt = new Date().toISOString();

      FileStorageService.writeProjects(projects);
      return res.json(projects[projectIndex].documents[docIndex]);
    } catch (error) {
      console.error('Update document error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async uploadDocumentFile(req: Request, res: Response) {
    try {
      const { id, docId } = req.params;
      const { uploaderId, uploaderName, note } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: '未找到上传文件' });
      }

      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const docIndex = projects[projectIndex].documents.findIndex((d: DocumentItem) => d.id === docId);
      if (docIndex === -1) {
        return res.status(404).json({ error: '材料不存在' });
      }

      const currentVersions = projects[projectIndex].documents[docIndex].versions;
      const newVersion: FileVersion = {
        id: uuidv4(),
        version: currentVersions.length + 1,
        filename: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        uploaderId,
        uploaderName,
        note,
      };

      projects[projectIndex].documents[docIndex].versions.push(newVersion);
      projects[projectIndex].documents[docIndex].currentVersion = newVersion;
      projects[projectIndex].documents[docIndex].status = 'uploaded';
      projects[projectIndex].updatedAt = new Date().toISOString();

      FileStorageService.writeProjects(projects);
      return res.json(projects[projectIndex].documents[docIndex]);
    } catch (error) {
      console.error('Upload document error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async getDocumentVersions(req: Request, res: Response) {
    try {
      const { id, docId } = req.params;
      const projects = FileStorageService.readProjects();
      const project = projects.find((p: Project) => p.id === id);

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const document = project.documents.find((d: DocumentItem) => d.id === docId);
      if (!document) {
        return res.status(404).json({ error: '材料不存在' });
      }

      return res.json(document.versions);
    } catch (error) {
      console.error('Get document versions error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async addComment(req: Request, res: Response) {
    try {
      const { id, docId } = req.params;
      const data: AddCommentRequest = req.body;
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const docIndex = projects[projectIndex].documents.findIndex((d: DocumentItem) => d.id === docId);
      if (docIndex === -1) {
        return res.status(404).json({ error: '材料不存在' });
      }

      const comment: Comment = {
        id: uuidv4(),
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        authorRole: data.authorRole,
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      projects[projectIndex].documents[docIndex].comments.push(comment);
      projects[projectIndex].updatedAt = new Date().toISOString();

      FileStorageService.writeProjects(projects);
      return res.json(comment);
    } catch (error) {
      console.error('Add comment error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async updateSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdateSubmissionRequest = req.body;
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      projects[projectIndex].submission = data;
      projects[projectIndex].updatedAt = new Date().toISOString();

      FileStorageService.writeProjects(projects);
      return res.json(projects[projectIndex].submission);
    } catch (error) {
      console.error('Update submission error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async addMilestone(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: AddMilestoneRequest = req.body;
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      projects[projectIndex].milestones.push({
        id: uuidv4(),
        ...data,
        completed: false,
      });
      projects[projectIndex].updatedAt = new Date().toISOString();

      FileStorageService.writeProjects(projects);
      return res.json(projects[projectIndex].milestones);
    } catch (error) {
      console.error('Add milestone error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async updateMilestone(req: Request, res: Response) {
    try {
      const { id, milestoneId } = req.params;
      const data = req.body;
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const milestoneIndex = projects[projectIndex].milestones.findIndex(
        (m: any) => m.id === milestoneId
      );
      if (milestoneIndex === -1) {
        return res.status(404).json({ error: '节点不存在' });
      }

      projects[projectIndex].milestones[milestoneIndex] = {
        ...projects[projectIndex].milestones[milestoneIndex],
        ...data,
      };
      projects[projectIndex].updatedAt = new Date().toISOString();

      FileStorageService.writeProjects(projects);
      return res.json(projects[projectIndex].milestones[milestoneIndex]);
    } catch (error) {
      console.error('Update milestone error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }
}

function calculateCompletion(project: Project): number {
  const requiredDocs = project.documents.filter((d) => d.required);
  if (requiredDocs.length === 0) return 0;

  const completedDocs = requiredDocs.filter(
    (d) => d.status === 'submitted' || d.status === 'notarized'
  );

  return Math.round((completedDocs.length / requiredDocs.length) * 100);
}
