/**
 * Visual Schedule Management Component
 * Beautiful weekly grid view with drag-and-drop functionality
 */
import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useToast } from '../ui/use-toast';
import { cn } from '../../lib/utils';

interface ScheduleItem {
  id: string;
  employeeId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  hours: number;
  date: Date;
  task: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
}

interface VisualScheduleProps {
  className?: string;
}

// Draggable Schedule Item Component
function DraggableScheduleItem({ item, isOver }: { item: ScheduleItem; isOver?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    high: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300',
    low: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing',
        'shadow-sm hover:shadow-md transition-all duration-200',
        'backdrop-blur-sm bg-white/80 dark:bg-gray-800/80',
        priorityColors[item.priority],
        isDragging && 'opacity-50 shadow-lg scale-105',
        isOver && 'ring-2 ring-blue-500 ring-opacity-50'
      )}
      data-testid={`schedule-item-${item.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <User size={14} />
          <span className="text-sm font-medium">{item.employeeName}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {item.hours}h
        </Badge>
      </div>
      
      <div className="text-sm font-semibold mb-1">{item.projectName}</div>
      <div className="text-xs text-gray-600 dark:text-gray-400">{item.task}</div>
      
      <div className="absolute top-2 right-2">
        <div 
          className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: item.color }}
        />
      </div>
    </motion.div>
  );
}

export default function VisualSchedule({ className }: VisualScheduleProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockScheduleItems: ScheduleItem[] = [
      {
        id: '1',
        employeeId: 1,
        employeeName: 'Alice Johnson',
        projectId: 1,
        projectName: 'Mobile App Redesign',
        hours: 8,
        date: new Date(2024, 0, 15),
        task: 'Component Development',
        priority: 'high',
        color: '#ff6b6b'
      },
      {
        id: '2',
        employeeId: 2,
        employeeName: 'Bob Smith',
        projectId: 2,
        projectName: 'Backend API Migration',
        hours: 6,
        date: new Date(2024, 0, 15),
        task: 'Database Schema Design',
        priority: 'medium',
        color: '#4ecdc4'
      },
      {
        id: '3',
        employeeId: 1,
        employeeName: 'Alice Johnson',
        projectId: 1,
        projectName: 'Mobile App Redesign',
        hours: 4,
        date: new Date(2024, 0, 16),
        task: 'UI Testing',
        priority: 'low',
        color: '#ff6b6b'
      }
    ];

    setTimeout(() => {
      setScheduleItems(mockScheduleItems);
      setLoading(false);
    }, 1000);
  }, [currentWeek]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const getItemsForDate = (date: Date) => {
    return scheduleItems.filter(item => {
      const matchesDate = isSameDay(item.date, date);
      const matchesFilter = selectedFilter === 'all' || item.priority === selectedFilter;
      return matchesDate && matchesFilter;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeItem = scheduleItems.find(item => item.id === active.id);
    const overDate = new Date(over.id as string);
    
    if (activeItem && !isSameDay(activeItem.date, overDate)) {
      const updatedItems = scheduleItems.map(item =>
        item.id === active.id ? { ...item, date: overDate } : item
      );
      
      setScheduleItems(updatedItems);
      
      toast({
        title: "Schedule Updated",
        description: `Moved ${activeItem.projectName} to ${format(overDate, 'MMM dd, yyyy')}`,
        duration: 3000,
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const filteredItems = scheduleItems.filter(item => 
    selectedFilter === 'all' || item.priority === selectedFilter
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading schedule...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn('w-full', className)} data-testid="visual-schedule">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Visual Schedule</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFilter('all')}
                  className={selectedFilter === 'all' ? 'bg-blue-100 text-blue-700' : ''}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFilter('high')}
                  className={selectedFilter === 'high' ? 'bg-red-100 text-red-700' : ''}
                >
                  High
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFilter('medium')}
                  className={selectedFilter === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                >
                  Medium
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFilter('low')}
                  className={selectedFilter === 'low' ? 'bg-green-100 text-green-700' : ''}
                >
                  Low
                </Button>
              </div>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
              data-testid="prev-week-btn"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="text-lg font-semibold">
              Week of {format(currentWeek, 'MMM dd, yyyy')}
            </h3>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
              data-testid="next-week-btn"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-7 gap-4 min-h-[400px]">
              {weekDays.map((day, index) => {
                const dayItems = getItemsForDate(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'p-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700',
                      'min-h-[300px] transition-colors duration-200',
                      isCurrentDay && 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/10'
                    )}
                    data-testid={`schedule-day-${index}`}
                    id={day.toISOString()}
                  >
                    <div className="text-center mb-4">
                      <div className={cn(
                        'text-sm font-medium',
                        isCurrentDay && 'text-blue-600 dark:text-blue-400'
                      )}>
                        {format(day, 'EEE')}
                      </div>
                      <div className={cn(
                        'text-xl font-bold',
                        isCurrentDay && 'text-blue-600 dark:text-blue-400'
                      )}>
                        {format(day, 'dd')}
                      </div>
                    </div>

                    <SortableContext
                      items={dayItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <AnimatePresence>
                        <div className="space-y-2">
                          {dayItems.map((item) => (
                            <DraggableScheduleItem key={item.id} item={item} />
                          ))}
                        </div>
                      </AnimatePresence>
                    </SortableContext>

                    {dayItems.length === 0 && (
                      <div className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No tasks scheduled
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DndContext>

          <div className="mt-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>High Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Medium Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Low Priority</span>
              </div>
            </div>
            <div>
              Total tasks: {filteredItems.length}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}