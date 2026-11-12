import React from 'react';
import {
  Layers,
  Building2,
  Cpu,
  Timer,
  Compass,
} from 'lucide-react';
import type { SheetCategory } from '../types/sheet';
import { cn } from '@/lib/utils';

interface SheetEmblemProps {
  category: SheetCategory;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CATEGORY_ICON_CONFIG: Record<
  SheetCategory,
  {
    Icon: React.FC<{ className?: string }>;
    containerClass: string;
    iconClass: string;
    label: string;
  }
> = {
  chakriva: {
    Icon: Layers,
    containerClass: 'bg-[#0C2629] border-[#164E54]',
    iconClass: 'text-[#22D3EE]',
    label: 'Flagship Track',
  },
  company: {
    Icon: Building2,
    containerClass: 'bg-[#152443] border-[#243B6B]',
    iconClass: 'text-[#60A5FA]',
    label: 'Company Pack',
  },
  topic: {
    Icon: Cpu,
    containerClass: 'bg-[#1F1A3B] border-[#382D69]',
    iconClass: 'text-[#A78BFA]',
    label: 'Topic Mastery',
  },
  goal: {
    Icon: Timer,
    containerClass: 'bg-[#0B2922] border-[#144D3F]',
    iconClass: 'text-[#34D399]',
    label: 'Time Sprint',
  },
  beginner: {
    Icon: Compass,
    containerClass: 'bg-[#261E0E] border-[#4A3A18]',
    iconClass: 'text-[#FBBF24]',
    label: 'Zero to One',
  },
};

export const SheetEmblem: React.FC<SheetEmblemProps> = ({
  category,
  size = 'md',
  className,
}) => {
  const cfg = CATEGORY_ICON_CONFIG[category] || CATEGORY_ICON_CONFIG.chakriva;
  const Icon = cfg.Icon;

  const boxSize =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
      ? 'w-11 h-11 rounded-xl'
      : 'w-10 h-10 rounded-xl';

  const iconSize =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4.5 h-4.5';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center border shrink-0',
        boxSize,
        cfg.containerClass,
        className
      )}
      aria-hidden="true"
    >
      <Icon className={cn(iconSize, cfg.iconClass)} />
    </span>
  );
};

