import React from 'react';
import {
  Terminal,
  GitBranch,
  Layers,
  Zap,
  Database,
  Cpu,
  Globe,
  Boxes,
  Compass,
  Server,
  Table2,
  HardDrive,
  Network,
  Radio,
  Braces,
} from 'lucide-react';
import type { TrackIconKey } from '../types/learn';
import { cn } from '@/lib/utils';

const EMBLEM_CONFIG: Record<
  TrackIconKey,
  { icon: React.ElementType; bg: string; border: string; accent: string }
> = {
  foundations: {
    icon: Terminal,
    bg: 'bg-[#121E36]',
    border: 'border-[#253B66]',
    accent: 'text-[#60A5FA]',
  },
  a2z: {
    icon: GitBranch,
    bg: 'bg-[#0F2626]',
    border: 'border-[#1C4745]',
    accent: 'text-[#2DD4BF]',
  },
  patterns: {
    icon: Layers,
    bg: 'bg-[#15203A]',
    border: 'border-[#2A3F6E]',
    accent: 'text-[#818CF8]',
  },
  sprint: {
    icon: Zap,
    bg: 'bg-[#291F0C]',
    border: 'border-[#4D3913]',
    accent: 'text-[#FBBF24]',
  },
  dbms: {
    icon: Database,
    bg: 'bg-[#0E242B]',
    border: 'border-[#1B424F]',
    accent: 'text-[#38BDF8]',
  },
  os: {
    icon: Cpu,
    bg: 'bg-[#1B1733]',
    border: 'border-[#332A5E]',
    accent: 'text-[#A78BFA]',
  },
  cn: {
    icon: Globe,
    bg: 'bg-[#0E2621]',
    border: 'border-[#19473E]',
    accent: 'text-[#34D399]',
  },
  oop: {
    icon: Boxes,
    bg: 'bg-[#1E1A36]',
    border: 'border-[#372F61]',
    accent: 'text-[#C4B5FD]',
  },
  lld: {
    icon: Compass,
    bg: 'bg-[#12213B]',
    border: 'border-[#254070]',
    accent: 'text-[#60A5FA]',
  },
  hld: {
    icon: Server,
    bg: 'bg-[#12242C]',
    border: 'border-[#224554]',
    accent: 'text-[#22D3EE]',
  },
  sql: {
    icon: Table2,
    bg: 'bg-[#0D2528]',
    border: 'border-[#1A474D]',
    accent: 'text-[#00B8A3]',
  },
  rust: {
    icon: HardDrive,
    bg: 'bg-[#2A1A12]',
    border: 'border-[#4F3021]',
    accent: 'text-[#FB923C]',
  },
  raft: {
    icon: Network,
    bg: 'bg-[#142038]',
    border: 'border-[#263D69]',
    accent: 'text-[#60A5FA]',
  },
  grpc: {
    icon: Radio,
    bg: 'bg-[#0E2626]',
    border: 'border-[#1A4747]',
    accent: 'text-[#2DD4BF]',
  },
  llvm: {
    icon: Braces,
    bg: 'bg-[#211833]',
    border: 'border-[#3E2B61]',
    accent: 'text-[#C084FC]',
  },
};

export const TrackEmblem: React.FC<{ iconKey: TrackIconKey; size?: 'md' | 'lg' }> = ({
  iconKey,
  size = 'md',
}) => {
  const cfg = EMBLEM_CONFIG[iconKey] || EMBLEM_CONFIG.patterns;
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        'rounded-xl border flex items-center justify-center shrink-0',
        cfg.bg,
        cfg.border,
        size === 'lg' ? 'w-12 h-12' : 'w-11 h-11'
      )}
    >
      <Icon className={cn(cfg.accent, size === 'lg' ? 'w-6 h-6' : 'w-5 h-5')} />
    </div>
  );
};

