import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { CollaborationLayer } from '../components/dashboard/CollaborationLayer';
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

// Mock users for testing
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatar1.jpg',
    isActive: true,
    cursor: { x: 100, y: 150 },
    selection: 'resource-card-1'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: '/avatar2.jpg',
    isActive: true,
    cursor: { x: 200, y: 300 },
    selection: null
  }
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider>
    {children}
  </WebSocketProvider>
);

describe('CollaborationLayer', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
    
    // Mock getBoundingClientRect for cursor position calculations
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: vi.fn()
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Presence System', () => {
    it('should render active users list', () => {
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('2 users online')).toBeInTheDocument();
    });

    it('should show user avatars in presence indicator', () => {
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      const avatars = screen.getAllByRole('img');
      expect(avatars).toHaveLength(2);
      expect(avatars[0]).toHaveAttribute('alt', 'John Doe');
      expect(avatars[1]).toHaveAttribute('alt', 'Jane Smith');
    });

    it('should toggle presence panel when clicking user count', async () => {
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      const presenceButton = screen.getByText('2 users online');
      await user.click(presenceButton);

      // Panel should be visible with user details
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  describe('Cursor Tracking', () => {
    it('should render cursors for other users', () => {
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      // Should render cursors for both users
      const cursors = screen.getAllByTestId(/^cursor-/);
      expect(cursors).toHaveLength(2);
    });

    it('should position cursors correctly based on user data', () => {
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      const johnCursor = screen.getByTestId('cursor-1');
      const janeCursor = screen.getByTestId('cursor-2');

      expect(johnCursor).toHaveStyle({
        left: '100px',
        top: '150px'
      });

      expect(janeCursor).toHaveStyle({
        left: '200px',
        top: '300px'
      });
    });

    it('should emit cursor position on mouse move', async () => {
      const onCursorMove = vi.fn();
      
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={onCursorMove}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      const overlay = screen.getByTestId('collaboration-overlay');
      
      fireEvent.mouseMove(overlay, {
        clientX: 250,
        clientY: 400
      });

      expect(onCursorMove).toHaveBeenCalledWith(250, 400);
    });

    it('should show cursor labels with user names', () => {
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Selection Highlighting', () => {
    it('should highlight selected elements', () => {
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      // John has resource-card-1 selected
      const highlight = screen.getByTestId('selection-highlight-resource-card-1');
      expect(highlight).toBeInTheDocument();
      expect(highlight).toHaveClass('border-blue-500'); // John's color
    });

    it('should emit selection change when element is clicked', async () => {
      const onSelectionChange = vi.fn();
      
      render(
        <TestWrapper>
          <div data-resource-id="resource-123">
            <CollaborationLayer
              currentUserId="current-user"
              activeUsers={mockUsers}
              onCursorMove={vi.fn()}
              onSelectionChange={onSelectionChange}
            />
          </div>
        </TestWrapper>
      );

      const overlay = screen.getByTestId('collaboration-overlay');
      
      // Mock finding the clicked element
      const mockElement = { getAttribute: vi.fn(() => 'resource-123') };
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(mockElement as any);

      fireEvent.click(overlay, {
        clientX: 100,
        clientY: 100
      });

      expect(onSelectionChange).toHaveBeenCalledWith('resource-123', 'select');
    });

    it('should show selection indicators with user colors', () => {
      const usersWithSelections = [
        { ...mockUsers[0], selection: 'resource-card-1', color: '#3b82f6' },
        { ...mockUsers[1], selection: 'resource-card-2', color: '#10b981' }
      ];

      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={usersWithSelections}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      const highlight1 = screen.getByTestId('selection-highlight-resource-card-1');
      const highlight2 = screen.getByTestId('selection-highlight-resource-card-2');

      expect(highlight1).toHaveStyle({ borderColor: '#3b82f6' });
      expect(highlight2).toHaveStyle({ borderColor: '#10b981' });
    });
  });

  describe('Conflict Resolution', () => {
    it('should show conflict warning when multiple users select same element', () => {
      const conflictingUsers = [
        { ...mockUsers[0], selection: 'resource-card-1' },
        { ...mockUsers[1], selection: 'resource-card-1' }
      ];

      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={conflictingUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/Multiple users are editing/)).toBeInTheDocument();
      expect(screen.getByText(/John Doe, Jane Smith/)).toBeInTheDocument();
    });

    it('should show conflict resolution options', async () => {
      const conflictingUsers = [
        { ...mockUsers[0], selection: 'resource-card-1' },
        { ...mockUsers[1], selection: 'resource-card-1' }
      ];

      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={conflictingUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      const viewDetailsButton = screen.getByText('View Details');
      await user.click(viewDetailsButton);

      expect(screen.getByText('Take Control')).toBeInTheDocument();
      expect(screen.getByText('Request Access')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle incoming user presence updates', async () => {
      const { rerender } = render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      // Simulate new user joining
      const updatedUsers = [
        ...mockUsers,
        {
          id: '3',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          avatar: '/avatar3.jpg',
          isActive: true,
          cursor: { x: 300, y: 450 },
          selection: null
        }
      ];

      rerender(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={updatedUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('3 users online')).toBeInTheDocument();
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      });
    });

    it('should handle cursor position updates', async () => {
      const { rerender } = render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      // Update John's cursor position
      const updatedUsers = [
        { ...mockUsers[0], cursor: { x: 500, y: 600 } },
        mockUsers[1]
      ];

      rerender(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={updatedUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const johnCursor = screen.getByTestId('cursor-1');
        expect(johnCursor).toHaveStyle({
          left: '500px',
          top: '600px'
        });
      });
    });
  });

  describe('Performance', () => {
    it('should throttle cursor movement events', async () => {
      const onCursorMove = vi.fn();
      
      render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={onCursorMove}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      const overlay = screen.getByTestId('collaboration-overlay');
      
      // Fire multiple rapid mouse move events
      fireEvent.mouseMove(overlay, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(overlay, { clientX: 101, clientY: 101 });
      fireEvent.mouseMove(overlay, { clientX: 102, clientY: 102 });

      // Should be throttled to prevent excessive calls
      await waitFor(() => {
        expect(onCursorMove).toHaveBeenCalledTimes(1);
      });
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <CollaborationLayer
            currentUserId="current-user"
            activeUsers={mockUsers}
            onCursorMove={vi.fn()}
            onSelectionChange={vi.fn()}
          />
        </TestWrapper>
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('user-presence-updated');
      expect(mockSocket.off).toHaveBeenCalledWith('cursor-position-updated');
      expect(mockSocket.off).toHaveBeenCalledWith('selection-updated');
    });
  });
});