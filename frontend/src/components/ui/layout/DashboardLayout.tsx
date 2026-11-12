import React, { useContext, useEffect } from 'react';
import { type BreadcrumbItem } from '../navigation/Breadcrumbs';
import { AppLayout, AppLayoutContext } from './AppLayout';
import { cn } from '@/lib/utils';

export interface DashboardLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  contentClassName?: string;
  disableMainScroll?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  breadcrumbs = [{ label: 'CHAKRIVA', href: '/app/home' }, { label: 'Workspace' }],
  children,
  contentClassName = '',
  disableMainScroll = false,
}) => {
  const { insideAppLayout, setDisableMainScroll } = useContext(AppLayoutContext);

  useEffect(() => {
    if (insideAppLayout && setDisableMainScroll) {
      setDisableMainScroll(disableMainScroll);
      return () => setDisableMainScroll(false);
    }
  }, [insideAppLayout, setDisableMainScroll, disableMainScroll]);

  // If already rendered inside the AppLayout shell, render content directly
  if (insideAppLayout) {
    return (
      <div
        className={cn(
          'flex-1 p-3 sm:p-4 lg:p-4.5',
          disableMainScroll
            ? 'h-full flex flex-col min-h-0 lg:overflow-hidden'
            : 'overflow-y-auto',
          contentClassName
        )}
      >
        {children}
      </div>
    );
  }

  // Standalone fallback: wrap inside AppLayout
  return (
    <AppLayout breadcrumbs={breadcrumbs} disableMainScroll={disableMainScroll}>
      <div
        className={cn(
          'flex-1 p-3 sm:p-4 lg:p-4.5',
          disableMainScroll
            ? 'h-full flex flex-col min-h-0 lg:overflow-hidden'
            : 'p-4 sm:p-6 overflow-y-auto',
          contentClassName
        )}
      >
        {children}
      </div>
    </AppLayout>
  );
};

export default DashboardLayout;
