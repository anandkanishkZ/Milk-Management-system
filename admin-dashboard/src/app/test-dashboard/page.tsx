'use client';

import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';

export default function TestDashboardPage() {
  const { user } = useAuth();

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
          <p><strong>Name:</strong> {user ? user.name : 'N/A'}</p>
          <p><strong>Active:</strong> {user ? (user.isActive ? 'Yes' : 'No') : 'N/A'}</p>
        </div>
      </div>
    </AdminLayout>
  );
}