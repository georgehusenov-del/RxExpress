import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users, Search, Filter, UserCheck, UserX, Trash2,
  Eye, MoreVertical, Mail, Phone, Calendar, Edit, FileText, Save, X, Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

const roleColors = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  pharmacy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  driver: 'bg-green-500/20 text-green-400 border-green-500/30',
  patient: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [pagination, setPagination] = useState({ skip: 0, limit: 20, total: 0 });
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    notes: ''
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        skip: pagination.skip,
        limit: pagination.limit,
      };
      if (roleFilter !== 'all') params.role = roleFilter;
      
      const response = await adminAPI.getUsers(params);
      setUsers(response.data.users || []);
      setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.skip, pagination.limit, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleActivateUser = async (userId) => {
    try {
      await adminAPI.activateUser(userId);
      toast.success('User activated successfully');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to activate user');
    }
  };

  const handleDeactivateUser = async (userId) => {
    try {
      await adminAPI.deactivateUser(userId);
      toast.success('User deactivated successfully');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to deactivate user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'patient',
      notes: user.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setEditLoading(true);
    try {
      await adminAPI.updateUser(selectedUser.id, editForm);
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
      toast.error(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-white">User Management</h3>
          <p className="text-sm text-slate-400">Manage all registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white w-64"
              data-testid="search-users-input"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white" data-testid="role-filter">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="pharmacy">Pharmacy</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="patient">Patient</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Role</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Notes</TableHead>
                <TableHead className="text-slate-400">Joined</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-slate-700 hover:bg-slate-700/50"
                    data-testid={`user-row-${user.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[user.role] || roleColors.patient}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={user.is_active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.notes ? (
                        <p className="text-sm text-slate-400 truncate max-w-[150px]" title={user.notes}>
                          {user.notes}
                        </p>
                      ) : (
                        <span className="text-slate-600 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem
                            className="text-slate-300 hover:bg-slate-700"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-teal-400 hover:bg-slate-700"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          {user.is_active ? (
                            <DropdownMenuItem
                              className="text-amber-400 hover:bg-slate-700"
                              onClick={() => handleDeactivateUser(user.id)}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-400 hover:bg-slate-700"
                              onClick={() => handleActivateUser(user.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-slate-700"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing {filteredUsers.length} of {pagination.total} users
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.skip === 0}
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip - prev.limit }))}
            className="border-slate-700 text-slate-300"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.skip + pagination.limit >= pagination.total}
            onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            className="border-slate-700 text-slate-300"
          >
            Next
          </Button>
        </div>
      </div>

      {/* User Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-xl">
                    {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.first_name} {selectedUser.last_name}</h3>
                  <Badge variant="outline" className={roleColors[selectedUser.role]}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>{selectedUser.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Joined {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              
              {/* Notes Section */}
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-slate-300">Notes</span>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-sm whitespace-pre-wrap">
                    {selectedUser.notes || 'No notes added'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDetailsModal(false);
                openEditModal(selectedUser);
              }} 
              className="border-teal-600 text-teal-400 hover:bg-teal-600/20"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="border-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-teal-400" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-slate-300">First Name</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-slate-300">Last Name</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="email@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-300">Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Notes
              </Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white resize-none"
                placeholder="Add notes about this user..."
                rows={4}
              />
              <p className="text-xs text-slate-500">
                Add any relevant notes or comments about this user
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(false)} 
              className="border-slate-600"
              disabled={editLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              className="bg-teal-600 hover:bg-teal-700"
              disabled={editLoading}
            >
              {editLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
