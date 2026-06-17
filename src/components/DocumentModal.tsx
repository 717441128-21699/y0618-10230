import { useState, useRef } from 'react';
import {
  X,
  Upload,
  Clock,
  MessageSquare,
  FileText,
  History,
  Send,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  DocumentItem,
  DocumentStatus,
  DOCUMENT_STATUS_LABELS,
  User,
} from '../../shared/types';
import StatusBadge from './StatusBadge';
import {
  formatDateTime,
  formatFileSize,
  getCategoryLabel,
  getDaysUntilDeadline,
  isDeadlineNear,
  isDeadlineOverdue,
} from '../utils/helpers';
import { projectService } from '../services/api';
import { useToastStore } from '../store/useToastStore';

interface DocumentModalProps {
  document: DocumentItem;
  projectId: string;
  user: Omit<User, 'password'>;
  onClose: () => void;
  onUpdate: (doc: DocumentItem) => void;
}

export default function DocumentModal({
  document,
  projectId,
  user,
  onClose,
  onUpdate,
}: DocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'comments'>('details');
  const [newStatus, setNewStatus] = useState<DocumentStatus>(document.status);
  const [newDeadline, setNewDeadline] = useState(document.deadline || '');
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deadlineDays = getDaysUntilDeadline(document.deadline);
  const toast = useToastStore();

  const handleStatusChange = async () => {
    try {
      const updated = await projectService.updateDocument(projectId, document.id, {
        status: newStatus,
        deadline: newDeadline || undefined,
      });
      onUpdate(updated);
      toast.success('材料状态更新成功！');
    } catch (error: any) {
      console.error('Failed to update document:', error);
      toast.error(error.message || '更新材料状态失败，请稍后重试');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const updated = await projectService.uploadDocument(
        projectId,
        document.id,
        file,
        user.id,
        user.name,
        uploadNote
      );
      onUpdate(updated);
      setUploadNote('');
      toast.success(`${file.name} 上传成功！`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      toast.error(error.message || '文件上传失败，请检查文件大小和格式');
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await projectService.addComment(projectId, document.id, {
        content: newComment,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
      });
      const updated = await projectService.getProject(projectId);
      const updatedDoc = updated.documents.find((d) => d.id === document.id);
      if (updatedDoc) {
        onUpdate(updatedDoc);
      }
      setNewComment('');
      toast.success(user.role === 'consultant' ? '意见已发送给客户' : '评论已添加');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error.message || '添加评论失败，请稍后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-[slideIn_0.3s_ease-out]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Playfair Display', serif" }}>
              {document.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{getCategoryLabel(document.category)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'text-[#1e3a5f] border-b-2 border-[#d4a855]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            详细信息
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'versions'
                ? 'text-[#1e3a5f] border-b-2 border-[#d4a855]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={16} className="inline mr-2" />
            版本历史 ({document.versions.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'comments'
                ? 'text-[#1e3a5f] border-b-2 border-[#d4a855]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare size={16} className="inline mr-2" />
            顾问意见 ({document.comments.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-medium text-slate-700 mb-2">材料描述</h3>
                <p className="text-slate-600 text-sm">{document.description}</p>
                {document.required && (
                  <span className="inline-flex items-center mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    <AlertTriangle size={12} className="mr-1" />
                    必需材料
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    当前状态
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as DocumentStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none"
                  >
                    {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar size={14} className="inline mr-1" />
                    截止日期
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none"
                    />
                    {deadlineDays !== null && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs ${
                        isDeadlineOverdue(document.deadline) ? 'text-red-500' :
                        isDeadlineNear(document.deadline) ? 'text-orange-500' : 'text-green-500'
                      }`}>
                        {isDeadlineOverdue(document.deadline) ? (
                          <><AlertTriangle size={12} /> 已逾期 {Math.abs(deadlineDays)} 天</>
                        ) : deadlineDays === 0 ? (
                          <><Clock size={12} /> 今天截止</>
                        ) : deadlineDays <= 7 ? (
                          <><Clock size={12} /> 还剩 {deadlineDays} 天</>
                        ) : (
                          <><CheckCircle size={12} /> 还剩 {deadlineDays} 天</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStatusChange}
                disabled={newStatus === document.status && newDeadline === document.deadline}
                className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存更改
              </button>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-medium text-slate-700 mb-4">上传新版本</h3>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#d4a855] transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload size={40} className="mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-600 font-medium">点击或拖拽文件到此处上传</p>
                  <p className="text-slate-400 text-sm mt-1">支持 PDF, JPG, PNG 等格式</p>
                </div>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="版本说明（可选）"
                  className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
                />
                {uploading && (
                  <div className="mt-3 flex items-center gap-2 text-[#d4a855]">
                    <div className="w-4 h-4 border-2 border-[#d4a855] border-t-transparent rounded-full animate-spin" />
                    上传中...
                  </div>
                )}
              </div>

              {document.currentVersion && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle size={16} />
                    当前版本
                  </h3>
                  <p className="text-green-700 text-sm">
                    {document.currentVersion.originalName}
                  </p>
                  <p className="text-green-600 text-xs mt-1">
                    {formatFileSize(document.currentVersion.fileSize)} · 上传于 {formatDateTime(document.currentVersion.uploadDate)} · 由 {document.currentVersion.uploaderName} 上传
                  </p>
                  <a
                    href={`/uploads/${document.currentVersion.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-green-700 hover:text-green-800 font-medium"
                  >
                    <FileText size={14} />
                    查看文件
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-4">
              {document.versions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <History size={48} className="mx-auto mb-3 opacity-50" />
                  <p>暂无版本历史</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                  {[...document.versions].reverse().map((version, index) => (
                    <div key={version.id} className="relative pl-10 pb-6 last:pb-0">
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-[#d4a855]' : 'bg-slate-200'
                      }`}>
                        <span className={`text-xs font-bold ${index === 0 ? 'text-white' : 'text-slate-600'}`}>
                          V{version.version}
                        </span>
                      </div>
                      <div className={`rounded-xl p-4 ${index === 0 ? 'bg-[#d4a855]/10 border border-[#d4a855]/30' : 'bg-slate-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">{version.originalName}</span>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-[#d4a855] text-white text-xs rounded-full">
                              当前版本
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {formatFileSize(version.fileSize)} · {formatDateTime(version.uploadDate)} · {version.uploaderName}
                        </p>
                        {version.note && (
                          <p className="text-sm text-slate-600 mt-2 bg-white/50 rounded-lg p-2">
                            {version.note}
                          </p>
                        )}
                        <a
                          href={`/uploads/${version.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-[#1e3a5f] hover:text-[#d4a855] font-medium"
                        >
                          <FileText size={14} />
                          下载此版本
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {document.comments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
                    <p>暂无意见</p>
                  </div>
                ) : (
                  document.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-xl p-4 ${
                        comment.authorRole === 'consultant'
                          ? 'bg-[#1e3a5f]/5 border border-[#1e3a5f]/20'
                          : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            comment.authorRole === 'consultant' ? 'bg-[#1e3a5f]' : 'bg-[#d4a855]'
                          }`}>
                            {comment.authorName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-800">{comment.authorName}</p>
                            <p className="text-xs text-slate-500">
                              {comment.authorRole === 'consultant' ? '移民顾问' : '客户'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{formatDateTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="输入您的意见..."
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-full focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="p-2.5 bg-[#1e3a5f] text-white rounded-full hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
