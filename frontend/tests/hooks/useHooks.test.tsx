import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastManager } from '../../hooks/useToastManager';
import { useCrudOperations } from '../../hooks/useCrudOperations';
import { useModalManager } from '../../hooks/useModalManager';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useToastManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with no toast', () => {
    const { result } = renderHook(() => useToastManager());
    
    expect(result.current.toast).toBeNull();
    expect(result.current.isVisible).toBe(false);
  });

  it('should show toast with correct message and type', () => {
    const { result } = renderHook(() => useToastManager());
    
    act(() => {
      result.current.showToast('Test message', 'success');
    });

    expect(result.current.toast).toMatchObject({
      message: 'Test message',
      type: 'success',
      isVisible: true
    });
    expect(result.current.isVisible).toBe(true);
  });

  it('should auto-hide toast after duration', () => {
    const { result } = renderHook(() => useToastManager());
    
    act(() => {
      result.current.showToast('Test message', 'info', 1000);
    });

    expect(result.current.toast?.isVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toast?.isVisible).toBe(false);
  });

  it('should provide convenience methods for different toast types', () => {
    const { result } = renderHook(() => useToastManager());
    
    act(() => {
      result.current.showError('Error message');
    });
    expect(result.current.toast?.type).toBe('error');

    act(() => {
      result.current.showSuccess('Success message');
    });
    expect(result.current.toast?.type).toBe('success');

    act(() => {
      result.current.showWarning('Warning message');
    });
    expect(result.current.toast?.type).toBe('warning');

    act(() => {
      result.current.showInfo('Info message');
    });
    expect(result.current.toast?.type).toBe('info');
  });
});

describe('useCrudOperations', () => {
  interface TestItem {
    id: number;
    name: string;
  }

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCrudOperations<TestItem>());
    
    expect(result.current.state).toMatchObject({
      items: [],
      loading: false,
      operationLoading: false,
      error: null,
      lastFetch: null
    });
  });

  it('should fetch items successfully', async () => {
    const mockItems = [{ id: 1, name: 'Test Item' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockItems })
    });

    const { result } = renderHook(() => useCrudOperations<TestItem>());
    
    await act(async () => {
      await result.current.fetchItems('http://test.com/api/items');
    });

    expect(result.current.state.items).toEqual(mockItems);
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const onError = vi.fn();
    const { result } = renderHook(() => 
      useCrudOperations<TestItem>({ onError })
    );
    
    await act(async () => {
      await result.current.fetchItems('http://test.com/api/items');
    });

    expect(result.current.state.error).toBe('Network error');
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'fetch items');
  });

  it('should create item successfully', async () => {
    const newItem = { id: 2, name: 'New Item' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newItem })
    });

    const { result } = renderHook(() => useCrudOperations<TestItem>());
    
    let createdItem: TestItem;
    await act(async () => {
      createdItem = await result.current.createItem(
        'http://test.com/api/items', 
        { name: 'New Item' }
      );
    });

    expect(createdItem!).toEqual(newItem);
    expect(result.current.state.items).toContain(newItem);
  });

  it('should update item with optimistic updates', async () => {
    const initialItem = { id: 1, name: 'Original' };
    const updatedItem = { id: 1, name: 'Updated' };

    // Set initial items
    const { result } = renderHook(() => useCrudOperations<TestItem>());
    
    act(() => {
      result.current.setItems([initialItem]);
    });

    // Mock successful update
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedItem })
    });

    await act(async () => {
      await result.current.updateItem(
        'http://test.com/api/items', 
        1, 
        { name: 'Updated' }
      );
    });

    expect(result.current.state.items[0]).toEqual(updatedItem);
  });

  it('should delete item with optimistic updates', async () => {
    const initialItems = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' }
    ];

    const { result } = renderHook(() => useCrudOperations<TestItem>());
    
    act(() => {
      result.current.setItems(initialItems);
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    await act(async () => {
      await result.current.deleteItem('http://test.com/api/items', 1);
    });

    expect(result.current.state.items).toHaveLength(1);
    expect(result.current.state.items[0].id).toBe(2);
  });
});

