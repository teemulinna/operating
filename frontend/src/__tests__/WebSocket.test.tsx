import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { WebSocketProvider, useWebSocket } from '../contexts/WebSocketContext';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
  connected: false,
  id: 'test-socket-id'
};

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket),
  io: vi.fn(() => mockSocket)
}));

// Test component that uses the WebSocket hook
const TestComponent = () => {
  const { socket, isConnected, connectionStatus, emit } = useWebSocket();
  
  return (
    <div>
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="is-connected">{isConnected ? 'connected' : 'disconnected'}</div>
      <button 
        onClick={() => emit('test-event', { data: 'test' })}
        data-testid="emit-button"
      >
        Emit Test Event
      </button>
    </div>
  );
};

describe('WebSocket Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('WebSocketContext', () => {
    it('should provide WebSocket context to child components', () => {
      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('is-connected')).toBeInTheDocument();
    });

    it('should initialize with disconnected state', () => {
      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('connecting');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('disconnected');
    });

    it('should update connection status when socket connects', async () => {
      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // Simulate socket connection
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (connectHandler) connectHandler();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('connected');
      });
    });

    it('should handle socket disconnection', async () => {
      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // Simulate socket disconnection
      act(() => {
        mockSocket.connected = false;
        const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
        if (disconnectHandler) disconnectHandler('transport close');
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('disconnected');
      });
    });

    it('should implement exponential backoff on connection errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // Simulate connection error
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        if (errorHandler) errorHandler(new Error('Connection failed'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('error');
      });

      consoleSpy.mockRestore();
    });

    it('should emit events through the socket', () => {
      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      const emitButton = screen.getByTestId('emit-button');
      emitButton.click();

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
  });

  describe('useWebSocket hook', () => {
    it('should throw error when used outside WebSocketProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useWebSocket must be used within a WebSocketProvider');

      consoleError.mockRestore();
    });

    it('should provide socket instance and connection state', () => {
      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });

  describe('Real-time Events', () => {
    it('should handle resource allocation updates', async () => {
      const allocationUpdateHandler = vi.fn();
      
      const AllocationTestComponent = () => {
        const { socket } = useWebSocket();
        
        React.useEffect(() => {
          if (socket) {
            socket.on('resource-allocation-updated', allocationUpdateHandler);
            return () => socket.off('resource-allocation-updated', allocationUpdateHandler);
          }
        }, [socket]);

        return <div data-testid="allocation-listener">Listening for allocation updates</div>;
      };

      render(
        <WebSocketProvider>
          <AllocationTestComponent />
        </WebSocketProvider>
      );

      // Simulate incoming allocation update
      act(() => {
        const allocationHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'resource-allocation-updated'
        )?.[1];
        if (allocationHandler) {
          allocationHandler({
            employeeId: '123',
            utilizationRate: 0.8,
            timestamp: new Date().toISOString()
          });
        }
      });

      expect(allocationUpdateHandler).toHaveBeenCalledWith({
        employeeId: '123',
        utilizationRate: 0.8,
        timestamp: expect.any(String)
      });
    });

    it('should handle user presence updates', async () => {
      const presenceUpdateHandler = vi.fn();
      
      const PresenceTestComponent = () => {
        const { socket } = useWebSocket();
        
        React.useEffect(() => {
          if (socket) {
            socket.on('user-presence-updated', presenceUpdateHandler);
            return () => socket.off('user-presence-updated', presenceUpdateHandler);
          }
        }, [socket]);

        return <div data-testid="presence-listener">Listening for presence updates</div>;
      };

      render(
        <WebSocketProvider>
          <PresenceTestComponent />
        </WebSocketProvider>
      );

      // Simulate incoming presence update
      act(() => {
        const presenceHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'user-presence-updated'
        )?.[1];
        if (presenceHandler) {
          presenceHandler({
            userId: 'user-123',
            action: 'joined',
            location: '/dashboard/allocation',
            timestamp: new Date().toISOString()
          });
        }
      });

      expect(presenceUpdateHandler).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'joined',
        location: '/dashboard/allocation',
        timestamp: expect.any(String)
      });
    });
  });
});