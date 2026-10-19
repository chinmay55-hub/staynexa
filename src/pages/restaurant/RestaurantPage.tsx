import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Search, 
  Clock, 
  Check, 
  X, 
  IndianRupee, 
  Sparkles,
  Layers,
  ChefHat
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { menuService, orderService, DEMO_MENU_CATEGORIES, DEMO_MENU_ITEMS } from '../../services/demoDataService';
import type { MenuCategory, MenuItem, Order, OrderStatus } from '../../types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Input, 
  Select, 
  OrderBadge, 
  Modal 
} from '../../components/ui';

export default function RestaurantPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [activeTab, setActiveTab] = useState<'MENU' | 'ORDERS'>('MENU');
  const [categories, setCategories] = useState(() => menuService.getCategories(hotelId));
  const [items, setItems] = useState(() => menuService.getItems(hotelId));
  const [orders, setOrders] = useState(() => orderService.getAll(hotelId));
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

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

  // Add Category Modal
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const filteredItems = items.filter(i => 
    selectedCategory === 'ALL' || i.category_id === selectedCategory
  );

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    orderService.updateStatus(orderId, status);
    setOrders([...orderService.getAll(hotelId)]);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;
    const item: MenuItem = {
      id: `mi-${Date.now()}`,
      hotel_id: hotelId,
      name: newItem.name,
      category_id: newItem.category_id,
      price: Number(newItem.price),
      tax_percent: 5,
      is_veg: newItem.is_veg,
      is_available: true,
      tags: ['special'],
      preparation_time_minutes: Number(newItem.preparation_time_minutes),
      description: newItem.description,
    };
    DEMO_MENU_ITEMS.push(item);
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
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    const cat: MenuCategory = {
      id: `mc-${Date.now()}`,
      hotel_id: hotelId,
      name: newCatName,
      sort_order: categories.length + 1,
      is_active: true,
    };
    DEMO_MENU_CATEGORIES.push(cat);
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
                onClick={() => setIsAddItemOpen(true)}
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
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      Available
                    </span>
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
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, 'ACCEPTED')}
                          >
                            Accept
                          </Button>
                        )}
                        {order.status === 'ACCEPTED' && (
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                          >
                            Start Preparing
                          </Button>
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
        onClose={() => setIsAddItemOpen(false)}
        title="Add New Dish to Menu"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateItem}>Add Dish</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <Input
            label="Dish Name"
            required
            placeholder="e.g. Tandoori Paneer Tikka"
            value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Menu Category"
              value={newItem.category_id}
              onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />
            <Input
              label="Price (₹)"
              type="number"
              value={newItem.price}
              onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Dietary Classification"
              value={newItem.is_veg ? 'VEG' : 'NON_VEG'}
              onChange={e => setNewItem({ ...newItem, is_veg: e.target.value === 'VEG' })}
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
            />
          </div>
          <Input
            label="Dish Description"
            placeholder="Key ingredients, spices, and preparation style"
            value={newItem.description}
            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
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
