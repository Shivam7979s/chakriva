import type React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface NavItemProps {
  to: string;
  icon?: React.ReactNode;
  label: string;
  badge?: string | number;
  badgeVariant?: 'neutral' | 'primary' | 'warning';
  end?: boolean;
  className?: string;
  collapsed?: boolean;
  onClick?: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  badge,
  badgeVariant = 'neutral',
  end = false,
  className,
  collapsed = false,
  onClick,
}) => {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors select-none group',
          isActive
            ? 'bg-white/[0.04] text-white border-l-2 border-blue-500 font-semibold [&_svg]:text-blue-400'
            : 'text-neutral-400 hover:text-white hover:bg-white/[0.02] [&_svg]:text-neutral-400 group-hover:[&_svg]:text-white',
          collapsed && 'justify-center px-2',
          className
        )
      }
      title={collapsed ? label : undefined}
    >
      {icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>}
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
      {!collapsed && badge !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.2 rounded text-[11px] font-mono tabular-nums leading-none',
            badgeVariant === 'primary' && 'bg-primary text-text-inverse',
            badgeVariant === 'warning' && 'bg-warning/20 text-warning',
            badgeVariant === 'neutral' && 'bg-surface-subtle text-text-muted'
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
};
