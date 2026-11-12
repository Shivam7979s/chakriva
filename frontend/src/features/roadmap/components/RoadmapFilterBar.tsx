import { ChevronDown, ChevronUp } from 'lucide-react';

interface RoadmapFilterBarProps {
  filter: 'all' | 'active' | 'completed';
  onFilterChange: (filter: 'all' | 'active' | 'completed') => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  totalItems: number;
  completedItems: number;
}

export const RoadmapFilterBar: React.FC<RoadmapFilterBarProps> = ({
  filter,
  onFilterChange,
  onExpandAll,
  onCollapseAll,
  totalItems,
  completedItems,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#171D2D]">
      {/* Left: Filter Buttons */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0F131D] border border-[#192033]">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-[#152443] text-[#F3F6FF]'
              : 'text-[#8592A8] hover:text-[#F3F6FF]'
          }`}
        >
          All Sprints
        </button>
        <button
          onClick={() => onFilterChange('active')}
          className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
            filter === 'active'
              ? 'bg-[#152443] text-[#F3F6FF]'
              : 'text-[#8592A8] hover:text-[#F3F6FF]'
          }`}
        >
          Active Sprint
        </button>
        <button
          onClick={() => onFilterChange('completed')}
          className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
            filter === 'completed'
              ? 'bg-[#152443] text-[#F3F6FF]'
              : 'text-[#8592A8] hover:text-[#F3F6FF]'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Right: Expand / Collapse and Metrics */}
      <div className="flex items-center gap-3 self-end sm:self-auto">
        <div className="text-xs font-mono text-[#7C8BA6] hidden md:block">
          <span className="text-[#C3CEE0] font-medium">{completedItems}</span> / {totalItems} items completed
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExpandAll}
            className="text-xs font-mono text-[#94A1B8] hover:text-[#F3F6FF] px-2.5 py-1 rounded-lg hover:bg-[#141A29] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Expand All</span>
          </button>
          <span className="text-[#27314A]">|</span>
          <button
            onClick={onCollapseAll}
            className="text-xs font-mono text-[#94A1B8] hover:text-[#F3F6FF] px-2.5 py-1 rounded-lg hover:bg-[#141A29] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Collapse All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
