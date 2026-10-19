import React, { useContext } from 'react';
import { type BreadcrumbItem } from '../navigation/Breadcrumbs';
import { AppLayout, AppLayoutContext } from './AppLayout';

export interface DashboardLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  breadcrumbs = [{ label: 'CHAKRIVA', href: '/app/home' }, { label: 'Workspace' }],
  children,
}) => {
  const { insideAppLayout } = useContext(AppLayoutContext);

  // If already rendered inside the AppLayout shell, render content directly
  if (insideAppLayout) {
    return (
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {children}
      </div>
    );
  }

  // Standalone fallback: wrap inside AppLayout
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </AppLayout>
  );
};

export default DashboardLayout;
