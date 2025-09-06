/**
 * Data Export & Sharing Component
 * Beautiful export modal with multiple format options and sharing functionality
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Download, Mail, FileSpreadsheet, FileText, Share2, Filter, Settings } from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { useToast } from '../ui/use-toast';
import { cn } from '../../lib/utils';

type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';
type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ExportType = 'projects' | 'employees' | 'allocations' | 'schedule' | 'analytics';

interface ExportConfig {
  format: ExportFormat;
  type: ExportType;
  dateRange: DateRange;
  customStartDate?: Date;
  customEndDate?: Date;
  includeDetails: boolean;
  includeCharts: boolean;
  filterByDepartment?: string;
  filterByStatus?: string;
}

interface ShareConfig {
  emails: string[];
  subject: string;
  message: string;
  includeLink: boolean;
  expirationDays: number;
}

interface DataExportProps {
  defaultType?: ExportType;
  onExport?: (config: ExportConfig) => Promise<void>;
  onShare?: (config: ShareConfig, exportConfig: ExportConfig) => Promise<void>;
  trigger?: React.ReactNode;
}

const exportFormats = [
  {
    format: 'csv' as ExportFormat,
    name: 'CSV',
    icon: FileText,
    description: 'Comma-separated values for spreadsheet applications',
    size: '~50KB',
    color: 'text-green-600'
  },
  {
    format: 'excel' as ExportFormat,
    name: 'Excel',
    icon: FileSpreadsheet,
    description: 'Microsoft Excel with charts and formatting',
    size: '~200KB',
    color: 'text-blue-600'
  },
  {
    format: 'pdf' as ExportFormat,
    name: 'PDF',
    icon: FileText,
    description: 'Print-ready document with visualizations',
    size: '~500KB',
    color: 'text-red-600'
  },
  {
    format: 'json' as ExportFormat,
    name: 'JSON',
    icon: FileText,
    description: 'Raw data for API integration',
    size: '~30KB',
    color: 'text-purple-600'
  }
];

const dateRangeOptions = [
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last 3 months' },
  { value: 'year', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' }
];

const exportTypes = [
  { value: 'projects', label: 'Projects', description: 'Project details, timelines, and status' },
  { value: 'employees', label: 'Employees', description: 'Employee information and availability' },
  { value: 'allocations', label: 'Allocations', description: 'Resource allocation and capacity data' },
  { value: 'schedule', label: 'Schedule', description: 'Weekly schedules and assignments' },
  { value: 'analytics', label: 'Analytics', description: 'Reports and performance metrics' }
];

export default function DataExport({ defaultType = 'projects', onExport, onShare, trigger }: DataExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    type: defaultType,
    dateRange: 'month',
    includeDetails: true,
    includeCharts: false
  });
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    emails: [],
    subject: 'Resource Management Report',
    message: '',
    includeLink: true,
    expirationDays: 7
  });
  const [emailInput, setEmailInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      if (onExport) {
        await onExport(exportConfig);
      } else {
        // Mock export functionality
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      clearInterval(progressInterval);
      setExportProgress(100);

      toast({
        title: "Export Completed",
        description: `Your ${exportConfig.type} data has been exported as ${exportConfig.format.toUpperCase()}`,
        duration: 5000,
      });

      setTimeout(() => {
        setIsOpen(false);
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);

    } catch (error) {
      setIsExporting(false);
      setExportProgress(0);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (shareConfig.emails.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one email address to share the report.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (onShare) {
        await onShare(shareConfig, exportConfig);
      } else {
        // Mock share functionality
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({
        title: "Report Shared",
        description: `Report shared with ${shareConfig.emails.length} recipient(s)`,
        duration: 5000,
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Sharing Failed",
        description: "There was an error sharing your report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addEmail = () => {
    if (emailInput && !shareConfig.emails.includes(emailInput)) {
      setShareConfig(prev => ({
        ...prev,
        emails: [...prev.emails, emailInput]
      }));
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setShareConfig(prev => ({
      ...prev,
      emails: prev.emails.filter(e => e !== email)
    }));
  };

  const formatOptions = exportFormats.map(format => ({
    ...format,
    selected: format.format === exportConfig.format
  }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="data-export-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Export & Share Data</span>
          </DialogTitle>
          <DialogDescription>
            Export your resource management data in various formats or share reports with your team.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" data-testid="export-tab">Export</TabsTrigger>
            <TabsTrigger value="share" data-testid="share-tab">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-6">
            {/* Export Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Data Type</Label>
              <Select
                value={exportConfig.type}
                onValueChange={(value: ExportType) => 
                  setExportConfig(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger data-testid="export-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <div className="grid grid-cols-2 gap-3">
                {formatOptions.map((format) => (
                  <motion.div
                    key={format.format}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-md',
                        format.selected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      )}
                      onClick={() => setExportConfig(prev => ({ ...prev, format: format.format }))}
                      data-testid={`format-${format.format}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <format.icon className={cn('h-6 w-6 mt-1', format.color)} />
                          <div className="flex-1">
                            <div className="font-medium">{format.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{format.description}</div>
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {format.size}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Range</Label>
                <Select
                  value={exportConfig.dateRange}
                  onValueChange={(value: DateRange) =>
                    setExportConfig(prev => ({ ...prev, dateRange: value }))
                  }
                >
                  <SelectTrigger data-testid="date-range-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {exportConfig.dateRange === 'custom' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Custom Range</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      placeholder="Start date"
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        customStartDate: new Date(e.target.value)
                      }))}
                    />
                    <Input
                      type="date"
                      placeholder="End date"
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        customEndDate: new Date(e.target.value)
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Export Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Options</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Include Details</div>
                    <div className="text-xs text-gray-500">Include detailed descriptions and metadata</div>
                  </div>
                  <Switch
                    checked={exportConfig.includeDetails}
                    onCheckedChange={(checked) =>
                      setExportConfig(prev => ({ ...prev, includeDetails: checked }))
                    }
                    data-testid="include-details-switch"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Include Charts</div>
                    <div className="text-xs text-gray-500">Add visualizations to PDF exports</div>
                  </div>
                  <Switch
                    checked={exportConfig.includeCharts}
                    onCheckedChange={(checked) =>
                      setExportConfig(prev => ({ ...prev, includeCharts: checked }))
                    }
                    disabled={exportConfig.format === 'csv' || exportConfig.format === 'json'}
                  />
                </div>
              </div>
            </div>

            {/* Export Progress */}
            <AnimatePresence>
              {isExporting && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium">Exporting...</Label>
                  <Progress value={exportProgress} className="w-full" />
                  <div className="text-xs text-gray-500 text-center">
                    {exportProgress < 100 ? 'Preparing your data...' : 'Complete!'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="share" className="space-y-6">
            {/* Email Recipients */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Recipients</Label>
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                  data-testid="email-input"
                />
                <Button onClick={addEmail} variant="outline">
                  Add
                </Button>
              </div>

              {shareConfig.emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {shareConfig.emails.map((email, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center space-x-1"
                      data-testid={`email-tag-${index}`}
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => removeEmail(email)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Subject and Message */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Subject</Label>
              <Input
                value={shareConfig.subject}
                onChange={(e) => setShareConfig(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                data-testid="email-subject"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Message (Optional)</Label>
              <Textarea
                value={shareConfig.message}
                onChange={(e) => setShareConfig(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message..."
                rows={4}
                data-testid="email-message"
              />
            </div>

            {/* Share Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Share Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Include Download Link</div>
                    <div className="text-xs text-gray-500">Recipients can download the original file</div>
                  </div>
                  <Switch
                    checked={shareConfig.includeLink}
                    onCheckedChange={(checked) =>
                      setShareConfig(prev => ({ ...prev, includeLink: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Link Expiration</Label>
                  <Select
                    value={shareConfig.expirationDays.toString()}
                    onValueChange={(value) =>
                      setShareConfig(prev => ({ ...prev, expirationDays: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="0">Never expires</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <div className="flex space-x-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center space-x-2"
              data-testid="export-button"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </Button>
            <Button
              onClick={handleShare}
              variant="secondary"
              className="flex items-center space-x-2"
              data-testid="share-button"
            >
              <Mail className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}