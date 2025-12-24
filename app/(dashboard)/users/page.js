'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Key,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';

const roleOptions = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'USER', label: 'User' },
  { value: 'VIEWER', label: 'Viewer' },
];

function RoleBadge({ role }) {
  const styles = {
    ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    USER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    VIEWER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const labels = {
    ADMIN: 'Admin',
    USER: 'User',
    VIEWER: 'Viewer',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[role] || styles.USER}`}>
      {labels[role] || role}
    </span>
  );
}

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="px-2 py-1 text-xs font-medium rounded border bg-green-500/20 text-green-400 border-green-500/30">
      Active
    </span>
  ) : (
    <span className="px-2 py-1 text-xs font-medium rounded border bg-red-500/20 text-red-400 border-red-500/30">
      Inactive
    </span>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-dark-hover rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function UserForm({ user, onSubmit, onCancel, isLoading, isEdit }) {
  const [formData, setFormData] = useState({
    username: user?.email || '',
    name: user?.name || '',
    role: user?.role || 'USER',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!isEdit && !formData.username) {
      setError('Username is required');
      return;
    }

    if (!formData.name) {
      setError('Name is required');
      return;
    }

    if (!isEdit && !formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isEdit && (
        <Input
          label="Username"
          placeholder="Enter username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          autoComplete="off"
        />
      )}

      <Input
        label="Name"
        placeholder="Enter display name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Select
        label="Role"
        options={roleOptions}
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
      />

      <Input
        label={isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
        type="password"
        placeholder={isEdit ? 'Enter new password' : 'Enter password'}
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        autoComplete="new-password"
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Confirm password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        autoComplete="new-password"
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" className="flex-1" isLoading={isLoading}>
          {isEdit ? 'Update User' : 'Create User'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <p className="text-sm text-gray-400">
        Reset password for <span className="text-gray-200 font-medium">{user?.name}</span>
      </p>

      <Input
        label="New Password"
        type="password"
        placeholder="Enter new password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        autoComplete="new-password"
        required
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Confirm new password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        autoComplete="new-password"
        required
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" className="flex-1" isLoading={isLoading}>
          Reset Password
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteConfirmation({ user, onConfirm, onCancel, isLoading }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-300">
        Are you sure you want to delete the user{' '}
        <span className="font-medium text-gray-100">{user?.name}</span>?
      </p>
      <p className="text-sm text-gray-500">This action cannot be undone.</p>

      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="danger"
          className="flex-1"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          Delete User
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState({ type: null, user: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      setUsers(data.users);
      // Get current user ID from the first admin in the list who matches current session
      // We'll set this when we get the response
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setMessage({ type: 'error', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user info
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/account/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user?.id);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower)
    );
  });

  const closeModal = () => {
    setModalState({ type: null, user: null });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleCreateUser = async (formData) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      showMessage('success', 'User created successfully');
      closeModal();
      fetchUsers();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (formData) => {
    setActionLoading(true);
    try {
      const updateData = {
        name: formData.name,
        role: formData.role,
      };

      if (formData.password) {
        updateData.password = formData.password;
        updateData.confirmPassword = formData.confirmPassword;
      }

      const response = await fetch(`/api/users/${modalState.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      showMessage('success', 'User updated successfully');
      closeModal();
      fetchUsers();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (formData) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/users/${modalState.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      showMessage('success', 'Password reset successfully');
      closeModal();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/users/${modalState.user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      showMessage('success', 'User deleted successfully');
      closeModal();
      fetchUsers();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      showMessage('success', `User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      showMessage('error', error.message);
    }
  };


  return (
    <div>
      <Header
        title="User Management"
        description="Manage user accounts and permissions"
      >
        <Button icon={Plus} onClick={() => setModalState({ type: 'create', user: null })}>
          Add User
        </Button>
      </Header>

      <div className="p-6 space-y-4">
        {/* Message */}
        {message.text && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-green-500/10 border border-green-500/20 text-green-400'
            }`}
          >
            {message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or username..."
                  icon={Search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={fetchUsers}
                isLoading={loading}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No users found</p>
                <Button
                  variant="secondary"
                  icon={Plus}
                  onClick={() => setModalState({ type: 'create', user: null })}
                >
                  Add First User
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="table-header text-left px-6 py-3">User</th>
                      <th className="table-header text-left px-4 py-3">Role</th>
                      <th className="table-header text-left px-4 py-3">Status</th>
                      <th className="table-header text-right px-4 py-3">Created</th>
                      <th className="table-header text-right px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="table-row">
                        <td className="table-cell px-6">
                          <div className="font-medium text-gray-100">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </td>
                        <td className="table-cell px-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="table-cell px-4">
                          <button
                            onClick={() => handleToggleActive(user)}
                            className="hover:opacity-80 transition-opacity"
                            disabled={user.id === currentUserId}
                            title={user.id === currentUserId ? "Cannot change your own status" : "Click to toggle"}
                          >
                            <StatusBadge isActive={user.isActive} />
                          </button>
                        </td>
                        <td className="table-cell px-4 text-right text-gray-400">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="table-cell px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setModalState({ type: 'resetPassword', user })}
                              className="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded transition-colors"
                              title="Reset password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setModalState({ type: 'edit', user })}
                              className="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-brand-400/10 rounded transition-colors"
                              title="Edit user"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {user.id !== currentUserId && (
                              <button
                                onClick={() => setModalState({ type: 'delete', user })}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User count */}
        <div className="text-sm text-gray-400 text-center">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={modalState.type === 'create'}
        onClose={closeModal}
        title="Create New User"
      >
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={closeModal}
          isLoading={actionLoading}
          isEdit={false}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={modalState.type === 'edit'}
        onClose={closeModal}
        title="Edit User"
      >
        <UserForm
          user={modalState.user}
          onSubmit={handleUpdateUser}
          onCancel={closeModal}
          isLoading={actionLoading}
          isEdit={true}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={modalState.type === 'resetPassword'}
        onClose={closeModal}
        title="Reset Password"
      >
        <ResetPasswordForm
          user={modalState.user}
          onSubmit={handleResetPassword}
          onCancel={closeModal}
          isLoading={actionLoading}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalState.type === 'delete'}
        onClose={closeModal}
        title="Delete User"
      >
        <DeleteConfirmation
          user={modalState.user}
          onConfirm={handleDeleteUser}
          onCancel={closeModal}
          isLoading={actionLoading}
        />
      </Modal>
    </div>
  );
}
