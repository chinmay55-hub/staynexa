import { describe, it, expect } from 'vitest';
import { realtimeSync } from '../services/realtimeSync';
import type { Order, HousekeepingTask } from '../types';
import type { RealtimeEventType } from '../services/realtimeSync';

const HOTEL = 'hotel-rt-dedupe';

function makeOrder(id: string, status: string, updatedAt?: string): Order {
  return { id, hotel_id: HOTEL, status, items: [], updated_at: updatedAt } as unknown as Order;
}

function makeTask(id: string, updatedAt: string): HousekeepingTask {
  return { id, hotel_id: HOTEL, status: 'IN_PROGRESS', updated_at: updatedAt } as unknown as HousekeepingTask;
}

function deliverFromOtherDevice(type: RealtimeEventType, payload: unknown) {
  realtimeSync.receive(type, payload);
}

describe('Realtime receive deduplication', () => {
  it('delivers a new order once when it arrives locally and from another device with different status casing', () => {
    const received: string[] = [];
    const unsub = realtimeSync.subscribe('NEW_ORDER', ({ order }) => received.push(order.id));

    realtimeSync.emit('NEW_ORDER', { order: makeOrder('order-rt-dedupe-1', 'PENDING') });
    deliverFromOtherDevice('NEW_ORDER', { order: makeOrder('order-rt-dedupe-1', 'pending') });

    expect(received).toEqual(['order-rt-dedupe-1']);
    unsub();
  });

  it('delivers each distinct status change for the same order', () => {
    const statuses: string[] = [];
    const unsub = realtimeSync.subscribe('ORDER_STATUS_CHANGED', ({ status }) => statuses.push(status));

    realtimeSync.emit('ORDER_STATUS_CHANGED', { orderId: 'order-rt-dedupe-2', status: 'PREPARING', order: makeOrder('order-rt-dedupe-2', 'PREPARING') });
    deliverFromOtherDevice('ORDER_STATUS_CHANGED', { orderId: 'order-rt-dedupe-2', status: 'READY', order: makeOrder('order-rt-dedupe-2', 'READY') });

    expect(statuses).toEqual(['PREPARING', 'READY']);
    unsub();
  });

  it('does not drop a repeated update to the same status when its timestamp changed', () => {
    const updates: string[] = [];
    const unsub = realtimeSync.subscribe('HOUSEKEEPING_TASK_UPDATED', ({ taskId }) => updates.push(taskId));

    realtimeSync.emit('HOUSEKEEPING_TASK_UPDATED', { taskId: 'task-rt-dedupe-1', task: makeTask('task-rt-dedupe-1', '2026-11-03T10:00:00Z') });
    deliverFromOtherDevice('HOUSEKEEPING_TASK_UPDATED', { taskId: 'task-rt-dedupe-1', task: makeTask('task-rt-dedupe-1', '2026-11-03T10:05:00Z') });

    expect(updates).toEqual(['task-rt-dedupe-1', 'task-rt-dedupe-1']);
    unsub();
  });
});
