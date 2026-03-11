import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications, markNotificationsRead } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Silently fail
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;

    fetchNotifications();

    const socket = connectSocket(token);

    const handleNotification = (data) => {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('new-request', handleNotification);
    socket.on('donor-response', handleNotification);
    socket.on('request-fulfilled', handleNotification);

    return () => {
      socket.off('new-request', handleNotification);
      socket.off('donor-response', handleNotification);
      socket.off('request-fulfilled', handleNotification);
      disconnectSocket();
    };
  }, [token, user, fetchNotifications]);

  const markAllRead = async () => {
    await markNotificationsRead({});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, fetchNotifications, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
