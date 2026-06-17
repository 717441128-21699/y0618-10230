import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Globe2, Clock, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { projectService } from '../services/api';
import { Project, APPLICATION_TYPE_LABELS } from '../../shared/types';
import ProgressRing from '../components/ProgressRing';
import {
  formatDate,
  getApplicationTypeLabel,
  isDeadlineNear,
  isDeadlineOverdue,
} from '../utils/helpers';

export default function ProjectList() {
  const [projects, setProjects] = useState<(Project & { completionPercentage: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    try {
      const data = await projectService.getProjects(user.id, user.role);
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgentDocuments = (project: Project) => {
    return project.documents.filter(
      (doc) =>
        doc.required &&
        doc.status !== 'submitted' &&
        doc.status !== 'notarized' &&
        (isDeadlineNear(doc.deadline) || isDeadlineOverdue(doc.deadline))
    ).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#d4a855] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            我的移民项目
          </h1>
          <p className="text-slate-500 mt-1">
            共 {projects.length} 个项目 · {user?.role === 'consultant' ? '顾问视图' : '客户视图'}
          </p>
        </div>
        <Link
          to="/projects/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#2d4a6f] hover:shadow-lg hover:shadow-[#1e3a5f]/20 transition-all"
        >
          <Plus size={20} />
          创建新项目
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">暂无项目</h3>
          <p className="text-slate-500 mb-6">创建您的第一个移民申请项目开始吧</p>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4a855] text-white rounded-xl font-medium hover:bg-[#c49845] transition-colors"
          >
            <Plus size={20} />
            创建项目
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => {
            const urgentCount = getUrgentDocuments(project);
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-[#1e3a5f]/5 hover:border-[#d4a855]/30 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-medium rounded-full">
                        {getApplicationTypeLabel(project.applicationType)}
                      </span>
                      {project.submission.submitted && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          已递交
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#1e3a5f] transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                      <Globe2 size={14} />
                      {project.targetCountry}
                    </div>
                  </div>
                  <ProgressRing percentage={project.completionPercentage} size={60} strokeWidth={6} />
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">客户</span>
                    <span className="font-medium text-slate-700">{project.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">创建时间</span>
                    <span className="font-medium text-slate-700">{formatDate(project.createdAt)}</span>
                  </div>
                  {urgentCount > 0 && (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg text-sm">
                      <AlertTriangle size={16} />
                      <span>{urgentCount} 项材料即将到期</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText size={16} />
                    {project.documents.filter((d) => d.status === 'submitted' || d.status === 'notarized').length}
                    <span className="text-slate-400">/</span>
                    {project.documents.length} 材料完成
                  </div>
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-[#d4a855] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
