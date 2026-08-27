import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { notificationApi } from '../api/notificationApi';

const OfficerNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications();
      if (res?.success && res?.data) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.warn('[OFFICER PORTAL] Notification fetch warning:', err);
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
      console.warn('Mark read error:', err);
    }
  };

  const displayList = notifications;

  return (
    <div className="bg-[#F0F8F5] min-h-screen space-y-6 max-w-[1000px] mx-auto pb-12 select-none">
      <div className="flex items-center justify-between bg-[#E6F4ED] p-6 rounded-2xl border border-[#B8E0CB] shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1F5443] tracking-tight">
            Officer Notifications
          </h1>
          <p className="text-xs text-[#4A7365] font-medium mt-1">
            Real-time alerts for workorder assignments, SLA warnings, and escalations.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-4 py-2 rounded-xl border border-[#B8E0CB] hover:border-[#349670] text-xs font-bold text-white bg-[#349670] hover:bg-[#2B8260] flex items-center gap-1.5 transition-all shadow-2xs"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="bg-[#E6F4ED] rounded-2xl border border-[#B8E0CB] shadow-xs divide-y divide-[#B8E0CB]/60 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-[#4A7365]">Loading notifications...</div>
        ) : displayList.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-[#4A7365]">No notifications found.</div>
        ) : (
          displayList.map((item) => (
            <div
              key={item.id}
              className={`p-5 flex items-start gap-4 transition-colors ${
                !item.is_read ? 'bg-[#DCF0E6]' : 'bg-[#E6F4ED] hover:bg-[#CEEADA]'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                !item.is_read ? 'bg-[#349670] text-white' : 'bg-[#CEEADA] text-[#4A7365]'
              }`}>
                <Bell className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-extrabold text-[#1F5443] text-sm">{item.title}</h3>
                  <span className="text-[11px] font-mono text-[#75998C]">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-[#174437] font-medium mt-1 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OfficerNotificationsPage;
