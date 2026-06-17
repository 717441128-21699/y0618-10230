import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e3a5f] text-white transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <h1
            className={`text-xl font-bold font-serif ${!sidebarOpen && 'lg:hidden'}`}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            移民管理系统
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <NavLink
            to="/projects"
            icon={<LayoutDashboard size={20} />}
            label="项目列表"
            active={isActive('/projects')}
            collapsed={!sidebarOpen}
          />
          <NavLink
            to="/projects/new"
            icon={<FileText size={20} />}
            label="创建项目"
            active={location.pathname === '/projects/new'}
            collapsed={!sidebarOpen}
          />
          <NavLink
            to="/settings/templates"
            icon={<Settings size={20} />}
            label="模板管理"
            active={isActive('/settings/templates')}
            collapsed={!sidebarOpen}
            consultantOnly={true}
            userRole={user?.role}
          />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-[#d4a855] flex items-center justify-center text-[#1e3a5f] font-bold">
              <User size={20} />
            </div>
            <div className={!sidebarOpen ? 'lg:hidden' : ''}>
              <p className="font-medium text-sm">{user?.name}</p>
              <p className="text-xs text-white/60">
                {user?.role === 'consultant' ? '移民顾问' : '客户'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`mt-4 w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors ${
              !sidebarOpen && 'lg:justify-center'
            }`}
          >
            <LogOut size={20} />
            <span className={!sidebarOpen ? 'lg:hidden' : ''}>退出登录</span>
          </button>
        </div>
      </aside>

      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
  active,
  collapsed,
  consultantOnly,
  userRole,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  consultantOnly?: boolean;
  userRole?: string;
}) {
  if (consultantOnly && userRole !== 'consultant') return null;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        active
          ? 'bg-[#d4a855] text-[#1e3a5f] font-medium'
          : 'hover:bg-white/10 text-white/80 hover:text-white'
      } ${collapsed && 'lg:justify-center lg:px-0'}`}
    >
      {icon}
      <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
    </Link>
  );
}
