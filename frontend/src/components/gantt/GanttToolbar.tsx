import React from 'react';
import { ViewMode } from 'gantt-task-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  BarChart3,
  GitBranch,
  Target,
  Loader2,
  Calendar,
  Clock,
  Filter,
  Search,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface GanttToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onExport: (format: 'pdf' | 'png' | 'svg') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoomLevel: number;
  showProgress: boolean;
  showDependencies: boolean;
  showCriticalPath: boolean;
  onToggleProgress: () => void;
  onToggleDependencies: () => void;
  onToggleCriticalPath: () => void;
  isLoading?: boolean;
  readOnly?: boolean;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

const viewModeOptions = [
  { value: ViewMode.QuarterDay, label: 'Quarter Day', icon: Clock },
  { value: ViewMode.HalfDay, label: 'Half Day', icon: Clock },
  { value: ViewMode.Day, label: 'Day', icon: Calendar },
  { value: ViewMode.Week, label: 'Week', icon: Calendar },
  { value: ViewMode.Month, label: 'Month', icon: Calendar },
  { value: ViewMode.Year, label: 'Year', icon: Calendar },
];

export const GanttToolbar: React.FC<GanttToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onExport,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoomLevel,
  showProgress,
  showDependencies,
  showCriticalPath,
  onToggleProgress,
  onToggleDependencies,
  onToggleCriticalPath,
  isLoading = false,
  onSearch,
  onRefresh,
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      // Debounce the search
      const timeoutId = setTimeout(() => onSearch(value), 300);
      return () => clearTimeout(timeoutId);
    }
  };

  const getViewModeIcon = (mode: ViewMode) => {
    const option = viewModeOptions.find(opt => opt.value === mode);
    return option ? option.icon : Calendar;
  };

  const getCurrentViewModeLabel = (mode: ViewMode) => {
    const option = viewModeOptions.find(opt => opt.value === mode);
    return option ? option.label : 'Day';
  };

  return (
    <Card className="border-b border-l-0 border-r-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Left section - View controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <Select
              value={viewMode.toString()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onViewModeChange(parseInt(e.target.value) as unknown as ViewMode)}
            >
              <SelectTrigger className="w-32">
                <div className="flex items-center gap-2">
                  {React.createElement(getViewModeIcon(viewMode), { className: "w-4 h-4" })}
                  <SelectValue placeholder={getCurrentViewModeLabel(viewMode)} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {viewModeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onZoomOut}
                disabled={zoomLevel <= 50}
                className="px-2"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>

              <Badge variant="secondary" className="min-w-[4rem] justify-center">
                {zoomLevel}%
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={onZoomIn}
                disabled={zoomLevel >= 200}
                className="px-2"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onZoomReset}
                className="px-2"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* View Options */}
            <div className="flex items-center gap-1">
              <Button
                variant={showProgress ? "default" : "outline"}
                size="sm"
                onClick={onToggleProgress}
                className="px-2"
                title="Toggle Progress Bars"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>

              <Button
                variant={showDependencies ? "default" : "outline"}
                size="sm"
                onClick={onToggleDependencies}
                className="px-2"
                title="Toggle Dependencies"
              >
                <GitBranch className="w-4 h-4" />
              </Button>

              <Button
                variant={showCriticalPath ? "default" : "outline"}
                size="sm"
                onClick={onToggleCriticalPath}
                className="px-2"
                title="Toggle Critical Path"
              >
                <Target className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Center section - Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="px-2">
                  <Filter className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="center">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Filter Options</Label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="completed-tasks" className="text-sm">Show Completed</Label>
                      <Switch id="completed-tasks" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="on-hold-tasks" className="text-sm">Show On Hold</Label>
                      <Switch id="on-hold-tasks" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="overdue-tasks" className="text-sm">Show Overdue</Label>
                      <Switch id="overdue-tasks" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="milestones" className="text-sm">Show Milestones</Label>
                      <Switch id="milestones" defaultChecked />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Priority Filter</Label>
                    <div className="space-y-2">
                      {['Critical', 'High', 'Medium', 'Low'].map((priority) => (
                        <div key={priority} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`priority-${priority.toLowerCase()}`}
                            defaultChecked
                            className="rounded"
                          />
                          <Label
                            htmlFor={`priority-${priority.toLowerCase()}`}
                            className="text-sm"
                          >
                            {priority}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="flex-1"
                    >
                      Apply Filters
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="px-2"
                title="Refresh Data"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Full Screen Toggle */}
            {onToggleFullScreen && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFullScreen}
                className="px-2"
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              >
                {isFullScreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Export Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('png')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('svg')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as SVG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <Button
              variant="outline"
              size="sm"
              className="px-2"
              title="Chart Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BarChart3 className="w-4 h-4" />
            <span>Progress: <strong>65%</strong></span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Target className="w-4 h-4 text-red-500" />
            <span>Critical Path: <strong>3 tasks</strong></span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>Behind Schedule: <strong>2 tasks</strong></span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <GitBranch className="w-4 h-4" />
            <span>Dependencies: <strong>8 links</strong></span>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttToolbar;