describe('useModalManager', () => {
  interface TestItem {
    id: number;
    name: string;
  }

  it('should initialize with all modals closed', () => {
    const { result } = renderHook(() => useModalManager<TestItem>());
    
    expect(result.current.state).toMatchObject({
      isFormModalOpen: false,
      isDeleteDialogOpen: false,
      isViewModalOpen: false,
      editingItem: null,
      deletingItem: null,
      viewingItem: null,
      modalData: {}
    });
    expect(result.current.isAnyModalOpen).toBe(false);
  });

  it('should open and close form modal', () => {
    const { result } = renderHook(() => useModalManager<TestItem>());
    const testItem = { id: 1, name: 'Test Item' };
    
    act(() => {
      result.current.openFormModal(testItem);
    });

    expect(result.current.state.isFormModalOpen).toBe(true);
    expect(result.current.state.editingItem).toBe(testItem);
    expect(result.current.isAnyModalOpen).toBe(true);

    act(() => {
      result.current.closeFormModal();
    });

    expect(result.current.state.isFormModalOpen).toBe(false);
    expect(result.current.state.editingItem).toBeNull();
  });

  it('should open and close delete dialog', () => {
    const { result } = renderHook(() => useModalManager<TestItem>());
    const testItem = { id: 1, name: 'Test Item' };
    
    act(() => {
      result.current.openDeleteDialog(testItem);
    });

    expect(result.current.state.isDeleteDialogOpen).toBe(true);
    expect(result.current.state.deletingItem).toBe(testItem);

    act(() => {
      result.current.closeDeleteDialog();
    });

    expect(result.current.state.isDeleteDialogOpen).toBe(false);
    expect(result.current.state.deletingItem).toBeNull();
  });

  it('should open and close view modal', () => {
    const { result } = renderHook(() => useModalManager<TestItem>());
    const testItem = { id: 1, name: 'Test Item' };
    
    act(() => {
      result.current.openViewModal(testItem);
    });

    expect(result.current.state.isViewModalOpen).toBe(true);
    expect(result.current.state.viewingItem).toBe(testItem);

    act(() => {
      result.current.closeViewModal();
    });

    expect(result.current.state.isViewModalOpen).toBe(false);
    expect(result.current.state.viewingItem).toBeNull();
  });

  it('should close all modals', () => {
    const { result } = renderHook(() => useModalManager<TestItem>());
    const testItem = { id: 1, name: 'Test Item' };
    
    // Open all modals
    act(() => {
      result.current.openFormModal(testItem);
    });
    act(() => {
      result.current.openDeleteDialog(testItem);
    });
    act(() => {
      result.current.openViewModal(testItem);
    });

    // Close all at once
    act(() => {
      result.current.closeAllModals();
    });

    expect(result.current.state).toMatchObject({
      isFormModalOpen: false,
      isDeleteDialogOpen: false,
      isViewModalOpen: false,
      editingItem: null,
      deletingItem: null,
      viewingItem: null,
      modalData: {}
    });
  });

  it('should manage modal data', () => {
    const { result } = renderHook(() => useModalManager<TestItem>());
    
    act(() => {
      result.current.setModalData({ customField: 'value' });
    });

    expect(result.current.state.modalData).toEqual({ customField: 'value' });

    act(() => {
      result.current.setModalData({ anotherField: 'another value' });
    });

    expect(result.current.state.modalData).toEqual({
      customField: 'value',
      anotherField: 'another value'
    });
  });

  it('should ensure only one modal type is open at a time', () => {
    const { result } = renderHook(() => useModalManager<TestItem>());
    const testItem = { id: 1, name: 'Test Item' };
    
    // Open form modal
    act(() => {
      result.current.openFormModal(testItem);
    });
    expect(result.current.state.isFormModalOpen).toBe(true);

    // Open delete dialog - should close form modal
    act(() => {
      result.current.openDeleteDialog(testItem);
    });
    expect(result.current.state.isFormModalOpen).toBe(false);
    expect(result.current.state.isDeleteDialogOpen).toBe(true);

    // Open view modal - should close delete dialog
    act(() => {
      result.current.openViewModal(testItem);
    });
    expect(result.current.state.isDeleteDialogOpen).toBe(false);
    expect(result.current.state.isViewModalOpen).toBe(true);
  });
});