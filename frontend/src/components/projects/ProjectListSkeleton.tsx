import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div 
    className={`animate-pulse bg-gray-200 rounded ${className}`} 
  />
);

export function ProjectListSkeleton() {
  return (
    <div data-testid="project-list-skeleton">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          
          {/* Search and filters skeleton */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Skeleton className="flex-1 h-10" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardHeader>

        <CardContent>
          {/* Table header skeleton */}
          <div className="border rounded-lg">
            <div className="border-b p-4">
              <div className="grid grid-cols-7 gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            
            {/* Table rows skeleton */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-b last:border-b-0 p-4">
                <div className="grid grid-cols-7 gap-4 items-center">
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <div>
                    <Skeleton className="h-2 w-full mb-1" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination skeleton */}
          <div className="flex items-center justify-between mt-6">
            <Skeleton className="h-4 w-40" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}