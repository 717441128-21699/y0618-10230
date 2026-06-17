import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { templateService } from '../services/api';
import {
  ApplicationType,
  ApplicationTemplate,
  DocumentTemplate,
  DocumentCategory,
  APPLICATION_TYPE_LABELS,
  DOCUMENT_CATEGORY_LABELS,
} from '../../shared/types';

const COUNTRIES = ['加拿大', '美国', '澳大利亚', '新西兰', '英国'];

const CATEGORIES: DocumentCategory[] = ['identity', 'education', 'work', 'finance', 'health', 'other'];

export default function TemplateSettings() {
  const [templates, setTemplates] = useState<ApplicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<{
    type: ApplicationType;
    country: string;
    documents: DocumentTemplate[];
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (template: ApplicationTemplate) => {
    setEditingTemplate({
      type: template.type,
      country: template.country,
      documents: JSON.parse(JSON.stringify(template.documents)),
    });
  };

  const startCreating = () => {
    setEditingTemplate({
      type: 'work_visa',
      country: '加拿大',
      documents: [],
    });
  };

  const addDocument = () => {
    if (!editingTemplate) return;
    const newDoc: DocumentTemplate = {
      id: `new_${Date.now()}`,
      name: '',
      category: 'identity',
      description: '',
      required: true,
    };
    setEditingTemplate({
      ...editingTemplate,
      documents: [...editingTemplate.documents, newDoc],
    });
  };

  const updateDocument = (id: string, field: keyof DocumentTemplate, value: any) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      documents: editingTemplate.documents.map((doc) =>
        doc.id === id ? { ...doc, [field]: value } : doc
      ),
    });
  };

  const removeDocument = (id: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      documents: editingTemplate.documents.filter((doc) => doc.id !== id),
    });
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch(`/api/templates/${editingTemplate.type}/${editingTemplate.country}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingTemplate.type,
          country: editingTemplate.country,
          documents: editingTemplate.documents.filter((d) => d.name.trim()),
        }),
      });

      if (response.ok) {
        setEditingTemplate(null);
        loadTemplates();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.country]) acc[template.country] = [];
    acc[template.country].push(template);
    return acc;
  }, {} as Record<string, ApplicationTemplate[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#d4a855] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-[#1e3a5f] transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        返回项目列表
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            材料清单模板管理
          </h1>
          <p className="text-slate-500 mt-1">为不同申请类型和国家定制标准材料清单</p>
        </div>
        {!editingTemplate && (
          <button
            onClick={startCreating}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#2d4a6f] transition-colors"
          >
            <Plus size={20} />
            新建模板
          </button>
        )}
      </div>

      {editingTemplate ? (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-[#d4a855]" />
              <h2 className="text-lg font-bold text-slate-800">
                {templates.some((t) => t.type === editingTemplate.type && t.country === editingTemplate.country)
                  ? '编辑模板'
                  : '新建模板'}
              </h2>
            </div>
            <button
              onClick={() => setEditingTemplate(null)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              取消
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">申请类型</label>
                <select
                  value={editingTemplate.type}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value as ApplicationType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none"
                >
                  {Object.entries(APPLICATION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">目标国家</label>
                <select
                  value={editingTemplate.country}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, country: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">材料清单</h3>
                <button
                  onClick={addDocument}
                  className="flex items-center gap-1 text-sm text-[#1e3a5f] hover:text-[#d4a855] font-medium"
                >
                  <Plus size={16} />
                  添加材料
                </button>
              </div>

              {editingTemplate.documents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="mb-2">暂无材料项</p>
                  <p className="text-sm">点击上方"添加材料"按钮开始添加</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editingTemplate.documents.map((doc, index) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-slate-50 rounded-xl space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs flex items-center justify-center flex-shrink-0 mt-1">
                          {index + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-12 gap-3">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={doc.name}
                              onChange={(e) => updateDocument(doc.id, 'name', e.target.value)}
                              placeholder="材料名称"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm bg-white"
                            />
                          </div>
                          <div className="col-span-3">
                            <select
                              value={doc.category}
                              onChange={(e) => updateDocument(doc.id, 'category', e.target.value as DocumentCategory)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm bg-white"
                            >
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {DOCUMENT_CATEGORY_LABELS[cat]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-3 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`required_${doc.id}`}
                              checked={doc.required}
                              onChange={(e) => updateDocument(doc.id, 'required', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#d4a855]"
                            />
                            <label htmlFor={`required_${doc.id}`} className="text-sm text-slate-600">
                              必需材料
                            </label>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              onClick={() => removeDocument(doc.id)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div className="col-span-12">
                            <input
                              type="text"
                              value={doc.description}
                              onChange={(e) => updateDocument(doc.id, 'description', e.target.value)}
                              placeholder="材料描述说明（可选）"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none text-sm bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium"
              >
                取消
              </button>
              <button
                onClick={saveTemplate}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#d4a855] text-white rounded-xl font-medium hover:bg-[#c49845] transition-colors"
              >
                <Save size={18} />
                保存模板
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([country, countryTemplates]) => (
            <div key={country} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800">{country}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {countryTemplates.map((template) => (
                  <div
                    key={`${template.type}-${template.country}`}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                        <span className="text-lg">📋</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">
                          {APPLICATION_TYPE_LABELS[template.type]}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {template.documents.length} 项材料 · {template.documents.filter((d) => d.required).length} 项必需
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => startEditing(template)}
                      className="px-4 py-2 text-sm text-[#1e3a5f] hover:text-[#d4a855] font-medium"
                    >
                      编辑
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
