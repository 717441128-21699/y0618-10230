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
  Activity,
  BatchUpdateDocumentsRequest,
  DOCUMENT_STATUS_LABELS,
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
      const actorId = req.body.actorId || '';
      const actorName = req.body.actorName || '未知用户';
      const actorRole: 'client' | 'consultant' = req.body.actorRole || 'client';
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const docIndex = projects[projectIndex].documents.findIndex((d: DocumentItem) => d.id === docId);
      if (docIndex === -1) {
        return res.status(404).json({ error: '材料不存在' });
      }

      const oldDoc = projects[projectIndex].documents[docIndex];
      projects[projectIndex].documents[docIndex] = {
        ...projects[projectIndex].documents[docIndex],
        ...data,
      };
      projects[projectIndex].updatedAt = new Date().toISOString();

      const docName = projects[projectIndex].documents[docIndex].name;
      if (data.status && data.status !== oldDoc.status) {
        addActivity(projects[projectIndex], {
          type: 'document_status_changed',
          description: `${docName} 状态变更为「${DOCUMENT_STATUS_LABELS[data.status]}」`,
          actorName,
          actorRole,
          metadata: { docId, oldStatus: oldDoc.status, newStatus: data.status },
        });
      }
      if (data.deadline && data.deadline !== oldDoc.deadline) {
        addActivity(projects[projectIndex], {
          type: 'document_deadline_set',
          description: `${docName} 设置截止日期为 ${data.deadline.split('T')[0]}`,
          actorName,
          actorRole,
          metadata: { docId, deadline: data.deadline },
        });
      }

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
      const { uploaderId, uploaderName, note, uploaderRole } = req.body;
      const role: 'client' | 'consultant' = uploaderRole || 'client';
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

      const docName = projects[projectIndex].documents[docIndex].name;
      addActivity(projects[projectIndex], {
        type: 'document_uploaded',
        description: `${docName} 上传了新版本 V${newVersion.version}（${file.originalname}）`,
        actorName: uploaderName,
        actorRole: role,
        metadata: { docId, versionId: newVersion.id, version: newVersion.version },
      });

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
      const actorName = req.body.actorName || '未知用户';
      const actorRole: 'client' | 'consultant' = req.body.actorRole || 'client';
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const wasSubmitted = projects[projectIndex].submission.submitted;
      projects[projectIndex].submission = data;
      projects[projectIndex].updatedAt = new Date().toISOString();

      const description = data.submitted && !wasSubmitted
        ? `申请已递交${data.applicationNumber ? `，申请编号：${data.applicationNumber}` : ''}`
        : wasSubmitted && !data.submitted
        ? '取消递交状态'
        : '更新了递交信息';
      addActivity(projects[projectIndex], {
        type: 'submission_updated',
        description,
        actorName,
        actorRole,
        metadata: { submitted: data.submitted, applicationNumber: data.applicationNumber },
      });

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
      const actorName = req.body.actorName || '未知用户';
      const actorRole: 'client' | 'consultant' = req.body.actorRole || 'client';
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const newMilestone = {
        id: uuidv4(),
        ...data,
        completed: false,
      };
      projects[projectIndex].milestones.push(newMilestone);
      projects[projectIndex].updatedAt = new Date().toISOString();

      addActivity(projects[projectIndex], {
        type: 'milestone_added',
        description: `新增申请节点「${data.title}」`,
        actorName,
        actorRole,
        metadata: { milestoneId: newMilestone.id, title: data.title },
      });

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
      const actorName = req.body.actorName || '未知用户';
      const actorRole: 'client' | 'consultant' = req.body.actorRole || 'client';
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

      const oldCompleted = projects[projectIndex].milestones[milestoneIndex].completed;
      projects[projectIndex].milestones[milestoneIndex] = {
        ...projects[projectIndex].milestones[milestoneIndex],
        ...data,
      };
      projects[projectIndex].updatedAt = new Date().toISOString();

      if (data.completed !== undefined && data.completed !== oldCompleted) {
        const milestone = projects[projectIndex].milestones[milestoneIndex];
        addActivity(projects[projectIndex], {
          type: data.completed ? 'milestone_completed' : 'milestone_added',
          description: data.completed
            ? `完成节点「${milestone.title}」`
            : `重新开启节点「${milestone.title}」`,
          actorName,
          actorRole,
          metadata: { milestoneId: milestone.id },
        });
      }

      FileStorageService.writeProjects(projects);
      return res.json(projects[projectIndex].milestones[milestoneIndex]);
    } catch (error) {
      console.error('Update milestone error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async batchUpdateDocuments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: BatchUpdateDocumentsRequest = req.body;
      const actorName = req.body.actorName || '未知用户';
      const actorRole: 'client' | 'consultant' = req.body.actorRole || 'client';
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      if (!data.documentIds || data.documentIds.length === 0) {
        return res.status(400).json({ error: '请选择要操作的材料' });
      }

      let updatedCount = 0;
      const updatedDocs: DocumentItem[] = [];

      data.documentIds.forEach((docId) => {
        const docIndex = projects[projectIndex].documents.findIndex(
          (d: DocumentItem) => d.id === docId
        );
        if (docIndex !== -1) {
          const updates: Partial<DocumentItem> = {};
          if (data.status) updates.status = data.status;
          if (data.deadline) updates.deadline = data.deadline;

          projects[projectIndex].documents[docIndex] = {
            ...projects[projectIndex].documents[docIndex],
            ...updates,
          };
          updatedDocs.push(projects[projectIndex].documents[docIndex]);
          updatedCount++;
        }
      });

      projects[projectIndex].updatedAt = new Date().toISOString();

      if (data.status) {
        addActivity(projects[projectIndex], {
          type: 'document_status_changed',
          description: `批量更新 ${updatedCount} 项材料状态为「${DOCUMENT_STATUS_LABELS[data.status]}」`,
          actorName,
          actorRole,
          metadata: { count: updatedCount, status: data.status },
        });
      }
      if (data.deadline) {
        addActivity(projects[projectIndex], {
          type: 'document_deadline_set',
          description: `批量设置 ${updatedCount} 项材料截止日期为 ${data.deadline.split('T')[0]}`,
          actorName,
          actorRole,
          metadata: { count: updatedCount, deadline: data.deadline },
        });
      }

      FileStorageService.writeProjects(projects);
      return res.json({
        success: true,
        updatedCount,
        documents: updatedDocs,
        completionPercentage: calculateCompletion(projects[projectIndex]),
      });
    } catch (error) {
      console.error('Batch update documents error:', error);
      return res.status(500).json({ error: '批量操作失败，请稍后重试' });
    }
  }

  static async setCurrentVersion(req: Request, res: Response) {
    try {
      const { id, docId, versionId } = req.params;
      const actorName = req.body.actorName || '未知用户';
      const actorRole: 'client' | 'consultant' = req.body.actorRole || 'client';
      const projects = FileStorageService.readProjects();
      const projectIndex = projects.findIndex((p: Project) => p.id === id);

      if (projectIndex === -1) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const docIndex = projects[projectIndex].documents.findIndex(
        (d: DocumentItem) => d.id === docId
      );
      if (docIndex === -1) {
        return res.status(404).json({ error: '材料不存在' });
      }

      const targetVersion = projects[projectIndex].documents[docIndex].versions.find(
        (v: FileVersion) => v.id === versionId
      );
      if (!targetVersion) {
        return res.status(404).json({ error: '版本不存在' });
      }

      projects[projectIndex].documents[docIndex].currentVersion = targetVersion;
      projects[projectIndex].updatedAt = new Date().toISOString();

      const docName = projects[projectIndex].documents[docIndex].name;
      addActivity(projects[projectIndex], {
        type: 'version_restored',
        description: `${docName} 恢复至 V${targetVersion.version} 版本`,
        actorName,
        actorRole,
        metadata: { docId, versionId, version: targetVersion.version },
      });

      FileStorageService.writeProjects(projects);
      return res.json(projects[projectIndex].documents[docIndex]);
    } catch (error) {
      console.error('Set current version error:', error);
      return res.status(500).json({ error: '恢复版本失败，请稍后重试' });
    }
  }

  static async getActivities(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const projects = FileStorageService.readProjects();
      const project = projects.find((p: Project) => p.id === id);

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      const activities: Activity[] = (project as any).activities || [];
      const sorted = [...activities].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return res.json(sorted.slice(0, 50));
    } catch (error) {
      console.error('Get activities error:', error);
      return res.status(500).json({ error: '获取活动记录失败' });
    }
  }
}

function addActivity(project: Project, activity: Omit<Activity, 'id' | 'timestamp'>) {
  const newActivity: Activity = {
    ...activity,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  const proj = project as any;
  if (!proj.activities) {
    proj.activities = [];
  }
  proj.activities.unshift(newActivity);
  if (proj.activities.length > 200) {
    proj.activities = proj.activities.slice(0, 200);
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
