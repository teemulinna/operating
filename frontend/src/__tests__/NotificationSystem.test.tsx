import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSystem } from '../components/dashboard/NotificationSystem';
import { WebSocketProvider } from '../contexts/WebSocketContext';

// Mock WebSocket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
  id: 'test-socket-id'
};

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket),
  io: vi.fn(() => mockSocket)
}));

// Mock notifications
const mockNotifications = [
  {
    id: '1',
    type: 'resource_allocation',
    title: 'Resource Allocation Updated',
    message: 'John Doe\'s utilization has been updated to 85%',
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: 'medium',
    actions: [
      { label: 'View Details', action: 'view', data: { employeeId: '123' } }
    ]
  },
  {
    id: '2',
    type: 'conflict',
    title: 'Resource Conflict Detected',
    message: 'Multiple users are editing the same resource',
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    isRead: true,
    priority: 'high',
    actions: [
      { label: 'Resolve Conflict', action: 'resolve', data: { conflictId: '456' } },
      { label: 'Dismiss', action: 'dismiss', data: {} }
    ]
  },
  {
    id: '3',
    type: 'user_joined',
    title: 'User Joined',
    message: 'Jane Smith joined the collaboration session',
    timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    isRead: false,
    priority: 'low',
    actions: []
  }
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider>
    {children}
  </WebSocketProvider>
);

// Mock HTMLAudioElement
global.HTMLAudioElement = vi.fn().mockImplementation(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  load: vi.fn(),
  volume: 1,
  currentTime: 0,
  duration: 0,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));

