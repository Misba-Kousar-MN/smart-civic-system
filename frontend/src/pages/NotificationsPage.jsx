import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, ShieldAlert, Sparkles, CheckCheck, Clock, Check } from 'lucide-react';
import { notificationApi } from '../api/notificationApi';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await notificationApi.getNotifications();
      if (res?.success && res?.data) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.warn('[NOTIFICATIONS] Mark all read error:', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.warn('[NOTIFICATIONS] Mark read error:', err);
    }
  };

  const sampleNotifications = [
    {
      id: 'n1',
      title: 'Report #RPT-2026-0158 status updated',
      message: 'Your report "Pothole on Main Road" is now in Progress.',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      is_read: false,
      type: 'status'
    },
    {
      id: 'n2',
      title: 'AI Analysis Complete',
      message: 'AI analysis for report #RPT-2026-0157 is complete (89% confidence).',
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      is_read: false,
      type: 'ai'
    },
    {
      id: 'n3',
      title: 'Report Resolved',
      message: 'Your report #RPT-2026-0156 has been resolved by Waste Management department.',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      type: 'resolved'
    },
    {
      id: 'n4',
      title: 'New Assignment',
      message: 'You have been assigned a new report by the officer.',
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      type: 'assign'
    },
    {
      id: 'n5',
      title: 'SLA Reminder',
      message: 'Report #RPT-2026-0155 has 1 day remaining before SLA deadline.',
      created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      type: 'sla'
    }
  ];

  const displayNotifications = notifications.length > 0 ? notifications : sampleNotifications;

  const unreadCount = displayNotifications.filter((n) => !n.is_read).length;

  const filteredNotifications = displayNotifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-12 select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500 text-white font-extrabold text-xs">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Stay updated with your reports and municipal alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-[#1769AA] bg-slate-50 flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'ALL'
              ? 'bg-[#1769AA] text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'UNREAD'
              ? 'bg-[#1769AA] text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications Cards Feed */}
      <div className="space-y-3">
        {filteredNotifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 bg-white ${
              !notif.is_read
                ? 'border-blue-300 bg-blue-50/30 shadow-2xs'
                : 'border-slate-200 opacity-90'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                !notif.is_read
                  ? 'bg-blue-50 text-[#1769AA] border-blue-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {notif.type === 'ai' ? (
                  <Sparkles className="w-5 h-5 text-amber-500" />
                ) : notif.type === 'resolved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : notif.type === 'sla' ? (
                  <Clock className="w-5 h-5 text-amber-600" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900">
                    {notif.title}
                  </h4>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  {notif.message}
                </p>
                <span className="text-[10px] text-slate-400 font-mono block mt-1.5">
                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {!notif.is_read && (
              <button
                onClick={() => handleMarkAsRead(notif.id)}
                className="p-1.5 text-slate-400 hover:text-[#1769AA] hover:bg-blue-50 rounded-lg transition-all"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default NotificationsPage;
