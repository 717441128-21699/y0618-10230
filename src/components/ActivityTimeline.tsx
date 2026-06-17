import {
  Upload,
  FileCheck,
  Calendar,
  CalendarDays,
  MessageSquare,
  Send,
  History,
  ClipboardList,
} from 'lucide-react';
import { Activity } from '../../shared/types';
import { formatDateTime } from '../utils/helpers';

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'document_uploaded':
      return <Upload size={16} />;
    case 'document_status_changed':
      return <FileCheck size={16} />;
    case 'document_deadline_set':
      return <Calendar size={16} />;
    case 'comment_added':
      return <MessageSquare size={16} />;
    case 'submission_updated':
      return <Send size={16} />;
    case 'milestone_added':
      return <CalendarDays size={16} />;
    case 'milestone_completed':
      return <ClipboardList size={16} />;
    case 'version_restored':
      return <History size={16} />;
    default:
      return <ClipboardList size={16} />;
  }
}

function getActivityColor(type: Activity['type']) {
  switch (type) {
    case 'document_uploaded':
      return 'bg-blue-500';
    case 'document_status_changed':
      return 'bg-purple-500';
    case 'document_deadline_set':
      return 'bg-orange-500';
    case 'comment_added':
      return 'bg-[#d4a855]';
    case 'submission_updated':
      return 'bg-green-500';
    case 'milestone_added':
      return 'bg-indigo-500';
    case 'milestone_completed':
      return 'bg-emerald-500';
    case 'version_restored':
      return 'bg-pink-500';
    default:
      return 'bg-slate-500';
  }
}

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

export default function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="h-5 w-32 bg-slate-100 rounded animate-pulse mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 mb-4 last:mb-0">
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <History size={20} className="text-[#1e3a5f]" />
        <h3 className="font-medium text-slate-800">活动时间线</h3>
      </div>
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <History size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无活动记录</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-100" />
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative pl-10 pb-5 last:pb-0">
                <div
                  className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${getActivityColor(
                    activity.type
                  )} ${index === 0 ? 'ring-4 ring-offset-2 ring-offset-white ring-[#d4a855]/20' : ''}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <p className="text-sm text-slate-800 leading-relaxed">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      activity.actorRole === 'consultant'
                        ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                        : 'bg-[#d4a855]/10 text-[#d4a855]'
                    }`}>
                      {activity.actorRole === 'consultant' ? '移民顾问' : '客户'}
                    </span>
                    <span className="text-xs text-slate-400">{activity.actorName}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">{formatDateTime(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
