'use client';

import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BarChart3, 
  FileText, 
  Settings,
  HelpCircle,
  TrendingUp,
  Database
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and stats'
  },
  {
    name: 'All Users',
    href: '/users',
    icon: Users,
    description: 'Registered users management'
  },
  {
    name: 'All Customers',
    href: '/customers',
    icon: UserCheck,
    description: 'Customer management'
  },
  {
    name: 'Vendors',
    href: '/vendors',
    icon: Users,
    description: 'Vendor management'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Business insights'
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    description: 'Generate reports'
  },
  {
    name: 'System Metrics',
    href: '/system-metrics',
    icon: Database,
    description: 'System performance'
  },
];

const secondaryNavigation = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'Help & Support',
    href: '/support',
    icon: HelpCircle,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-full">
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${active ? 'text-blue-700' : 'text-gray-400'}`} />
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.name}</div>
                  <div className={`text-xs ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="space-y-1">
            {secondaryNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${active ? 'text-blue-700' : 'text-gray-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Stats Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                System Status
              </div>
              <div className="text-xs text-green-600 font-medium">
                All Systems Operational
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}