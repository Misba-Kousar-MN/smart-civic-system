import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Check } from 'lucide-react';
import { notificationApi } from '../api/notificationApi';
import { useRealtime } from '../context/RealtimeContext';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const { lastEvent } = useRealtime();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ limit: 10 });
      if (res?.success && res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.warn('[NOTIF] Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // React to Supabase Realtime notifications events
  useEffect(() => {
    if (lastEvent && lastEvent.table === 'notifications') {
      fetchNotifications();
    }
  }, [lastEvent]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NOTIF] Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NOTIF] Error marking all read:', err);
    }
  };

  return (
    <div className="dropdown-container">
      <button
        className="btn-icon relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="icon-md" />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="dropdown-menu notification-menu">
          <div className="dropdown-header flex-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <button
                className="btn-link text-xs flex-center gap-1"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="icon-xs" /> Mark all read
              </button>
            )}
          </div>

          <div className="dropdown-body max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                >
                  <div className="flex-between">
                    <span className="notif-title">{notif.title}</span>
                    {!notif.is_read && (
                      <button
                        className="btn-ghost-sm"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        title="Mark as read"
                      >
                        <Check className="icon-xs" />
                      </button>
                    )}
                  </div>
                  <p className="notif-msg">{notif.message}</p>
                  <span className="notif-time">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
