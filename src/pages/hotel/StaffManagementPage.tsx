import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { staffService } from '../../services/demoDataService';
import { DEMO_MEMBERSHIPS } from '../../data/demo';
import type { Profile, UserRole, Department } from '../../types';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  Badge, 
  Modal 
} from '../../components/ui';

export default function StaffManagementPage() {
  const { user } = useAuth();
  const hotelId = user?.hotel_id || 'hotel-001';

  const [staffList, setStaffList] = useState<Profile[]>(() => staffService.getAll(hotelId));
  const [departments, setDepartments] = useState<Department[]>(() => staffService.getDepartments(hotelId));
  const [search, setSearch] = useState('');

  // Add Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'RECEPTION' as UserRole,
    department_id: departments[0]?.id || '',
  });

  // Add Dept Modal
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDept, setNewDept] = useState({
    name: '',
    code: '',
    description: '',
  });

  const filteredStaff = staffList.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone && s.phone.includes(search))
  );

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.full_name || !newStaff.email) return;

    const newProfile = staffService.createProfile({
      full_name: newStaff.full_name,
      email: newStaff.email,
      phone: newStaff.phone,
      role: newStaff.role,
      is_active: true,
    });

    staffService.createMembership({
      hotel_id: hotelId,
      user_id: newProfile.user_id,
      role: newStaff.role,
      department_id: newStaff.department_id,
      is_active: true,
    });

    setStaffList([...staffService.getAll(hotelId)]);
    setIsAddStaffOpen(false);
    setNewStaff({
      full_name: '',
      email: '',
      phone: '',
      role: 'RECEPTION',
      department_id: departments[0]?.id || '',
    });
  };

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.name) return;
    staffService.createDepartment({
      hotel_id: hotelId,
      name: newDept.name,
      code: newDept.code.toUpperCase() || newDept.name.slice(0, 2).toUpperCase(),
      description: newDept.description,
    });
    setDepartments([...staffService.getDepartments(hotelId)]);
    setIsAddDeptOpen(false);
    setNewDept({ name: '', code: '', description: '' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">Staff & Operational Teams</h1>
          <p className="text-stone-500 text-sm">Role-based access control, departmental assignments, and credentials.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsAddDeptOpen(true)}
            iconLeft={<Briefcase className="w-4 h-4" />}
          >
            Add Department
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setIsAddStaffOpen(true)}
            iconLeft={<Plus className="w-4 h-4" />}
          >
            Invite Staff Member
          </Button>
        </div>
      </div>

      {/* Departments overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {departments.map(dept => {
          return (
            <Card key={dept.id} className="border-stone-200">
              <CardContent className="p-3.5">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">{dept.code}</div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">{dept.name}</div>
                <div className="text-[11px] text-stone-500 mt-1 line-clamp-1">{dept.description || 'Active department'}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Staff Search */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <Input
            placeholder="Search staff by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4 text-stone-400" />}
          />
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-medium bg-stone-50/50">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStaff.map(staff => {
                  const membership = DEMO_MEMBERSHIPS.find(m => m.user_id === staff.user_id && m.hotel_id === hotelId);
                  const dept = departments.find(d => d.id === membership?.department_id);

                  return (
                    <tr key={staff.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{staff.full_name}</div>
                        <div className="text-xs text-stone-500">ID: #{staff.id.slice(-6)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-stone-800">{staff.email}</div>
                        <div className="text-stone-500">{staff.phone || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="secondary" className="font-mono text-xs font-semibold">
                          {staff.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-stone-700">
                        {dept?.name || 'General Operations'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button variant="outline" size="sm">
                          Edit Access
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Invite Hotel Staff Member"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateStaff}>Add Staff</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Ramesh Sharma"
            value={newStaff.full_name}
            onChange={e => setNewStaff({ ...newStaff, full_name: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            required
            placeholder="ramesh@hotel.com"
            value={newStaff.email}
            onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
          />
          <Input
            label="Phone Number"
            placeholder="+91 98765 00000"
            value={newStaff.phone}
            onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assigned Role"
              value={newStaff.role}
              onChange={e => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
              options={[
                { value: 'HOTEL_MANAGER', label: 'Hotel Manager' },
                { value: 'RECEPTION', label: 'Reception Front Desk' },
                { value: 'KITCHEN', label: 'Kitchen & Chef' },
                { value: 'HOUSEKEEPING', label: 'Housekeeping Staff' },
                { value: 'MAINTENANCE', label: 'Maintenance Technician' },
                { value: 'RESTAURANT_MANAGER', label: 'Restaurant Manager' },
              ]}
            />
            <Select
              label="Department"
              value={newStaff.department_id}
              onChange={e => setNewStaff({ ...newStaff, department_id: e.target.value })}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
          </div>
        </form>
      </Modal>

      {/* Add Department Modal */}
      <Modal
        isOpen={isAddDeptOpen}
        onClose={() => setIsAddDeptOpen(false)}
        title="Create Operational Department"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsAddDeptOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateDept}>Save Department</Button>
          </div>
        }
      >
        <form className="space-y-3">
          <Input
            label="Department Name"
            required
            placeholder="e.g. Security & Valet"
            value={newDept.name}
            onChange={e => setNewDept({ ...newDept, name: e.target.value })}
          />
          <Input
            label="Department Code"
            placeholder="e.g. SEC"
            value={newDept.code}
            onChange={e => setNewDept({ ...newDept, code: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Responsibilities and shift coverage"
            value={newDept.description}
            onChange={e => setNewDept({ ...newDept, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
