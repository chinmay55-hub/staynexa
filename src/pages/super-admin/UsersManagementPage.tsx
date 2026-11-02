import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Mail, Phone, Building, ShieldCheck, CheckCircle2, XCircle, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, Button, Input, Select, Badge, Modal } from '../../components/ui';
import { staffService, hotelService, reloadDemoStoreFromStorage } from '../../services/demoDataService';
import type { Profile, UserRole, Hotel, HotelMembership } from '../../types';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<Profile[]>(() => staffService.getAllProfiles());
  const [hotels, setHotels] = useState<Hotel[]>(() => hotelService.getAll());
  const [memberships, setMemberships] = useState<HotelMembership[]>(() => staffService.getAllMemberships());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [hotelFilter, setHotelFilter] = useState('ALL');

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staynexa_demo_store' || e.key === 'staynexa_global_sync') {
        reloadDemoStoreFromStorage();
        setUsers([...staffService.getAllProfiles()]);
        setHotels([...hotelService.getAll()]);
        setMemberships([...staffService.getAllMemberships()]);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // New user modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: 'password123',
    role: 'RECEPTION' as UserRole,
    hotel_id: 'hotel-001',
  });

  // Edit user modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    role: UserRole;
    hotel_id: string;
    is_active: boolean;
  } | null>(null);

  const handleOpenEdit = (user: Profile) => {
    const mem = memberships.find(m => m.user_id === user.user_id);
    setEditingUser({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      hotel_id: mem?.hotel_id || hotels[0]?.id || 'hotel-001',
      is_active: user.is_active,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    staffService.updateProfile(editingUser.user_id, {
      full_name: editingUser.full_name,
      email: editingUser.email,
      phone: editingUser.phone,
      role: editingUser.role,
      is_active: editingUser.is_active,
    });

    if (editingUser.role === 'SUPER_ADMIN') {
      staffService.deleteMembership(editingUser.user_id);
    } else if (editingUser.hotel_id) {
      staffService.updateMembership(editingUser.user_id, editingUser.hotel_id, editingUser.role);
    }

    setUsers([...staffService.getAllProfiles()]);
    setMemberships([...staffService.getAllMemberships()]);
    setIsEditOpen(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(u => {
    const mem = memberships.find(m => m.user_id === u.user_id);
    const matchesSearch = 
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesHotel = hotelFilter === 'ALL' || (mem && mem.hotel_id === hotelFilter) || (u.role === 'SUPER_ADMIN' && hotelFilter === 'PLATFORM');
    return matchesSearch && matchesRole && matchesHotel;
  });

  const handleToggleStatus = (userId: string) => {
    const userToToggle = users.find(u => u.id === userId || u.user_id === userId);
    if (!userToToggle) return;
    staffService.updateProfile(userToToggle.user_id, { is_active: !userToToggle.is_active });
    setUsers([...staffService.getAllProfiles()]);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.full_name || !newUser.email) return;
    const createdProfile = staffService.createProfile({
      full_name: newUser.full_name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      is_active: true,
    });
        if (newUser.role !== 'SUPER_ADMIN' && newUser.hotel_id) {
      staffService.createMembership({
        hotel_id: newUser.hotel_id,
        user_id: createdProfile.user_id,
        role: newUser.role,
        is_active: true,
      });
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const customCreds = JSON.parse(localStorage.getItem('staynexa_custom_credentials') || '{}');
        customCreds[newUser.email.toLowerCase().trim()] = {
          password: newUser.password || 'password123',
          userId: createdProfile.user_id,
          role: newUser.role,
          hotelId: newUser.hotel_id,
          fullName: newUser.full_name,
        };
        localStorage.setItem('staynexa_custom_credentials', JSON.stringify(customCreds));
      } catch {}
    }
    setUsers([...staffService.getAllProfiles()]);
    setMemberships([...staffService.getAllMemberships()]);
    setIsAddOpen(false);
    setNewUser({
      full_name: '',
      email: '',
      phone: '',
      password: 'password123',
      role: 'RECEPTION',
      hotel_id: hotels[0]?.id || 'hotel-001',
    });
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'HOTEL_ADMIN': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'HOTEL_MANAGER': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'RECEPTION': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'KITCHEN': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'HOUSEKEEPING': return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'MAINTENANCE': return 'bg-rose-100 text-rose-900 border-rose-300';
      default: return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Platform Users & Access</h1>
          <p className="text-stone-500 text-sm">Directory of all registered operators, hotel administrators, and staff members.</p>
        </div>
        <Button 
          variant="primary" 
          iconLeft={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddOpen(true)}
        >
          Add Operator / User
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4 text-stone-400" />}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Roles' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'HOTEL_ADMIN', label: 'Hotel Admin' },
                { value: 'RECEPTION', label: 'Reception' },
                { value: 'KITCHEN', label: 'Kitchen' },
                { value: 'HOUSEKEEPING', label: 'Housekeeping' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
              ]}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={hotelFilter}
              onChange={e => setHotelFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Properties' },
                { value: 'PLATFORM', label: 'Platform Only' },
                ...hotels.map(h => ({ value: h.id, label: h.name })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader title="Operator Directory" description={`Showing ${filteredUsers.length} user accounts`} />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Assigned Property</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map(u => {
                  const mem = memberships.find(m => m.user_id === u.user_id);
                  const hotel = hotels.find(h => h.id === mem?.hotel_id);

                  return (
                    <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1a2744] text-white flex items-center justify-center font-bold text-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-stone-900">{u.full_name}</div>
                            <div className="text-xs text-stone-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeVariant(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-stone-700">
                        {u.role === 'SUPER_ADMIN' ? (
                          <span className="font-semibold text-[#c9a84c]">Platform Global</span>
                        ) : (
                          <span>{hotel?.name || 'Unassigned'}</span>
                        )}
                      </td>
                      <td className="py-4 text-xs text-stone-600">
                        {u.phone || '—'}
                      </td>
                      <td className="py-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-400">
                            <XCircle className="w-3.5 h-3.5 text-stone-400" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            iconLeft={<Edit2 className="w-3.5 h-3.5 text-stone-600" />}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(u.id)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Platform User / Operator"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateUser}>Create User</Button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Deepak Verma"
            value={newUser.full_name}
            onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            required
            placeholder="e.g. deepak@hotel.com"
            value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
          />
          <Input
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={newUser.phone}
            onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
          />
          <Select
            label="Role"
            value={newUser.role}
            onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
            options={[
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
              { value: 'HOTEL_ADMIN', label: 'Hotel Admin' },
              { value: 'HOTEL_MANAGER', label: 'Hotel Manager' },
              { value: 'RECEPTION', label: 'Reception' },
              { value: 'KITCHEN', label: 'Kitchen' },
              { value: 'HOUSEKEEPING', label: 'Housekeeping' },
              { value: 'MAINTENANCE', label: 'Maintenance' },
            ]}
          />
          {newUser.role !== 'SUPER_ADMIN' && (
            <Select
              label="Assign to Hotel Property"
              value={newUser.hotel_id}
              onChange={e => setNewUser({ ...newUser, hotel_id: e.target.value })}
              options={hotels.map(h => ({ value: h.id, label: h.name }))}
            />
          )}
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingUser(null); }}
        title="Edit User Account & Property Assignment"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingUser(null); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        }
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={editingUser.full_name}
              onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              required
              value={editingUser.email}
              onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={editingUser.phone}
              onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
            />
            <Select
              label="System Role"
              value={editingUser.role}
              onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
              options={[
                { value: 'SUPER_ADMIN', label: 'Super Admin (Global Platform)' },
                { value: 'HOTEL_ADMIN', label: 'Hotel Admin' },
                { value: 'HOTEL_MANAGER', label: 'Hotel Manager' },
                { value: 'RECEPTION', label: 'Reception' },
                { value: 'KITCHEN', label: 'Kitchen' },
                { value: 'HOUSEKEEPING', label: 'Housekeeping' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
              ]}
            />
            {editingUser.role !== 'SUPER_ADMIN' ? (
              <Select
                label="Assigned Hotel Property"
                value={editingUser.hotel_id}
                onChange={e => setEditingUser({ ...editingUser, hotel_id: e.target.value })}
                options={hotels.map(h => ({ value: h.id, label: `${h.name} (${h.city || 'Property'})` }))}
              />
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                ⭐ Super Admins have platform-wide access across all hotels and system configurations.
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_checkbox"
                checked={editingUser.is_active}
                onChange={e => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-[#1a2744] border-stone-300 focus:ring-0"
              />
              <label htmlFor="is_active_checkbox" className="text-sm font-medium text-stone-700">
                Account Active (allowed to login)
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
