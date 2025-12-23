'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Key, User, AlertCircle, Check, Loader2 } from 'lucide-react';

function getRoleLabel(role) {
  switch (role) {
    case 'ADMIN': return 'Administrator';
    case 'USER': return 'User';
    case 'VIEWER': return 'Viewer';
    default: return role || 'User';
  }
}

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/account/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type === 'success') {
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validate
    if (!formData.currentPassword) {
      showMessage('error', 'Current password is required');
      return;
    }

    if (!formData.newPassword) {
      showMessage('error', 'New password is required');
      return;
    }

    if (formData.newPassword.length < 4) {
      showMessage('error', 'Password must be at least 4 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      showMessage('success', 'Password changed successfully');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Account Settings"
        description="Manage your account and password"
      />

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <span className="text-gray-400">Name</span>
                <span className="text-gray-100 font-medium">{user?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <span className="text-gray-400">Username</span>
                <span className="text-gray-100 font-medium">{user?.email || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-400">Role</span>
                <span className="text-gray-100 font-medium">{getRoleLabel(user?.role)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Input
                label="Current Password"
                type="password"
                placeholder="Enter current password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                autoComplete="current-password"
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                autoComplete="new-password"
                required
              />

              <div className="pt-2">
                <Button type="submit" isLoading={loading} icon={Key}>
                  Change Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
