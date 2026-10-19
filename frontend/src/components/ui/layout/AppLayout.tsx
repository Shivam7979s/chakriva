import React, { useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { AppNavbar } from '../navigation/AppNavbar';
import { MobileBottomNav } from '../navigation/MobileBottomNav';
import { MobileMoreDrawer } from '../navigation/MobileMoreDrawer';
import { CommandPalette } from '../actions/CommandPalette';
import { type BreadcrumbItem } from '../navigation/Breadcrumbs';

export interface AppLayoutContextType {
  insideAppLayout: boolean;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AppLayoutContext = createContext<AppLayoutContextType>({
  insideAppLayout: false,
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useAppLayout = () => useContext(AppLayoutContext);

export interface AppLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <AppLayoutContext.Provider
      value={{
        insideAppLayout: true,
        collapsed,
        setCollapsed,
        mobileOpen: isMoreOpen,
        setMobileOpen: setIsMoreOpen,
      }}
    >
      <div className="min-h-screen flex flex-col bg-[#08090C] text-text-primary relative selection:bg-[#00d2ff]/30">
        {/* Top Desktop Global Navbar */}
        <AppNavbar />

        {/* Main Application Canvas */}
        <main
          id="main-content"
          className="flex-1 flex flex-col w-full min-w-0 pb-20 md:pb-6 overflow-y-auto"
        >
          {children ? children : <Outlet />}
        </main>

        {/* Mobile Fixed Safe-Area Bottom Navigation */}
        <MobileBottomNav
          isMoreOpen={isMoreOpen}
          onOpenMore={() => setIsMoreOpen(true)}
        />

        {/* Mobile 'More' Drawer Menu */}
        <MobileMoreDrawer
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
        />

        {/* Global Command Palette */}
        <CommandPalette />
      </div>
    </AppLayoutContext.Provider>
  );
};

export default AppLayout;
