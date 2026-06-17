import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe2, FileText, Briefcase, Users, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { projectService, templateService } from '../services/api';
import {
  ApplicationType,
  APPLICATION_TYPE_LABELS,
  CreateProjectRequest,
} from '../../shared/types';

const COUNTRIES = ['加拿大', '美国', '澳大利亚', '新西兰', '英国'];

const APPLICATION_TYPES: { value: ApplicationType; label: string; icon: React.ReactNode }[] = [
  { value: 'work_visa', label: '工作签证', icon: <Briefcase size={24} /> },
  { value: 'permanent_residence', label: '永久居留', icon: <Users size={24} /> },
  { value: 'citizenship', label: '入籍', icon: <Globe2 size={24} /> },
];

export default function CreateProject() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [applicationType, setApplicationType] = useState<ApplicationType | ''>('');
  const [targetCountry, setTargetCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [templatePreview, setTemplatePreview] = useState<any[]>([]);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (applicationType && targetCountry) {
      loadTemplatePreview();
    } else {
      setTemplatePreview([]);
    }
  }, [applicationType, targetCountry]);

  const loadTemplatePreview = async () => {
    try {
      const templates = await templateService.getTemplates(applicationType, targetCountry);
      if (templates.length > 0) {
        setTemplatePreview(templates[0].documents);
      } else {
        setTemplatePreview([]);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const data: CreateProjectRequest = {
      name,
      applicationType: applicationType as ApplicationType,
      targetCountry,
      clientId: user.id,
      clientName: user.name,
      consultantId: user.consultantId,
    };

    setLoading(true);
    try {
      const project = await projectService.createProject(data);
      navigate(`/projects/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = step === 1 ? name.trim() : step === 2 ? applicationType : targetCountry;

  return (
    <div className="max-w-3xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-[#1e3a5f] transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        返回项目列表
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1
            className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            创建新移民项目
          </h1>
          <p className="text-slate-500 mt-1">完成以下步骤来创建您的移民申请项目</p>
        </div>

        <div className="flex items-center justify-center gap-4 py-6 px-6 bg-slate-50 border-b border-slate-100">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  step >= s
                    ? 'bg-[#1e3a5f] text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle2 size={20} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 transition-colors ${
                    step > s ? 'bg-[#d4a855]' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">项目名称</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：加拿大联邦技术移民申请"
                  className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none transition-all"
                />
              </label>
              <p className="text-sm text-slate-500">
                为您的移民项目起一个容易识别的名称，方便后续管理。
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <span className="text-sm font-medium text-slate-700 block">申请类型</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {APPLICATION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setApplicationType(type.value)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      applicationType === type.value
                        ? 'border-[#d4a855] bg-[#d4a855]/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        applicationType === type.value ? 'bg-[#d4a855] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {type.icon}
                    </div>
                    <h3 className="font-bold text-slate-800">{type.label}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {type.value === 'work_visa' && '临时工作许可申请'}
                      {type.value === 'permanent_residence' && '永久居民身份申请'}
                      {type.value === 'citizenship' && '公民身份入籍申请'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-sm font-medium text-slate-700 block mb-2">目标国家</span>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country}
                      onClick={() => setTargetCountry(country)}
                      className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                        targetCountry === country
                          ? 'border-[#d4a855] bg-[#d4a855]/5 text-[#1e3a5f]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>

              {templatePreview.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={20} className="text-[#d4a855]" />
                    <h3 className="font-medium text-slate-800">材料清单预览</h3>
                    <span className="text-sm text-slate-500">({templatePreview.length} 项材料)</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {templatePreview.map((doc, index) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg"
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 text-sm">{doc.name}</p>
                          <p className="text-xs text-slate-500">{doc.description}</p>
                        </div>
                        {doc.required ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                            必需
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                            可选
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一步
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || loading}
              className="px-6 py-2.5 bg-[#d4a855] text-white rounded-xl font-medium hover:bg-[#c49845] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  创建中...
                </>
              ) : (
                '创建项目'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
