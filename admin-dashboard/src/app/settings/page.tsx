'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Globe,
  Palette,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  Download
} from 'lucide-react';
import { adminApiService } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

// Types for settings
interface AdminProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  businessHours: string;
  timezone: string;
  currency: string;
  language: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  backupFrequency: string;
  dataRetentionDays: number;
}

interface SecuritySettings {
  passwordMinLength: number;
  requireStrongPassword: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  twoFactorAuth: boolean;
  apiRateLimit: number;
}

interface NotificationSettings {
  newUserRegistration: boolean;
  newOrder: boolean;
  paymentReceived: boolean;
  systemAlerts: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  emailAlerts: boolean;
  pushNotifications: boolean;
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const queryClient = useQueryClient();

  // Fetch admin profile
  const { data: profile, isLoading: profileLoading } = useQuery<AdminProfile>({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const response = await adminApiService.getCurrentAdmin();
      return response;
    },
  });

  // Fetch system settings
  const { data: systemSettings, isLoading: systemLoading } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: () => adminApiService.getSystemSettings(),
  });

  // Fetch security settings
  const { data: securitySettings, isLoading: securityLoading } = useQuery<SecuritySettings>({
    queryKey: ['security-settings'],
    queryFn: () => adminApiService.getSecuritySettings(),
  });

  // Fetch notification settings
  const { data: notificationSettings, isLoading: notificationLoading } = useQuery<NotificationSettings>({
    queryKey: ['notification-settings'],
    queryFn: () => adminApiService.getNotificationSettings(),
  });

  // Local state for editing
  const [editableSystemSettings, setEditableSystemSettings] = useState<SystemSettings | null>(null);
  const [editableSecuritySettings, setEditableSecuritySettings] = useState<SecuritySettings | null>(null);
  const [editableNotificationSettings, setEditableNotificationSettings] = useState<NotificationSettings | null>(null);

  // Sync API data with local editable state
  React.useEffect(() => {
    if (systemSettings && !editableSystemSettings) {
      setEditableSystemSettings(systemSettings);
    }
  }, [systemSettings, editableSystemSettings]);

  React.useEffect(() => {
    if (securitySettings && !editableSecuritySettings) {
      setEditableSecuritySettings(securitySettings);
    }
  }, [securitySettings, editableSecuritySettings]);

  React.useEffect(() => {
    if (notificationSettings && !editableNotificationSettings) {
      setEditableNotificationSettings(notificationSettings);
    }
  }, [notificationSettings, editableNotificationSettings]);

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      return adminApiService.updatePassword(data);
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password updated successfully!');
    },
    onError: (error) => {
      console.error('Password update failed:', error);
      alert('Failed to update password. Please try again.');
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string }) => {
      return adminApiService.updateAdminProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      alert('Profile updated successfully!');
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
      alert('Failed to update profile. Please try again.');
    }
  });

  // Update system settings mutation
  const updateSystemSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettings) => {
      return adminApiService.updateSystemSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      alert('System settings updated successfully!');
    },
    onError: (error) => {
      console.error('System settings update failed:', error);
      alert('Failed to update system settings. Please try again.');
    }
  });

  // Update security settings mutation
  const updateSecuritySettingsMutation = useMutation({
    mutationFn: async (data: SecuritySettings) => {
      return adminApiService.updateSecuritySettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
      alert('Security settings updated successfully!');
    },
    onError: (error) => {
      console.error('Security settings update failed:', error);
      alert('Failed to update security settings. Please try again.');
    }
  });

  // Update notification settings mutation
  const updateNotificationSettingsMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      return adminApiService.updateNotificationSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      alert('Notification settings updated successfully!');
    },
    onError: (error) => {
      console.error('Notification settings update failed:', error);
      alert('Failed to update notification settings. Please try again.');
    }
  });

  // Handle password change
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    updatePasswordMutation.mutate(passwordData);
  };

  // Handle profile update
  const handleProfileUpdate = () => {
    const profileData: any = {};
    const nameInput = document.querySelector('input[placeholder="Enter full name"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[placeholder="Enter email"]') as HTMLInputElement;
    
    if (nameInput?.value) profileData.name = nameInput.value;
    if (emailInput?.value) profileData.email = emailInput.value;
    
    if (Object.keys(profileData).length > 0) {
      updateProfileMutation.mutate(profileData);
    }
  };

  // Handle system settings update
  const handleSystemSettingsUpdate = () => {
    if (editableSystemSettings) {
      updateSystemSettingsMutation.mutate(editableSystemSettings);
    }
  };

  // Handle security settings update
  const handleSecuritySettingsUpdate = () => {
    if (editableSecuritySettings) {
      updateSecuritySettingsMutation.mutate(editableSecuritySettings);
    }
  };

  // Handle notification settings update
  const handleNotificationSettingsUpdate = () => {
    if (editableNotificationSettings) {
      updateNotificationSettingsMutation.mutate(editableNotificationSettings);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'system', name: 'System', icon: Settings },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'advanced', name: 'Advanced', icon: Globe },
  ];

  if (profileLoading || systemLoading || securityLoading || notificationLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your admin dashboard preferences and system configuration
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Settings</h3>
                    
                    {/* Profile Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profile?.name || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter full name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profile?.email || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter email"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Permissions
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {profile?.permissions.map((permission, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {permission}
                            </span>
                          ))}
                          {profile?.permissions.length === 0 && (
                            <span className="text-sm text-gray-500">No permissions assigned</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role
                        </label>
                        <input
                          type="text"
                          value={profile?.role || 'ADMIN'}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Change Password */}
                    <div className="border-t pt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Change Password</h4>
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              New Password
                            </label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter new password"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Confirm Password
                            </label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={updatePasswordMutation.isPending}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {updatePasswordMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Lock className="h-4 w-4 mr-2" />
                          )}
                          Update Password
                        </button>
                      </form>
                    </div>

                    <div className="mt-8 pt-6 border-t">
                      <button 
                        onClick={handleProfileUpdate}
                        disabled={updateProfileMutation.isPending}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {updateProfileMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Profile Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* System Tab */}
                {activeTab === 'system' && (
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">System Settings</h3>
                    
                    <div className="space-y-6">
                      {/* General Settings */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">General</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Site Name
                            </label>
                            <input
                              type="text"
                              value={editableSystemSettings?.siteName || ''}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, siteName: e.target.value }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Timezone
                            </label>
                            <select
                              value={editableSystemSettings?.timezone || ''}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, timezone: e.target.value }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                              <option value="UTC">UTC</option>
                              <option value="America/New_York">America/New_York (EST)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Currency
                            </label>
                            <select
                              value={editableSystemSettings?.currency || ''}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, currency: e.target.value }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="INR">INR (₹)</option>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Language
                            </label>
                            <select
                              value={editableSystemSettings?.language || ''}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, language: e.target.value }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="English">English</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Bengali">Bengali</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="border-t pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Contact Email
                            </label>
                            <input
                              type="email"
                              value={editableSystemSettings?.contactEmail || ''}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, contactEmail: e.target.value }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Contact Phone
                            </label>
                            <input
                              type="tel"
                              value={editableSystemSettings?.contactPhone || ''}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, contactPhone: e.target.value }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* System Controls */}
                      <div className="border-t pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">System Controls</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                              <p className="text-xs text-gray-500">Temporarily disable public access to the system</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editableSystemSettings?.maintenanceMode || false}
                                onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, maintenanceMode: e.target.checked }) : null)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Allow Registration</label>
                              <p className="text-xs text-gray-500">Allow new users to register accounts</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editableSystemSettings?.allowRegistration || false}
                                onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, allowRegistration: e.target.checked }) : null)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t">
                        <button
                          onClick={handleSystemSettingsUpdate}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save System Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">Password Policy</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Minimum Password Length
                            </label>
                            <input
                              type="number"
                              min="6"
                              max="50"
                              value={editableSecuritySettings?.passwordMinLength || 8}
                              onChange={(e) => setEditableSecuritySettings(prev => prev ? ({ ...prev, passwordMinLength: parseInt(e.target.value) }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Max Login Attempts
                            </label>
                            <input
                              type="number"
                              min="3"
                              max="20"
                              value={editableSecuritySettings?.maxLoginAttempts || 5}
                              onChange={(e) => setEditableSecuritySettings(prev => prev ? ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Require Strong Password</label>
                              <p className="text-xs text-gray-500">Enforce uppercase, lowercase, numbers, and symbols</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editableSecuritySettings?.requireStrongPassword || false}
                                onChange={(e) => setEditableSecuritySettings(prev => prev ? ({ ...prev, requireStrongPassword: e.target.checked }) : null)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Session Management</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Timeout (minutes)
                          </label>
                          <select
                            value={editableSecuritySettings?.sessionTimeout || 60}
                            onChange={(e) => setEditableSecuritySettings(prev => prev ? ({ ...prev, sessionTimeout: parseInt(e.target.value) }) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="120">2 hours</option>
                            <option value="480">8 hours</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <button
                          onClick={handleSecuritySettingsUpdate}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Save Security Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Settings</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">System Notifications</h4>
                        <div className="space-y-4">
                          {Object.entries(editableNotificationSettings || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <div>
                                <label className="text-sm font-medium text-gray-700 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </label>
                                <p className="text-xs text-gray-500">
                                  {key === 'newUserRegistration' && 'Get notified when new users register'}
                                  {key === 'newOrder' && 'Get notified about new orders'}
                                  {key === 'paymentReceived' && 'Get notified when payments are received'}
                                  {key === 'systemAlerts' && 'Receive important system alerts'}
                                  {key === 'dailyReports' && 'Receive daily summary reports'}
                                  {key === 'weeklyReports' && 'Receive weekly analytics reports'}
                                  {key === 'emailAlerts' && 'Send notifications via email'}
                                  {key === 'pushNotifications' && 'Send browser push notifications'}
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(value)}
                                  onChange={(e) => setEditableNotificationSettings(prev => prev ? ({ ...prev, [key]: e.target.checked }) : null)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6 border-t">
                        <button
                          onClick={handleNotificationSettingsUpdate}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Save Notification Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Database Tab */}
                {activeTab === 'database' && (
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">Database Management</h3>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">Backup & Recovery</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Backup Frequency
                            </label>
                            <select
                              value={editableSystemSettings?.backupFrequency || ''}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, backupFrequency: e.target.value }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Data Retention (days)
                            </label>
                            <input
                              type="number"
                              min="30"
                              max="3650"
                              value={editableSystemSettings?.dataRetentionDays || 365}
                              onChange={(e) => setEditableSystemSettings(prev => prev ? ({ ...prev, dataRetentionDays: parseInt(e.target.value) }) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Manual Operations</h4>
                        <div className="flex flex-wrap gap-4">
                          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                            <Download className="h-4 w-4 mr-2" />
                            Create Backup
                          </button>
                          
                          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <Upload className="h-4 w-4 mr-2" />
                            Restore Backup
                          </button>
                          
                          <button className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Optimize Database
                          </button>
                        </div>
                      </div>

                      {/* Database Stats */}
                      <div className="border-t pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Database Statistics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-sm text-gray-600">Total Tables</div>
                            <div className="text-2xl font-bold text-gray-900">12</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-sm text-gray-600">Database Size</div>
                            <div className="text-2xl font-bold text-gray-900">45.2 MB</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-sm text-gray-600">Last Backup</div>
                            <div className="text-2xl font-bold text-gray-900">2 hrs ago</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">Advanced Settings</h3>
                    
                    <div className="space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              These settings can affect system performance and security. Please proceed with caution.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">API Configuration</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Rate Limit (requests per minute)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="1000"
                            value={editableSecuritySettings?.apiRateLimit || 100}
                            onChange={(e) => setEditableSecuritySettings(prev => prev ? ({ ...prev, apiRateLimit: parseInt(e.target.value) }) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">System Information</h4>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Application Version:</span>
                            <span className="text-sm font-medium">1.0.0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Node.js Version:</span>
                            <span className="text-sm font-medium">18.17.0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Database Version:</span>
                            <span className="text-sm font-medium">PostgreSQL 15.3</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Last Updated:</span>
                            <span className="text-sm font-medium">2024-03-15</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <Save className="h-4 w-4 mr-2" />
                          Save Advanced Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;