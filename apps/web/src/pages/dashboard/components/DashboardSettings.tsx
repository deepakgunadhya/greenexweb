/**
 * DashboardSettings Component
 * Dropdown panel for toggling widget visibility on the dashboard.
 * Follows the ContentSettings pattern (dropdown + Switch toggles).
 */

import React, { useState, useMemo } from 'react';
import { Settings, LayoutGrid, BarChart3, User, Layers } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  setWidgetVisibility,
  updateWidgetPreferences,
  selectWidgetPreferences,
} from '../../../store/slices/dashboardSlice';
import {
  getPermittedWidgetDefinitions,
} from './WidgetRegistry';
import type { DashboardWidgetDefinition } from '../../../types/dashboard';

interface DashboardSettingsProps {
  userPermissions: string[];
}

const CATEGORY_META: Record<
  DashboardWidgetDefinition['category'],
  { label: string; icon: React.ReactNode }
> = {
  overview: { label: 'Overview', icon: <LayoutGrid className="w-4 h-4" /> },
  analytics: { label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  personal: { label: 'Personal', icon: <User className="w-4 h-4" /> },
  secondary: { label: 'Additional', icon: <Layers className="w-4 h-4" /> },
};

const CATEGORY_ORDER: DashboardWidgetDefinition['category'][] = [
  'overview',
  'analytics',
  'personal',
  'secondary',
];

export const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  userPermissions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const preferences = useAppSelector(selectWidgetPreferences);

  const permittedWidgets = useMemo(
    () => getPermittedWidgetDefinitions(userPermissions),
    [userPermissions]
  );

  const groupedWidgets = useMemo(() => {
    const groups: Record<string, DashboardWidgetDefinition[]> = {};
    for (const widget of permittedWidgets) {
      if (!groups[widget.category]) groups[widget.category] = [];
      groups[widget.category].push(widget);
    }
    return groups;
  }, [permittedWidgets]);

  const visibleCount = permittedWidgets.filter(
    (w) => !preferences.hiddenWidgets.includes(w.id)
  ).length;

  const handleToggle = (widgetId: string, visible: boolean) => {
    // Optimistic update
    dispatch(setWidgetVisibility({ widgetId, visible }));

    // Build updated list and persist
    let newHidden: string[];
    if (visible) {
      newHidden = preferences.hiddenWidgets.filter((id) => id !== widgetId);
    } else {
      newHidden = [...preferences.hiddenWidgets, widgetId];
    }
    dispatch(updateWidgetPreferences({ hiddenWidgets: newHidden }));
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <Settings className="w-4 h-4" />
        <span>Widgets</span>
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Dashboard Widgets</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {visibleCount} of {permittedWidgets.length} widgets visible
            </p>
          </div>

          {/* Widget Groups */}
          <div className="p-4 space-y-5 max-h-96 overflow-y-auto">
            {CATEGORY_ORDER.map((category) => {
              const widgets = groupedWidgets[category];
              if (!widgets || widgets.length === 0) return null;

              const meta = CATEGORY_META[category];
              return (
                <div key={category}>
                  <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center space-x-2">
                    {meta.icon}
                    <span>{meta.label}</span>
                  </h4>
                  <div className="space-y-2">
                    {widgets.map((widget) => {
                      const isVisible = !preferences.hiddenWidgets.includes(widget.id);
                      return (
                        <div
                          key={widget.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg"
                        >
                          <div className="min-w-0 mr-3">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {widget.label}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {widget.description}
                            </p>
                          </div>
                          <Switch
                            checked={isVisible}
                            onChange={(checked) => handleToggle(widget.id, checked)}
                            size="sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Close
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
