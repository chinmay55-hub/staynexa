import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Clock, 
  ChefHat,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  menuService, 
  orderService, 
  demoDataService,
  reloadDemoStoreFromStorage 
} from '../../services/demoDataService';
import { isDemoMode, isSupabaseConfigured } from '../../lib/supabase';
import { realtimeSync } from '../../services/realtimeSync';
import type { MenuItem, OrderStatus } from '../../types';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  OrderBadge, 
  Modal,
  useToast
} from '../../components/ui';

export default function RestaurantPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [activeTab, setActiveTab] = useState<'MENU' | 'ORDERS'>('MENU');
  const [categories, setCategories] = useState(() => menuService.getCategories(hotelId));
  const [items, setItems] = useState(() => menuService.getItems(hotelId));
  const [orders, setOrders] = useState(() => orderService.getAll(hotelId));
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Mount sync with Supabase
  useEffect(() => {
    let isMounted = true;
    async function syncData() {
      if (!isDemoMode() && isSupabaseConfigured()) {
        try {
          await demoDataService.syncFromSupabase(hotelId);
        } catch (e) {
          console.warn('[RestaurantPage] Error syncing hotel data:', e);
        }
      }
      if (isMounted) {
        setCategories([...menuService.getCategories(hotelId)]);
        setItems([...menuService.getItems(hotelId)]);
        setOrders([...orderService.getAll(hotelId)]);
      }
    }
    syncData();
    return () => { isMounted = false; };
  }, [hotelId]);

  // Realtime & Cross-Tab Synchronization
  useEffect(() => {
    const refreshData = () => {
      reloadDemoStoreFromStorage();
      setCategories([...menuService.getCategories(hotelId)]);
      setItems([...menuService.getItems(hotelId)]);
      setOrders([...orderService.getAll(hotelId)]);
    };

    const unsubNewOrder = realtimeSync.subscribe('NEW_ORDER', refreshData);
    const unsubOrderStatus = realtimeSync.subscribe('ORDER_STATUS_CHANGED', refreshData);
    const unsubMenu = realtimeSync.subscribe('MENU_UPDATED', refreshData);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubNewOrder();
      unsubOrderStatus();
      unsubMenu();
    };
  }, [hotelId]);

  // Mutation and submission state
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Add Item Modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category_id: categories[0]?.id || '',
    price: 350,
    is_veg: true,
    preparation_time_minutes: 20,
    description: '',
  });

  // Edit Item Modal
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editItemForm, setEditItemForm] = useState({
    name: '',
    category_id: '',
    price: 350,
    is_veg: true,
    preparation_time_minutes: 20,
    description: '',
  });

  // Add Category Modal
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const filteredItems = items.filter(i => 
    selectedCategory === 'ALL' || i.category_id === selectedCategory
  );

  const toast = useToast();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleOpenAddItem = () => {
    setItemError(null);
    setNewItem({
      name: '',
      category_id: categories[0]?.id || '',
      price: 350,
      is_veg: true,
      preparation_time_minutes: 20,
      description: '',
    });
    setIsAddItemOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setItemError(null);
    setEditingItem(item);
    setEditItemForm({
      name: item.name,
      category_id: item.category_id,
      price: item.price,
      is_veg: item.is_veg,
      preparation_time_minutes: item.preparation_time_minutes,
      description: item.description || '',
    });
    setIsEditItemOpen(true);
  };

  const handleToggleAvailability = async (itemId: string) => {
    try {
      const updated = await menuService.toggleAvailabilityAsync(itemId);
      setItems([...menuService.getItems(hotelId)]);
      if (updated) {
        toast.success(
          updated.is_available ? 'Dish marked available' : 'Dish marked 86 (Sold out)',
          `${updated.name} availability updated`
        );
      }
    } catch (err: any) {
      toast.error('Failed to toggle availability', err?.message || 'Database write error');
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Are you sure you want to remove "${item.name}" from the active menu?`)) return;
    try {
      await menuService.deleteItemAsync(item.id);
      setItems([...menuService.getItems(hotelId)]);
      toast.success('Dish removed', `${item.name} archived from menu`);
    } catch (err: any) {
      toast.error('Failed to remove dish', err?.message || 'Database write error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);
    try {
      await orderService.updateStatusAsync(orderId, status);
      setOrders([...orderService.getAll(hotelId)]);
      toast.success('Order status updated', `Order #${orderId.slice(-6).toUpperCase()} set to ${status}`);
    } catch (err: any) {
      toast.error('Failed to update order status', err?.message || 'Database write rejected');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || isSubmittingItem) return;
    setItemError(null);
    setIsSubmittingItem(true);
    try {
      await menuService.createItemAsync({
        hotel_id: hotelId,
        name: newItem.name.trim(),
        category_id: newItem.category_id || categories[0]?.id || '',
        price: Number(newItem.price),
        tax_percent: 5,
        is_veg: newItem.is_veg,
        is_available: true,
        tags: ['special'],
        preparation_time_minutes: Number(newItem.preparation_time_minutes),
        description: newItem.description.trim(),
      });
      setItems([...menuService.getItems(hotelId)]);
      setIsAddItemOpen(false);
      setNewItem({
        name: '',
        category_id: categories[0]?.id || '',
        price: 350,
        is_veg: true,
        preparation_time_minutes: 20,
        description: '',
      });
      toast.success('Dish created', `${newItem.name} saved to menu`);
    } catch (err: any) {
      console.error('Failed to create dish:', err);
      const msg = err?.message || 'Database write rejected dish creation';
      setItemError(msg);
      toast.error('Dish creation failed', msg);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSubmittingItem) return;
    setItemError(null);
    setIsSubmittingItem(true);
    try {
      await menuService.updateItemAsync(editingItem.id, {
        name: editItemForm.name.trim(),
        category_id: editItemForm.category_id,
        price: Number(editItemForm.price),
        is_veg: editItemForm.is_veg,
        preparation_time_minutes: Number(editItemForm.preparation_time_minutes),
        description: editItemForm.description.trim(),
      });
      setItems([...menuService.getItems(hotelId)]);
      setIsEditItemOpen(false);
      setEditingItem(null);
      toast.success('Dish updated', `${editItemForm.name} updated successfully`);
    } catch (err: any) {
      console.error('Failed to update dish:', err);
      const msg = err?.message || 'Database write rejected dish update';
      setItemError(msg);
      toast.error('Dish update failed', msg);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    menuService.createCategory({
      hotel_id: hotelId,
      name: newCatName,
      sort_order: categories.length + 1,
      is_active: true,
    });
    setCategories([...menuService.getCategories(hotelId)]);
    setIsAddCatOpen(false);
    setNewCatName('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Restaurant & Food Operations</h1>
          <p className="text-stone-500 text-sm">Interactive menu management, dietary classifications, and live order tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'MENU' ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsAddCatOpen(true)}
              >
                Add Category
              </Button>
              <Button 
                variant="primary" 
                onClick={handleOpenAddItem}
                iconLeft={<Plus className="w-4 h-4" />}
              >
                Add Menu Item
              </Button>
            </>
          ) : (
            <Button 
              variant="secondary" 
              onClick={() => window.open('/kitchen', '_blank')}
              iconLeft={<ChefHat className="w-4 h-4" />}
            >
              Open Live KDS Screen
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('MENU')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'MENU' ? 'border-[#c9a84c] text-stone-900 font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Menu Management ({items.length} Dishes)
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'ORDERS' ? 'border-[#c9a84c] text-stone-900 font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Live Orders Ledger ({orders.length})
        </button>
      </div>

      {activeTab === 'MENU' ? (
        <div className="space-y-6">
          {/* Category Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory === 'ALL' ? 'bg-[#1a2744] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === c.id ? 'bg-[#c9a84c] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <Card key={item.id} className="border-stone-200 shadow-xs hover:shadow-sm transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full shrink-0 border ${
                          item.is_veg ? 'bg-emerald-600 border-emerald-700' : 'bg-rose-600 border-rose-700'
                        }`} />
                        <h3 className="font-bold text-sm text-stone-900">{item.name}</h3>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                    <span className="font-bold text-sm text-stone-900 font-display">
                      ₹{item.price}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {item.preparation_time_minutes} mins prep
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleAvailability(item.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer border ${
                          item.is_available !== false
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-stone-500 bg-stone-100 border-stone-300 hover:bg-stone-200'
                        }`}
                        title="Click to toggle item availability"
                      >
                        {item.is_available !== false ? 'Available' : 'Sold Out (86)'}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditItem(item)}
                        title="Edit Dish"
                        className="h-7 w-7 p-0 text-stone-500 hover:text-stone-900"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                        title="Archive / Remove Dish"
                        className="h-7 w-7 p-0 text-stone-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="shadow-xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Room / Table</th>
                    <th className="py-3 px-4">Ordered Items</th>
                    <th className="py-3 px-4">Bill Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Kitchen Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-stone-800">
                        #{order.id.slice(-6)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900 text-xs">
                        {order.room ? `Room ${order.room.number}` : 'Dine-In Restaurant'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-700">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-900 text-xs">
                        ₹{order.total}
                      </td>
                      <td className="py-3.5 px-4">
                        <OrderBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {order.status === 'PENDING' && (
                          <>
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleUpdateOrderStatus(order.id, 'ACCEPTED')}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50"
                              onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === 'ACCEPTED' && (
                          <>
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                            >
                              Start Preparing
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50"
                              onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === 'PREPARING' && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, 'READY')}
                          >
                            Mark Ready
                          </Button>
                        )}
                        {order.status === 'READY' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemOpen}
        onClose={() => !isSubmittingItem && setIsAddItemOpen(false)}
        title="Add New Dish to Menu"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)} disabled={isSubmittingItem}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateItem} disabled={isSubmittingItem}>
              {isSubmittingItem ? 'Saving...' : 'Add Dish'}
            </Button>
          </div>
        }
      >
        <form className="space-y-3" onSubmit={handleCreateItem}>
          {itemError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <span className="font-bold">Error:</span>
              <span>{itemError}</span>
            </div>
          )}
          <Input
            label="Dish Name"
            required
            placeholder="e.g. Tandoori Paneer Tikka"
            value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            disabled={isSubmittingItem}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Menu Category"
              value={newItem.category_id}
              onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              disabled={isSubmittingItem}
            />
            <Input
              label="Price (₹)"
              type="number"
              value={newItem.price}
              onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
              disabled={isSubmittingItem}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Dietary Classification"
              value={newItem.is_veg ? 'VEG' : 'NON_VEG'}
              onChange={e => setNewItem({ ...newItem, is_veg: e.target.value === 'VEG' })}
              disabled={isSubmittingItem}
              options={[
                { value: 'VEG', label: 'Vegetarian (Green)' },
                { value: 'NON_VEG', label: 'Non-Vegetarian (Red)' },
              ]}
            />
            <Input
              label="Prep Duration (Mins)"
              type="number"
              value={newItem.preparation_time_minutes}
              onChange={e => setNewItem({ ...newItem, preparation_time_minutes: Number(e.target.value) })}
              disabled={isSubmittingItem}
            />
          </div>
          <Input
            label="Dish Description"
            placeholder="Key ingredients, spices, and preparation style"
            value={newItem.description}
            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
            disabled={isSubmittingItem}
          />
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditItemOpen}
        onClose={() => !isSubmittingItem && setIsEditItemOpen(false)}
        title={editingItem ? `Edit Dish: ${editingItem.name}` : 'Edit Dish'}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsEditItemOpen(false)} disabled={isSubmittingItem}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateItem} disabled={isSubmittingItem}>
              {isSubmittingItem ? 'Updating...' : 'Update Dish'}
            </Button>
          </div>
        }
      >
        <form className="space-y-3" onSubmit={handleUpdateItem}>
          {itemError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <span className="font-bold">Error:</span>
              <span>{itemError}</span>
            </div>
          )}
          <Input
            label="Dish Name"
            required
            placeholder="e.g. Tandoori Paneer Tikka"
            value={editItemForm.name}
            onChange={e => setEditItemForm({ ...editItemForm, name: e.target.value })}
            disabled={isSubmittingItem}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Menu Category"
              value={editItemForm.category_id}
              onChange={e => setEditItemForm({ ...editItemForm, category_id: e.target.value })}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              disabled={isSubmittingItem}
            />
            <Input
              label="Price (₹)"
              type="number"
              value={editItemForm.price}
              onChange={e => setEditItemForm({ ...editItemForm, price: Number(e.target.value) })}
              disabled={isSubmittingItem}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Dietary Classification"
              value={editItemForm.is_veg ? 'VEG' : 'NON_VEG'}
              onChange={e => setEditItemForm({ ...editItemForm, is_veg: e.target.value === 'VEG' })}
              disabled={isSubmittingItem}
              options={[
                { value: 'VEG', label: 'Vegetarian (Green)' },
                { value: 'NON_VEG', label: 'Non-Vegetarian (Red)' },
              ]}
            />
            <Input
              label="Prep Duration (Mins)"
              type="number"
              value={editItemForm.preparation_time_minutes}
              onChange={e => setEditItemForm({ ...editItemForm, preparation_time_minutes: Number(e.target.value) })}
              disabled={isSubmittingItem}
            />
          </div>
          <Input
            label="Dish Description"
            placeholder="Key ingredients, spices, and preparation style"
            value={editItemForm.description}
            onChange={e => setEditItemForm({ ...editItemForm, description: e.target.value })}
            disabled={isSubmittingItem}
          />
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isAddCatOpen}
        onClose={() => setIsAddCatOpen(false)}
        title="Add Menu Category"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddCatOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateCategory}>Save Category</Button>
          </div>
        }
      >
        <Input
          label="Category Name"
          required
          placeholder="e.g. Clay Oven Breads & Roti"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
        />
      </Modal>
    </div>
  );
}
