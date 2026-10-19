import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, Clock, CalendarCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface NotificationMenuProps {
  className?: string;
}

interface NotificationItem {
  id: string;
  type: 'task' | 'revision';
  title: string;
  subtitle: string;
  href: string;
}

export const NotificationMenu: React.FC<NotificationMenuProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const items: NotificationItem[] = [];

        // 1. Fetch pending sprint tasks for today
        const { data: tasks } = await supabase
          .from('sprint_tasks')
          .select('id, title, is_completed')
          .eq('user_id', user.id)
          .eq('scheduled_date', today)
          .eq('is_completed', false)
          .limit(3);

        if (tasks && tasks.length > 0) {
          tasks.forEach((t) => {
            items.push({
              id: `task-${t.id}`,
              type: 'task',
              title: t.title || 'Scheduled Daily Problem',
              subtitle: "Today's sprint focus target",
              href: '/app/home',
            });
          });
        }

        // 2. Fetch spaced repetition due items
        const { data: revisions } = await supabase
          .from('user_revision_queue')
          .select('id, problem_id, next_review_at')
          .eq('user_id', user.id)
          .lte('next_review_at', new Date().toISOString())
          .limit(3);

        if (revisions && revisions.length > 0) {
          revisions.forEach((r) => {
            items.push({
              id: `rev-${r.id}`,
              type: 'revision',
              title: 'Spaced Repetition Review Due',
              subtitle: 'Algorithmic memory retention interval',
              href: '/app/revision',
            });
          });
        }

        if (isMounted) {
          setNotifications(items);
          setUnreadCount(items.length);
        }
      } catch (err) {
        console.warn('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Click outside and escape key dismiss handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.18] flex items-center justify-center text-white/60 hover:text-white transition-all select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d2ff]"
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-[#090D16]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] py-3 z-50 text-left animate-fadeIn">
          {/* Header */}
          <div className="px-4 pb-2 border-b border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-semibold text-white tracking-wide">Notifications</span>
            {unreadCount > 0 ? (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30">
                {unreadCount} pending
              </span>
            ) : (
              <span className="text-[10px] font-mono text-white/40">Caught up</span>
            )}
          </div>

          {/* List of Real Items or Clean Empty State */}
          <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#00d2ff]/10 border border-[#00d2ff]/20 text-[#00d2ff] flex items-center justify-center shrink-0 mt-0.5">
                    {item.type === 'task' ? (
                      <CalendarCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate group-hover:text-[#00d2ff] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-white/40 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))
            ) : (
              <div className="py-8 px-4 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400/80 mx-auto" />
                <p className="text-xs font-medium text-white/80">All caught up!</p>
                <p className="text-[11px] text-white/40">
                  No overdue review tasks or pending deadlines right now.
                </p>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {notifications.length > 0 && (
            <div className="pt-2 px-4 border-t border-white/[0.08] text-center">
              <Link
                to="/app/home"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-mono text-[#00d2ff] hover:underline"
              >
                View all scheduled tasks →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;
