import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Globe2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../../shared/types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email, password, role });
      if (result.success) {
        navigate('/projects');
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('登录时发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-[#d4a855] blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/30 blur-3xl" />
        </div>
        <div className="relative z-10 text-white text-center max-w-md">
          <div className="w-20 h-20 bg-[#d4a855] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Globe2 size={40} className="text-[#1e3a5f]" />
          </div>
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            移民申请材料管理系统
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            系统化管理您的移民申请材料，追踪申请进度，与顾问高效协作，让移民之路更加顺畅。
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-[#d4a855]">500+</p>
              <p className="text-white/60 text-sm mt-1">成功案例</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#d4a855]">98%</p>
              <p className="text-white/60 text-sm mt-1">通过率</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#d4a855]">24/7</p>
              <p className="text-white/60 text-sm mt-1">顾问支持</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-16 h-16 bg-[#1e3a5f] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Globe2 size={32} className="text-[#d4a855]" />
            </div>
            <h1
              className="text-2xl font-bold text-[#1e3a5f]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              移民管理系统
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">欢迎回来</h2>
          <p className="text-slate-500 mb-8">请登录您的账户继续</p>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setRole('client')}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                role === 'client'
                  ? 'bg-[#1e3a5f] text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User size={16} className="inline mr-2" />
              客户登录
            </button>
            <button
              onClick={() => setRole('consultant')}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                role === 'consultant'
                  ? 'bg-[#d4a855] text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Lock size={16} className="inline mr-2" />
              顾问登录
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">邮箱地址</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">密码</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#d4a855] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#1e3a5f]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登录中...
                </span>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-slate-50 rounded-xl text-sm text-slate-500">
            <p className="font-medium text-slate-700 mb-2">演示账号：</p>
            <p>客户：client@example.com / 123456</p>
            <p>顾问：consultant@example.com / 123456</p>
          </div>
        </div>
      </div>
    </div>
  );
}