describe('NotificationSystem', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
    localStorage.clear();
    
    // Mock Notification API
    global.Notification = vi.fn().mockImplementation((title, options) => ({
      title,
      body: options?.body,
      icon: options?.icon,
      close: vi.fn()
    })) as any;
    
    Object.defineProperty(global.Notification, 'permission', {
      value: 'granted',
      writable: true
    });
    
    global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification Center', () => {
    it('should render notification center toggle button', () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('notification-toggle')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Unread count
    });

    it('should show unread notification count badge', () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const badge = screen.getByText('2'); // 2 unread notifications
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should toggle notification panel when clicked', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      
      // Panel should not be visible initially
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();

      // Click to open
      await user.click(toggleButton);
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Click to close
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      });
    });

    it('should display notifications in the panel', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      await user.click(toggleButton);

      expect(screen.getByText('Resource Allocation Updated')).toBeInTheDocument();
      expect(screen.getByText('Resource Conflict Detected')).toBeInTheDocument();
      expect(screen.getByText('User Joined')).toBeInTheDocument();
    });

    it('should show notification timestamps', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      await user.click(toggleButton);

      expect(screen.getByText(/just now/i)).toBeInTheDocument();
      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
      expect(screen.getByText(/1 minute ago/i)).toBeInTheDocument();
    });

    it('should handle notification actions', async () => {
      const onNotificationAction = vi.fn();

      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={onNotificationAction}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      await user.click(toggleButton);

      const viewDetailsButton = screen.getByText('View Details');
      await user.click(viewDetailsButton);

      expect(onNotificationAction).toHaveBeenCalledWith('view', { employeeId: '123' }, '1');
    });

    it('should mark notifications as read', async () => {
      const onMarkAsRead = vi.fn();

      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={onMarkAsRead}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      await user.click(toggleButton);

      const unreadNotification = screen.getByTestId('notification-1');
      await user.click(unreadNotification);

      expect(onMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('should clear all notifications', async () => {
      const onClearAll = vi.fn();

      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={onClearAll}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      await user.click(toggleButton);

      const clearAllButton = screen.getByText('Clear All');
      await user.click(clearAllButton);

      expect(onClearAll).toHaveBeenCalled();
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast for new real-time notifications', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      // Simulate real-time notification
      const newNotification = {
        id: 'new-1',
        type: 'resource_allocation',
        title: 'New Resource Update',
        message: 'Resource allocation has been updated',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high'
      };

      // Trigger real-time notification event
      window.dispatchEvent(new CustomEvent('realtime-notification', {
        detail: newNotification
      }));

      await waitFor(() => {
        expect(screen.getByText('New Resource Update')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss toast notifications', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
            toastDuration={1000}
          />
        </TestWrapper>
      );

      const newNotification = {
        id: 'auto-dismiss',
        type: 'user_joined',
        title: 'Auto Dismiss Test',
        message: 'This should auto-dismiss',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'low'
      };

      window.dispatchEvent(new CustomEvent('realtime-notification', {
        detail: newNotification
      }));

      await waitFor(() => {
        expect(screen.getByText('Auto Dismiss Test')).toBeInTheDocument();
      });

      // Wait for auto-dismiss
      await waitFor(
        () => {
          expect(screen.queryByText('Auto Dismiss Test')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should handle toast dismissal manually', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const newNotification = {
        id: 'manual-dismiss',
        type: 'conflict',
        title: 'Manual Dismiss Test',
        message: 'This can be dismissed manually',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high'
      };

      window.dispatchEvent(new CustomEvent('realtime-notification', {
        detail: newNotification
      }));

      await waitFor(() => {
        expect(screen.getByText('Manual Dismiss Test')).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText(/dismiss/i);
      await user.click(dismissButton);

      expect(screen.queryByText('Manual Dismiss Test')).not.toBeInTheDocument();
    });
  });

  describe('Sound and Visual Alerts', () => {
    it('should play sound for high priority notifications', async () => {
      const audioPlaySpy = vi.fn();
      vi.mocked(global.HTMLAudioElement).mockImplementation(() => ({
        play: audioPlaySpy,
        pause: vi.fn(),
        load: vi.fn(),
        volume: 1,
        currentTime: 0,
        duration: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }) as any);

      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
            soundEnabled={true}
          />
        </TestWrapper>
      );

      const highPriorityNotification = {
        id: 'high-priority',
        type: 'conflict',
        title: 'High Priority Alert',
        message: 'Critical issue needs attention',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high'
      };

      window.dispatchEvent(new CustomEvent('realtime-notification', {
        detail: highPriorityNotification
      }));

      await waitFor(() => {
        expect(audioPlaySpy).toHaveBeenCalled();
      });
    });

    it('should not play sound when disabled', async () => {
      const audioPlaySpy = vi.fn();
      vi.mocked(global.HTMLAudioElement).mockImplementation(() => ({
        play: audioPlaySpy,
        pause: vi.fn(),
        load: vi.fn(),
        volume: 1,
        currentTime: 0,
        duration: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }) as any);

      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
            soundEnabled={false}
          />
        </TestWrapper>
      );

      const highPriorityNotification = {
        id: 'no-sound',
        type: 'conflict',
        title: 'No Sound Test',
        message: 'This should not play sound',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high'
      };

      window.dispatchEvent(new CustomEvent('realtime-notification', {
        detail: highPriorityNotification
      }));

      await waitFor(() => {
        expect(screen.getByText('No Sound Test')).toBeInTheDocument();
      });

      expect(audioPlaySpy).not.toHaveBeenCalled();
    });

    it('should show browser notifications when permitted', async () => {
      const NotificationConstructor = vi.mocked(global.Notification);

      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
            browserNotificationsEnabled={true}
          />
        </TestWrapper>
      );

      const browserNotification = {
        id: 'browser-notification',
        type: 'resource_allocation',
        title: 'Browser Notification Test',
        message: 'This should show as browser notification',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'medium'
      };

      window.dispatchEvent(new CustomEvent('realtime-notification', {
        detail: browserNotification
      }));

      await waitFor(() => {
        expect(NotificationConstructor).toHaveBeenCalledWith(
          'Browser Notification Test',
          expect.objectContaining({
            body: 'This should show as browser notification',
            icon: expect.any(String)
          })
        );
      });
    });
  });

  describe('Notification Preferences', () => {
    it('should render preferences panel', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      await user.click(toggleButton);

      const preferencesButton = screen.getByText('Preferences');
      await user.click(preferencesButton);

      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByLabelText('Sound Alerts')).toBeInTheDocument();
      expect(screen.getByLabelText('Browser Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText('Desktop Badges')).toBeInTheDocument();
    });

    it('should save preference changes to localStorage', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={mockNotifications}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('notification-toggle');
      await user.click(toggleButton);

      const preferencesButton = screen.getByText('Preferences');
      await user.click(preferencesButton);

      const soundToggle = screen.getByLabelText('Sound Alerts');
      await user.click(soundToggle);

      await waitFor(() => {
        const preferences = JSON.parse(localStorage.getItem('notification-preferences') || '{}');
        expect(preferences.soundEnabled).toBe(false);
      });
    });
  });

  describe('Real-time Integration', () => {
    it('should listen for WebSocket notification events', () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));
    });

    it('should handle different notification types with appropriate styling', async () => {
      render(
        <TestWrapper>
          <NotificationSystem
            notifications={[]}
            onNotificationAction={vi.fn()}
            onMarkAsRead={vi.fn()}
            onClearAll={vi.fn()}
          />
        </TestWrapper>
      );

      const notifications = [
        {
          id: '1',
          type: 'resource_allocation',
          title: 'Resource Update',
          message: 'Allocation updated',
          timestamp: new Date().toISOString(),
          priority: 'medium'
        },
        {
          id: '2',
          type: 'conflict',
          title: 'Conflict Alert',
          message: 'Resource conflict',
          timestamp: new Date().toISOString(),
          priority: 'high'
        },
        {
          id: '3',
          type: 'user_joined',
          title: 'User Joined',
          message: 'New user online',
          timestamp: new Date().toISOString(),
          priority: 'low'
        }
      ];

      for (const notification of notifications) {
        window.dispatchEvent(new CustomEvent('realtime-notification', {
          detail: notification
        }));
      }

      await waitFor(() => {
        expect(screen.getByText('Resource Update')).toBeInTheDocument();
        expect(screen.getByText('Conflict Alert')).toBeInTheDocument();
        expect(screen.getByText('User Joined')).toBeInTheDocument();
      });
    });
  });
});