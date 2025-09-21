import React, { useState } from 'react';
import { Save, Bell, Mail, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationType, NotificationPriority } from '../../types/notifications';

export interface NotificationSettingsProps {
  className?: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className = '' }) => {
  const { data: preferences, isLoading } = useNotifications.usePreferences();
  const updatePreferencesMutation = useNotifications.useUpdatePreferences();
  
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  const handleGlobalToggle = (field: 'emailEnabled' | 'inAppEnabled', value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev!,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: 'immediate' | 'daily' | 'weekly') => {
    setLocalPreferences(prev => ({
      ...prev!,
      frequency
    }));
    setHasChanges(true);
  };

  const handleDoNotDisturbChange = (field: 'doNotDisturbStart' | 'doNotDisturbEnd', value: string) => {
    setLocalPreferences(prev => ({
      ...prev!,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleTypePreferenceChange = (
    type: NotificationType, 
    field: 'email' | 'inApp', 
    value: boolean
  ) => {
    setLocalPreferences(prev => ({
      ...prev!,
      typePreferences: {
        ...prev!.typePreferences,
        [type]: {
          ...prev!.typePreferences[type],
          [field]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localPreferences || !hasChanges) return;

    try {
      await updatePreferencesMutation.mutateAsync(localPreferences);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const getNotificationTypeLabel = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.OVER_ALLOCATION:
        return 'Over-allocation Alerts';
      case NotificationType.PROJECT_DEADLINE:
        return 'Project Deadlines';
      case NotificationType.BUDGET_WARNING:
        return 'Budget Warnings';
      case NotificationType.NEW_ASSIGNMENT:
        return 'New Assignments';
      case NotificationType.APPROVAL_REQUEST:
        return 'Approval Requests';
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return 'System Announcements';
      case NotificationType.CAPACITY_WARNING:
        return 'Capacity Warnings';
      case NotificationType.PROJECT_MILESTONE:
        return 'Project Milestones';
      case NotificationType.RESOURCE_CONFLICT:
        return 'Resource Conflicts';
      default:
        return type;
    }
  };

  if (isLoading || !localPreferences) {
    return (
      <div className={`${className} flex items-center justify-center p-8`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`${className} max-w-4xl mx-auto space-y-6`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notification Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage how and when you receive notifications
          </p>
        </div>
        
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={updatePreferencesMutation.isLoading}
            className="flex items-center space-x-2"
          >
            <Save size={16} />
            <span>Save Changes</span>
          </Button>
        )}
      </div>

      {/* Global Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Bell size={20} className="mr-2" />
          Global Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail size={18} />
                <Label className="text-sm font-medium">Email Notifications</Label>
              </div>
              <Button
                variant={localPreferences.emailEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => handleGlobalToggle('emailEnabled', !localPreferences.emailEnabled)}
              >
                {localPreferences.emailEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Receive notifications via email
            </p>
          </div>

          {/* In-App Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell size={18} />
                <Label className="text-sm font-medium">In-App Notifications</Label>
              </div>
              <Button
                variant={localPreferences.inAppEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => handleGlobalToggle('inAppEnabled', !localPreferences.inAppEnabled)}
              >
                {localPreferences.inAppEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Show notifications in the application
            </p>
          </div>
        </div>

        {/* Frequency Settings */}
        <div className="mt-6">
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Clock size={18} className="mr-2" />
            Email Frequency
          </Label>
          <div className="flex space-x-2">
            {['immediate', 'daily', 'weekly'].map((freq) => (
              <Button
                key={freq}
                variant={localPreferences.frequency === freq ? "default" : "outline"}
                size="sm"
                onClick={() => handleFrequencyChange(freq as any)}
                className="capitalize"
              >
                {freq}
              </Button>
            ))}
          </div>
        </div>

        {/* Do Not Disturb */}
        <div className="mt-6">
          <Label className="text-sm font-medium mb-3 block flex items-center">
            {localPreferences.doNotDisturbStart ? <VolumeX size={18} className="mr-2" /> : <Volume2 size={18} className="mr-2" />}
            Do Not Disturb Hours
          </Label>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <Label className="text-xs text-gray-600 dark:text-gray-400">Start Time</Label>
              <input
                type="time"
                value={localPreferences.doNotDisturbStart || ''}
                onChange={(e) => handleDoNotDisturbChange('doNotDisturbStart', e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600 dark:text-gray-400">End Time</Label>
              <input
                type="time"
                value={localPreferences.doNotDisturbEnd || ''}
                onChange={(e) => handleDoNotDisturbChange('doNotDisturbEnd', e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Notifications will be delayed during these hours
          </p>
        </div>
      </Card>

      {/* Notification Types */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Notification Types</h3>
        <div className="space-y-4">
          {Object.values(NotificationType).map((type) => {
            const typePrefs = localPreferences.typePreferences[type];
            if (!typePrefs) return null;

            return (
              <div key={type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-sm">
                      {getNotificationTypeLabel(type)}
                    </h4>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {typePrefs.priority}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${type}-email`}
                      checked={typePrefs.email}
                      onChange={(e) => handleTypePreferenceChange(type, 'email', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={`${type}-email`} className="text-sm flex items-center">
                      <Mail size={14} className="mr-1" />
                      Email
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${type}-inapp`}
                      checked={typePrefs.inApp}
                      onChange={(e) => handleTypePreferenceChange(type, 'inApp', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={`${type}-inapp`} className="text-sm flex items-center">
                      <Bell size={14} className="mr-1" />
                      In-App
                    </Label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Save Button for Mobile */}
      {hasChanges && (
        <div className="md:hidden">
          <Button
            onClick={handleSave}
            disabled={updatePreferencesMutation.isLoading}
            className="w-full flex items-center justify-center space-x-2"
          >
            <Save size={16} />
            <span>Save Changes</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;