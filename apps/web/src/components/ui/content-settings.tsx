import React, { useState } from 'react';
import { Settings, Users, Eye, EyeOff, Star, Smartphone, Globe, Shield } from 'lucide-react';
import { Button } from './button';
import { Switch } from './switch';

export interface ContentSettingsProps {
  isPublic: boolean;
  isFeatured: boolean;
  showInApp: boolean;
  onSettingsChange: (settings: {
    isPublic?: boolean;
    isFeatured?: boolean;
    showInApp?: boolean;
  }) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const ContentSettings: React.FC<ContentSettingsProps> = ({
  isPublic,
  isFeatured,
  showInApp,
  onSettingsChange,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSettingChange = async (setting: string, value: boolean) => {
    setIsLoading(true);
    try {
      await onSettingsChange({ [setting]: value });
    } catch (error) {
      console.error(`Failed to update ${setting}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Settings Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className="flex items-center space-x-2"
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </Button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Content Settings</span>
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Configure visibility and promotional settings
            </p>
          </div>
          
          <div className="p-4 space-y-6">
            {/* Audience Targeting */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Audience Targeting</span>
              </h4>
              
              <div className="space-y-4">
                {/* Public/Private Setting */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPublic ? 'bg-green-100' : 'bg-orange-100'}`}>
                      {isPublic ? (
                        <Globe className="w-4 h-4 text-green-600" />
                      ) : (
                        <Shield className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {isPublic ? 'Public Content' : 'Private Content'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {isPublic 
                          ? 'Visible to all users and website visitors'
                          : 'Only visible to authenticated users'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isPublic}
                    onChange={(checked) => handleSettingChange('isPublic', checked)}
                    disabled={isLoading}
                  />
                </div>

                {/* Mobile App Visibility */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${showInApp ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      <Smartphone className={`w-4 h-4 ${showInApp ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Mobile App Visibility
                      </p>
                      <p className="text-xs text-slate-600">
                        {showInApp 
                          ? 'Content will appear in the mobile app'
                          : 'Content is hidden from mobile app'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={showInApp}
                    onChange={(checked) => handleSettingChange('showInApp', checked)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Featured Content */}
            <div className="border-t border-slate-200 pt-6">
              <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span>Promotional Settings</span>
              </h4>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isFeatured ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <Star className={`w-4 h-4 ${isFeatured ? 'text-amber-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Featured Content
                    </p>
                    <p className="text-xs text-slate-600">
                      {isFeatured 
                        ? 'Content is promoted and highlighted'
                        : 'Content appears in regular listings'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isFeatured}
                  onChange={(checked) => handleSettingChange('isFeatured', checked)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Settings Summary */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Current Configuration
              </h4>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  isPublic 
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-orange-100 text-orange-800 border border-orange-200'
                }`}>
                  {isPublic ? (
                    <>
                      <Globe className="w-3 h-3 mr-1" />
                      Public
                    </>
                  ) : (
                    <>
                      <Shield className="w-3 h-3 mr-1" />
                      Private
                    </>
                  )}
                </span>
                
                {isFeatured && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-200 rounded-full">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </span>
                )}
                
                {showInApp && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 border border-blue-200 rounded-full">
                    <Smartphone className="w-3 h-3 mr-1" />
                    Mobile
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Close Settings
            </Button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
};

export interface ContentVisibilityIndicatorProps {
  isPublic: boolean;
  isFeatured: boolean;
  showInApp: boolean;
  className?: string;
}

export const ContentVisibilityIndicator: React.FC<ContentVisibilityIndicatorProps> = ({
  isPublic,
  isFeatured,
  showInApp,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Audience Indicator */}
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
        isPublic 
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-orange-100 text-orange-800 border border-orange-200'
      }`}>
        {isPublic ? (
          <>
            <Eye className="w-3 h-3" />
            <span>Public</span>
          </>
        ) : (
          <>
            <EyeOff className="w-3 h-3" />
            <span>Private</span>
          </>
        )}
      </div>

      {/* Featured Indicator */}
      {isFeatured && (
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          <Star className="w-3 h-3" />
          <span>Featured</span>
        </div>
      )}

      {/* Mobile App Indicator */}
      {showInApp && (
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <Smartphone className="w-3 h-3" />
          <span>Mobile</span>
        </div>
      )}
    </div>
  );
};