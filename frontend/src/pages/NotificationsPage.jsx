import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, CheckCheck, Sparkles } from 'lucide-react';
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

  const displayNotifications = notifications;
  const unreadCount = displayNotifications.filter((n) => !n.is_read).length;

  const filteredNotifications = displayNotifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  return (
    <div className="space-y-5 max-w-[1000px] mx-auto pb-16 px-4 md:px-8 pt-3 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-[16px] border border-[#DDEBE2] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF7EF] text-[#237A52] flex items-center justify-center font-bold border border-[#D5EBDD]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#163A2C] tracking-tight">
                Notifications Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#237A52] text-white text-[10px] font-bold">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <p className="text-xs text-[#648274] font-normal">
              Stay updated on status updates and resolution progress.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-civic-secondary text-xs py-2 px-3 self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2.5 rounded-[16px] border border-[#DDEBE2] flex items-center gap-2 shadow-xs">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-[#237A52] text-white shadow-xs'
              : 'bg-[#EEF6F1] text-[#237A52] hover:bg-[#EAF7EF]'
          }`}
        >
          All Notifications ({displayNotifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-[#237A52] text-white shadow-xs'
              : 'bg-[#EEF6F1] text-[#237A52] hover:bg-[#EAF7EF]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-[#8AA095] text-xs font-medium bg-white rounded-[16px] border border-[#DDEBE2]">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-[#8AA095] text-xs font-medium bg-white rounded-[16px] border border-[#DDEBE2]">
            No notifications available.
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkAsRead(n.id)}
              className={`p-4 rounded-[16px] border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                n.is_read
                  ? 'bg-white border-[#DDEBE2] shadow-xs'
                  : 'bg-[#EAF7EF] border-[#D5EBDD] shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  n.type === 'resolved'
                    ? 'bg-[#EAF7EF] text-[#2D8A5B] border border-[#D5EBDD]'
                    : n.type === 'verification'
                    ? 'bg-[#F1FAF4] text-[#237A52] border border-[#DDEBE2]'
                    : 'bg-[#F1FAF4] text-[#237A52] border border-[#DDEBE2]'
                }`}>
                  {n.type === 'resolved' ? (
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  ) : n.type === 'verification' ? (
                    <Sparkles className="w-4.5 h-4.5" />
                  ) : (
                    <Bell className="w-4.5 h-4.5" />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs md:text-sm text-[#163A2C] truncate">
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#237A52] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#648274] font-normal leading-relaxed">
                    {n.message}
                  </p>
                  <div className="text-[10px] text-[#8AA095] font-medium pt-0.5">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {!n.is_read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(n.id);
                  }}
                  className="text-[11px] font-semibold text-[#237A52] hover:underline shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default NotificationsPage;
