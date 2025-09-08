import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  UsersIcon, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Shield, 
  ShieldOff, 
  Mail, 
  UserMinus, 
  UserCheck,
  Key,
  Copy
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string;
  is_admin: boolean;
  test_count: number;
  attempt_count: number;
}

const AdminUsers: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(25);
  const [offset] = useState(0);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', is_admin: false });
  const [editForm, setEditForm] = useState({ full_name: '', board: '', medium: '', class_level: '', state: '', district: '' });

  // Fetch users using admin RPC
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_admin');
      if (error) throw error;
      
      // Filter by search term locally for now
      const filtered = data?.filter((user: AdminUser) => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];
      
      return filtered;
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, full_name, is_admin }: { email: string; full_name?: string; is_admin: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-users-invite', {
        body: { email, full_name, is_admin }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "User Invited",
        description: "Invitation sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setInviteModalOpen(false);
      setInviteForm({ email: '', full_name: '', is_admin: false });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    },
  });

  // Set admin mutation  
  const setAdminMutation = useMutation({
    mutationFn: async ({ user_id, is_admin }: { user_id: string; is_admin: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-users-set-admin', {
        body: { user_id, is_admin }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "Admin status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users-reset-password', {
        body: { email }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.action_link) {
        navigator.clipboard.writeText(data.action_link);
        toast({
          title: "Reset Link Generated",
          description: "Password reset link copied to clipboard",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate reset link", 
        variant: "destructive",
      });
    },
  });

  // Ban/unban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ user_id, banned }: { user_id: string; banned: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-users-ban', {
        body: { user_id, banned }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "User Updated",
        description: `User ${variables.banned ? 'deactivated' : 'reactivated'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ user_id, ...profileData }: { user_id: string; [key: string]: any }) => {
      const { data, error } = await supabase.functions.invoke('admin-users-set-profile', {
        body: {
          user_id,
          full_name: profileData.full_name,
          board: profileData.board,
          medium: profileData.medium, 
          class_level: profileData.class_level,
          state: profileData.state,
          district: profileData.district,
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "User profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    inviteUserMutation.mutate(inviteForm);
  };

  const handleEditProfile = () => {
    if (selectedUser) {
      updateProfileMutation.mutate({
        user_id: selectedUser.user_id,
        ...editForm
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-admin-accent" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts, permissions, and profile information
          </p>
        </div>

        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-admin-accent hover:bg-admin-accent/90 text-admin-accent-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation email to a new user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="full_name">Full Name (Optional)</Label>
                <Input
                  id="full_name"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={inviteForm.is_admin}
                  onChange={(e) => setInviteForm({ ...inviteForm, is_admin: e.target.checked })}
                />
                <Label htmlFor="is_admin">Grant Admin Access</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleInvite}
                disabled={!inviteForm.email || inviteUserMutation.isPending}
              >
                {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users ({users.length})</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: AdminUser) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {user.full_name || user.email?.split('@')[0]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Badge variant="destructive" className="bg-admin-accent text-admin-accent-foreground">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div>{user.test_count} tests</div>
                      <div className="text-muted-foreground">{user.attempt_count} attempts</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(user.last_sign_in_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setEditForm({
                              full_name: user.full_name || '',
                              board: '',
                              medium: '',
                              class_level: '',
                              state: '',
                              district: ''
                            });
                            setEditModalOpen(true);
                          }}
                        >
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setAdminMutation.mutate({
                            user_id: user.user_id,
                            is_admin: !user.is_admin
                          })}
                        >
                          {user.is_admin ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => resetPasswordMutation.mutate(user.email)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => banUserMutation.mutate({
                            user_id: user.user_id,
                            banned: true
                          })}
                          className="text-destructive"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Deactivate User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_board">Board</Label>
              <Select onValueChange={(value) => setEditForm({ ...editForm, board: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBSE">CBSE</SelectItem>
                  <SelectItem value="State">State Board</SelectItem>
                  <SelectItem value="ICSE">ICSE</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_medium">Medium</Label>
              <Select onValueChange={(value) => setEditForm({ ...editForm, medium: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_class">Class Level</Label>
              <Select onValueChange={(value) => setEditForm({ ...editForm, class_level: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XI">Class XI</SelectItem>
                  <SelectItem value="XII">Class XII</SelectItem>
                  <SelectItem value="Dropper">Dropper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_state">State</Label>
              <Input
                id="edit_state"
                value={editForm.state}
                onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_district">District</Label>
              <Input
                id="edit_district"
                value={editForm.district}
                onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEditProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;