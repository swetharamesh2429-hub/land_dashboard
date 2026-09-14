import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Bell, BellRing, Check, CheckCheck, X, AlertOctagon, ClipboardList, HelpCircle, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { formatRelativeTime } from '../../utils/formatters';

export const NotificationDropdown = ({ role = 'OFFICER' }) => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const dropdownPanelRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for real-time notification socket push
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('NEW_NOTIFICATION', handleNewNotification);
    socket.on('DEMO_RESET', fetchNotifications);

    return () => {
      socket.off('NEW_NOTIFICATION', handleNewNotification);
      socket.off('DEMO_RESET', fetchNotifications);
    };
  }, [socket]);

  // Position calculation for React Portal
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  // Keep dropdown aligned on scroll or resize
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  // Click outside handler for portal dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        dropdownPanelRef.current &&
        !dropdownPanelRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markSingleAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'ALERT_DANGER':
      case 'ALERT_CONFIRMED':
        return <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />;
      case 'FIELD_TASK_ASSIGNED':
        return <ClipboardList className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'SOS_BEACON':
        return <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-400 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-850 transition-colors focus:outline-none cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-sky-400 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-red-600 text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center border-2 border-[#0a0a0a] shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel rendered via React Portal directly into body */}
      {isOpen &&
        typeof document !== 'undefined' &&
        ReactDOM.createPortal(
          <div
            ref={dropdownPanelRef}
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
            }}
            className="fixed w-80 sm:w-96 bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_16px_-4px_rgba(0,0,0,0.6),0_24px_32px_-8px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden text-xs animate-in fade-in zoom-in-95"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-[#0d0d0d] border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm tracking-tight">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono font-medium text-[10px] border border-sky-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-mono text-neutral-400 hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Feed List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-850">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 space-y-1.5">
                  <Bell className="w-6 h-6 mx-auto text-neutral-600 opacity-40" />
                  <p className="text-xs font-mono">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => !n.read && markSingleAsRead(n._id)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                      n.read
                        ? 'bg-transparent hover:bg-neutral-900/60 text-neutral-400'
                        : 'bg-neutral-900/70 hover:bg-neutral-900 text-neutral-200 border-l-2 border-sky-500'
                    }`}
                  >
                    <div className="mt-0.5">{getIconForType(n.type)}</div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-medium truncate text-xs ${n.read ? 'text-neutral-400' : 'text-neutral-100 font-semibold'}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-neutral-500 shrink-0 font-mono">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2 font-normal">
                        {n.message}
                      </p>
                      {n.villageName && (
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                          📍 {n.villageName}
                        </span>
                      )}
                    </div>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={(e) => markSingleAsRead(n._id, e)}
                        title="Mark as read"
                        className="text-neutral-500 hover:text-sky-400 p-1 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-[#080808] border-t border-neutral-800 text-center">
              <span className="text-[10px] font-mono text-neutral-500">
                Durable audit-backed notification feed
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
