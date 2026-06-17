import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe2,
  FileText,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileCheck,
  Send,
  Plus,
  Square,
  CheckSquare,
  ListTodo,
  History,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { projectService } from '../services/api';
import {
  Project,
  DocumentItem,
  SubmissionInfo,
  Milestone,
  DOCUMENT_STATUS_LABELS,
  DocumentStatus,
  Activity,
} from '../../shared/types';
import ProgressRing from '../components/ProgressRing';
import StatusBadge from '../components/StatusBadge';
import DocumentModal from '../components/DocumentModal';
import ActivityTimeline from '../components/ActivityTimeline';
import {
  formatDate,
  formatDateTime,
  getApplicationTypeLabel,
  getCategoryLabel,
  isDeadlineNear,
  isDeadlineOverdue,
  getDaysUntilDeadline,
} from '../utils/helpers';

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<(Project & { completionPercentage: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'progress'>('overview');
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchStatus, setBatchStatus] = useState<DocumentStatus | ''>('');
  const [batchDeadline, setBatchDeadline] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const { user } = useAuthStore();
  const toast = useToastStore();
  const navigate = useNavigate();
  const isConsultant = user?.role === 'consultant';

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    if (!id) return;
    try {
      const [data, activityData] = await Promise.all([
        projectService.getProject(id),
        projectService.getActivities(id).catch(() => []),
      ]);
      setProject(data);
      setActivities(activityData);
      const categories = new Set(data.documents.map((d) => d.category));
      setExpandedCategories(categories);
    } catch (error: any) {
      console.error('Failed to load project:', error);
      toast.error(error.message || '加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpdate = (updatedDoc: DocumentItem) => {
    if (!project) return;
    const updatedDocuments = project.documents.map((d) =>
      d.id === updatedDoc.id ? updatedDoc : d
    );
    const updatedProject = { ...project, documents: updatedDocuments };
    const requiredDocs = updatedDocuments.filter((d) => d.required);
    const completedDocs = requiredDocs.filter(
      (d) => d.status === 'submitted' || d.status === 'notarized'
    );
    updatedProject.completionPercentage = Math.round((completedDocs.length / requiredDocs.length) * 100);
    setProject(updatedProject);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleDocSelection = (docId: string) => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocIds(newSelected);
  };

  const toggleCategorySelectAll = (docs: DocumentItem[]) => {
    const newSelected = new Set(selectedDocIds);
    const allSelected = docs.every((d) => newSelected.has(d.id));
    if (allSelected) {
      docs.forEach((d) => newSelected.delete(d.id));
    } else {
      docs.forEach((d) => newSelected.add(d.id));
    }
    setSelectedDocIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
    setBatchStatus('');
    setBatchDeadline('');
    setShowBatchPanel(false);
  };

  const handleBatchUpdate = async () => {
    if (!project || selectedDocIds.size === 0) return;
    if (!batchStatus && !batchDeadline) {
      toast.warning('请选择要批量修改的内容');
      return;
    }

    setBatchLoading(true);
    try {
      const result = await projectService.batchUpdateDocuments(project.id, {
        documentIds: Array.from(selectedDocIds),
        ...(batchStatus ? { status: batchStatus } : {}),
        ...(batchDeadline ? { deadline: batchDeadline } : {}),
      });

      if (result.success) {
        const updatedDocMap = new Map(result.documents.map((d) => [d.id, d]));
        const updatedDocuments = project.documents.map((d) =>
          updatedDocMap.has(d.id) ? updatedDocMap.get(d.id)! : d
        );
        setProject({
          ...project,
          documents: updatedDocuments,
          completionPercentage: result.completionPercentage,
        });
        toast.success(`已成功更新 ${result.updatedCount} 项材料`);
        clearSelection();
      }
    } catch (error: any) {
      console.error('Batch update failed:', error);
      toast.error(error.message || '批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const groupedDocuments = project?.documents.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, DocumentItem[]>) || {};

  const getUpcomingDeadlines = () => {
    if (!project) return [];
    return project.documents
      .filter(
        (doc) =>
          doc.required &&
          doc.status !== 'submitted' &&
          doc.status !== 'notarized' &&
          doc.deadline &&
          (isDeadlineNear(doc.deadline) || isDeadlineOverdue(doc.deadline))
      )
      .sort((a, b) => {
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 5);
  };

  const getUrgentMilestones = () => {
    if (!project) return [];
    return project.milestones
      .filter(
        (m) =>
          !m.completed &&
          m.reminder &&
          m.date &&
          (isDeadlineNear(m.date) || isDeadlineOverdue(m.date))
      )
      .sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#d4a855] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-20 text-slate-500">项目不存在</div>;
  }

  const upcomingDeadlines = getUpcomingDeadlines();
  const urgentMilestones = getUrgentMilestones();

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-slate-500 hover:text-[#1e3a5f] transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        返回项目列表
      </button>

      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-6 lg:p-8 text-white mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full">
                {getApplicationTypeLabel(project.applicationType)}
              </span>
              {project.submission.submitted && (
                <span className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
                  已递交
                </span>
              )}
            </div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/70">
              <div className="flex items-center gap-1">
                <Globe2 size={16} />
                {project.targetCountry}
              </div>
              <div className="flex items-center gap-1">
                <Users size={16} />
                {project.clientName}
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                创建于 {formatDate(project.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <ProgressRing
              percentage={project.completionPercentage}
              size={100}
              strokeWidth={8}
              color="#d4a855"
              bgColor="rgba(255,255,255,0.2)"
            />
            <div className="text-right">
              <p className="text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                {project.completionPercentage}%
              </p>
              <p className="text-white/70">材料完成度</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { key: 'overview', label: '项目概览', icon: <FileText size={16} /> },
          { key: 'documents', label: '材料清单', icon: <FileCheck size={16} /> },
          { key: 'progress', label: '申请进度', icon: <Send size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-[#1e3a5f] border-[#d4a855]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([status, label]) => {
                const count = project.documents.filter((d) => d.status === status && d.required).length;
                const total = project.documents.filter((d) => d.required).length;
                return (
                  <div key={status} className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-sm">{label}</span>
                      <div className={`w-2 h-2 rounded-full bg-${status === 'pending' ? 'gray' : status === 'uploaded' ? 'blue' : status === 'notarization_pending' ? 'orange' : status === 'notarized' ? 'purple' : 'green'}-500`} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{count}</p>
                    <p className="text-xs text-slate-400">共 {total} 项必需材料</p>
                  </div>
                );
              })}
            </div>

            {(upcomingDeadlines.length > 0 || urgentMilestones.length > 0) && (
              <div className="space-y-4">
                {upcomingDeadlines.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                      <AlertTriangle size={20} className="text-orange-500" />
                      <h3 className="font-medium text-slate-800">即将到期的材料</h3>
                      <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        {upcomingDeadlines.length} 项
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {upcomingDeadlines.map((doc) => {
                        const days = getDaysUntilDeadline(doc.deadline);
                        const overdue = isDeadlineOverdue(doc.deadline);
                        return (
                          <div
                            key={doc.id}
                            className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <div>
                              <p className="font-medium text-slate-800">{doc.name}</p>
                              <p className="text-sm text-slate-500">{getCategoryLabel(doc.category)}</p>
                            </div>
                            <div className={`flex items-center gap-1 text-sm ${
                              overdue ? 'text-red-500' : 'text-orange-500'
                            }`}>
                              <Clock size={14} />
                              {overdue ? `已逾期 ${Math.abs(days!)} 天` : days === 0 ? '今天截止' : `还剩 ${days} 天`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {urgentMilestones.length > 0 && (
                  <div className="bg-white rounded-xl border-2 border-purple-100 overflow-hidden shadow-sm shadow-purple-50">
                    <div className="p-4 border-b border-purple-100 flex items-center gap-2 bg-purple-50/50">
                      <Calendar size={20} className="text-purple-500" />
                      <h3 className="font-medium text-slate-800">重要节点提醒</h3>
                      <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        {urgentMilestones.length} 项
                      </span>
                    </div>
                    <div className="divide-y divide-purple-50">
                      {urgentMilestones.map((milestone) => {
                        const days = getDaysUntilDeadline(milestone.date);
                        const overdue = isDeadlineOverdue(milestone.date);
                        return (
                          <div
                            key={milestone.id}
                            className="p-4 flex items-center justify-between hover:bg-purple-50/30 cursor-pointer"
                            onClick={() => setActiveTab('progress')}
                          >
                            <div>
                              <p className="font-medium text-slate-800 flex items-center gap-2">
                                {milestone.title}
                                {overdue && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-medium rounded">
                                    已逾期
                                  </span>
                                )}
                              </p>
                              {milestone.description && (
                                <p className="text-sm text-slate-500 mt-0.5">{milestone.description}</p>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 text-sm ${
                              overdue ? 'text-red-500' : 'text-purple-600'
                            }`}>
                              <Clock size={14} />
                              {overdue ? `逾期 ${Math.abs(days!)} 天` : days === 0 ? '今天' : `${days} 天后`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {project.submission.submitted && (
              <div className="bg-green-50 rounded-xl border border-green-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 mb-1">申请已递交</h3>
                    <div className="space-y-1 text-sm text-green-700">
                      {project.submission.submissionDate && (
                        <p>递交日期：{formatDate(project.submission.submissionDate)}</p>
                      )}
                      {project.submission.applicationNumber && (
                        <p>申请编号：{project.submission.applicationNumber}</p>
                      )}
                      {project.submission.authority && (
                        <p>受理机构：{project.submission.authority}</p>
                      )}
                      {project.submission.notes && (
                        <p>备注：{project.submission.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="font-medium text-slate-800 mb-4">材料分类进度</h3>
              <div className="space-y-4">
                {Object.entries(groupedDocuments).map(([category, docs]) => {
                  const requiredDocs = docs.filter((d) => d.required);
                  const completed = requiredDocs.filter(
                    (d) => d.status === 'submitted' || d.status === 'notarized'
                  ).length;
                  const percentage = requiredDocs.length > 0 ? Math.round((completed / requiredDocs.length) * 100) : 100;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">{getCategoryLabel(category as any)}</span>
                        <span className="font-medium text-slate-800">{percentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#d4a855] rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ActivityTimeline activities={activities} loading={loading} />
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {selectedDocIds.size > 0 && (
            <div className="bg-[#1e3a5f] rounded-xl p-4 text-white sticky top-0 z-10 shadow-lg animate-[fadeInDown_0.3s_ease-out]">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <ListTodo size={20} />
                  <span className="font-medium">已选择 {selectedDocIds.size} 项材料</span>
                </div>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {isConsultant && (
                    <button
                      onClick={() => {
                        setBatchStatus('submitted');
                        setShowBatchPanel(true);
                      }}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      批量标记已提交
                    </button>
                  )}
                  <button
                    onClick={() => setShowBatchPanel(!showBatchPanel)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {showBatchPanel ? '收起' : '更多操作'}
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                  >
                    取消选择
                  </button>
                </div>
              </div>

              {showBatchPanel && (
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-1 md:grid-cols-3 gap-4 items-end animate-[fadeIn_0.3s_ease-out]">
                  <div>
                    <label className="block text-sm text-white/80 mb-1">批量设置状态</label>
                    <select
                      value={batchStatus}
                      onChange={(e) => setBatchStatus(e.target.value as DocumentStatus | '')}
                      className="w-full px-3 py-2 rounded-lg text-slate-800 text-sm outline-none"
                    >
                      <option value="">不修改</option>
                      {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white/80 mb-1">批量设置截止日期</label>
                    <input
                      type="date"
                      value={batchDeadline}
                      onChange={(e) => setBatchDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-slate-800 text-sm outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBatchUpdate}
                      disabled={batchLoading || (!batchStatus && !batchDeadline)}
                      className="flex-1 px-4 py-2 bg-[#d4a855] hover:bg-[#c49845] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {batchLoading ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />处理中...</>
                      ) : (
                        '应用修改'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {Object.entries(groupedDocuments).map(([category, docs]) => {
            const isExpanded = expandedCategories.has(category);
            const requiredDocs = docs.filter((d) => d.required);
            const completed = requiredDocs.filter(
              (d) => d.status === 'submitted' || d.status === 'notarized'
            ).length;
            const allSelected = docs.every((d) => selectedDocIds.has(d.id));
            const someSelected = docs.some((d) => selectedDocIds.has(d.id));

            return (
              <div key={category} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center transition-transform hover:bg-[#1e3a5f]/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategorySelectAll(docs);
                      }}
                    >
                      {allSelected ? (
                        <CheckSquare size={16} className="text-[#1e3a5f]" />
                      ) : someSelected ? (
                        <CheckSquare size={16} className="text-[#d4a855]" />
                      ) : (
                        <Square size={16} />
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <Plus size={16} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-slate-800">{getCategoryLabel(category as any)}</h3>
                      <p className="text-sm text-slate-500">
                        {completed} / {requiredDocs.length} 项必需材料完成
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d4a855] rounded-full transition-all"
                        style={{ width: requiredDocs.length > 0 ? `${(completed / requiredDocs.length) * 100}%` : '100%' }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-12 text-right">
                      {docs.length} 项
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="w-12 px-4 py-3"></th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">材料名称</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">状态</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">截止日期</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">版本</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">意见</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {docs.map((doc) => {
                          const days = getDaysUntilDeadline(doc.deadline);
                          const overdue = isDeadlineOverdue(doc.deadline);
                          const near = isDeadlineNear(doc.deadline);
                          const isSelected = selectedDocIds.has(doc.id);
                          return (
                            <tr
                              key={doc.id}
                              className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-[#d4a855]/5' : ''}`}
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleDocSelection(doc.id)}
                                  className="p-1 hover:bg-slate-100 rounded"
                                >
                                  {isSelected ? (
                                    <CheckSquare size={18} className="text-[#1e3a5f]" />
                                  ) : (
                                    <Square size={18} className="text-slate-400" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3" onClick={() => setSelectedDocument(doc)}>
                                <div className="flex items-center gap-2">
                                  {doc.required && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  )}
                                  <div>
                                    <p className="font-medium text-slate-800">{doc.name}</p>
                                    <p className="text-xs text-slate-500">{doc.description}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3" onClick={() => setSelectedDocument(doc)}>
                                <StatusBadge status={doc.status} size="sm" />
                              </td>
                              <td className="px-4 py-3" onClick={() => setSelectedDocument(doc)}>
                                {doc.deadline ? (
                                  <div className={`text-sm ${
                                    overdue ? 'text-red-500' : near ? 'text-orange-500' : 'text-slate-600'
                                  }`}>
                                    {formatDate(doc.deadline)}
                                    {overdue && <span className="ml-1 text-xs">（已逾期）</span>}
                                    {near && !overdue && <span className="ml-1 text-xs">（即将到期）</span>}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-sm">未设置</span>
                                )}
                              </td>
                              <td className="px-4 py-3" onClick={() => setSelectedDocument(doc)}>
                                {doc.versions.length > 0 ? (
                                  <span className="text-sm text-slate-600">
                                    V{doc.currentVersion?.version || doc.versions.length}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3" onClick={() => setSelectedDocument(doc)}>
                                {doc.comments.length > 0 ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                    doc.comments.some((c) => c.authorRole === 'consultant' && !c.resolved)
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {doc.comments.length} 条
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <SubmissionForm
              projectId={project.id}
              submission={project.submission}
              onUpdate={loadProject}
              isConsultant={user?.role === 'consultant'}
            />
            <MilestonesSection
              projectId={project.id}
              milestones={project.milestones}
              onUpdate={loadProject}
            />
          </div>
          <div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="font-medium text-slate-800 mb-4">材料准备进度</h3>
              <div className="space-y-3">
                {project.documents.filter((d) => d.required).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      doc.status === 'submitted' || doc.status === 'notarized'
                        ? 'border-green-500 bg-green-500'
                        : 'border-slate-200'
                    }`}>
                      {(doc.status === 'submitted' || doc.status === 'notarized') && (
                        <CheckCircle size={12} className="text-white" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      doc.status === 'submitted' || doc.status === 'notarized'
                        ? 'text-slate-500 line-through'
                        : 'text-slate-700'
                    }`}>
                      {doc.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDocument && user && (
        <DocumentModal
          document={selectedDocument}
          projectId={project.id}
          user={user}
          onClose={() => setSelectedDocument(null)}
          onUpdate={handleDocumentUpdate}
        />
      )}
    </div>
  );
}

function SubmissionForm({
  projectId,
  submission,
  onUpdate,
  isConsultant,
}: {
  projectId: string;
  submission: SubmissionInfo;
  onUpdate: () => void;
  isConsultant: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<SubmissionInfo>(submission);
  const [loading, setLoading] = useState(false);
  const toast = useToastStore();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await projectService.updateSubmission(projectId, formData);
      setEditing(false);
      toast.success('递交信息保存成功！');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update submission:', error);
      toast.error(error.message || '保存递交信息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send size={20} className="text-[#d4a855]" />
          <h3 className="font-medium text-slate-800">递交信息</h3>
        </div>
        {!editing && (isConsultant || !submission.submitted) && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-[#1e3a5f] hover:text-[#d4a855] font-medium"
          >
            编辑
          </button>
        )}
      </div>
      <div className="p-4">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="submitted"
                checked={formData.submitted}
                onChange={(e) => setFormData({ ...formData, submitted: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#d4a855]"
              />
              <label htmlFor="submitted" className="text-sm text-slate-700">
                申请已递交
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">递交日期</label>
                <input
                  type="date"
                  value={formData.submissionDate || ''}
                  onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">申请编号</label>
                <input
                  type="text"
                  value={formData.applicationNumber || ''}
                  onChange={(e) => setFormData({ ...formData, applicationNumber: e.target.value })}
                  placeholder="输入申请编号"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">受理机构</label>
              <input
                type="text"
                value={formData.authority || ''}
                onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                placeholder="例如：IRCC, USCIS"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">备注</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="添加备注信息"
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setFormData(submission);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${submission.submitted ? 'bg-green-500' : 'bg-slate-300'}`} />
              <span className={`font-medium ${submission.submitted ? 'text-green-700' : 'text-slate-500'}`}>
                {submission.submitted ? '已递交' : '未递交'}
              </span>
            </div>
            {submission.submitted && (
              <div className="pl-5 space-y-2 text-sm">
                {submission.submissionDate && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-20">递交日期：</span>
                    <span className="text-slate-800">{formatDate(submission.submissionDate)}</span>
                  </div>
                )}
                {submission.applicationNumber && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-20">申请编号：</span>
                    <span className="text-slate-800 font-mono">{submission.applicationNumber}</span>
                  </div>
                )}
                {submission.authority && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-20">受理机构：</span>
                    <span className="text-slate-800">{submission.authority}</span>
                  </div>
                )}
                {submission.notes && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-20">备注：</span>
                    <span className="text-slate-800">{submission.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MilestonesSection({
  projectId,
  milestones,
  onUpdate,
}: {
  projectId: string;
  milestones: Milestone[];
  onUpdate: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    reminder: true,
  });
  const toast = useToastStore();

  const handleAdd = async () => {
    if (!formData.title || !formData.date) return;
    setLoading(true);
    try {
      await projectService.addMilestone(projectId, formData);
      setFormData({ title: '', description: '', date: '', reminder: true });
      setShowAdd(false);
      toast.success('申请节点添加成功！');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to add milestone:', error);
      toast.error(error.message || '添加节点失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (milestone: Milestone) => {
    try {
      await projectService.updateMilestone(projectId, milestone.id, {
        completed: !milestone.completed,
      });
      toast.success(!milestone.completed ? `${milestone.title} 已标记完成！` : `${milestone.title} 已取消完成标记`);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update milestone:', error);
      toast.error(error.message || '更新节点状态失败');
    }
  };

  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-[#d4a855]" />
          <h3 className="font-medium text-slate-800">申请节点</h3>
          <span className="text-sm text-slate-500">({milestones.length})</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm text-[#1e3a5f] hover:text-[#d4a855] font-medium flex items-center gap-1"
        >
          <Plus size={16} />
          添加节点
        </button>
      </div>
      <div className="p-4">
        {showAdd && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="节点名称，如：面签通知"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
              />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
              />
            </div>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="详细描述（可选）"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={formData.reminder}
                  onChange={(e) => setFormData({ ...formData, reminder: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#d4a855]"
                />
                设置提醒
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={loading || !formData.title || !formData.date}
                  className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50"
                >
                  {loading ? '添加中...' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {sortedMilestones.length > 0 ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-0">
              {sortedMilestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className={`relative pl-10 pb-6 last:pb-0 ${
                    milestone.completed ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleComplete(milestone)}
                    className={`absolute left-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      milestone.completed
                        ? 'border-[#d4a855] bg-[#d4a855]'
                        : 'border-slate-300 bg-white hover:border-[#d4a855]'
                    }`}
                  >
                    {milestone.completed && <CheckCircle size={14} className="text-white" />}
                  </button>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-medium ${milestone.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                        {milestone.title}
                      </h4>
                      {milestone.description && (
                        <p className="text-sm text-slate-500 mt-1">{milestone.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{formatDate(milestone.date)}</p>
                      {milestone.reminder && (
                        <span className="text-xs text-orange-500 flex items-center gap-1 justify-end">
                          <Clock size={12} />
                          已设提醒
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无节点记录</p>
            <p className="text-xs">点击上方"添加节点"记录重要时间点</p>
          </div>
        )}
      </div>
    </div>
  );
}
