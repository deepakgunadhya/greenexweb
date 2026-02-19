import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import contentReducer from './slices/contentSlice';
import categoriesReducer from './slices/categoriesSlice';
import tagsReducer from './slices/tagsSlice';
import meetingsReducer from './slices/meetingsSlice';
import quotationsReducer from './slices/quotationsSlice';
import servicesReducer from './slices/servicesSlice';
import checklistsReducer from './slices/checklistsSlice';
import projectChecklistsReducer from './slices/projectChecklistsSlice';
import templateFilesReducer from './slices/templateFilesSlice';
import projectTemplateAssignmentsReducer from './slices/projectTemplateAssignmentsSlice';
import clientQuotationsReducer from './slices/clientQuotationsSlice';
import clientMeetingsReducer from './slices/clientMeetingsSlice';
import clientProjectsReducer from './slices/clientProjectsSlice';
import clientAuthReducer from './slices/clientAuthSlice';
import projectTasksReducer from './slices/projectTasksSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    content: contentReducer,
    categories: categoriesReducer,
    tags: tagsReducer,
    meetings: meetingsReducer,
    quotations: quotationsReducer,
    services: servicesReducer,
    checklists: checklistsReducer,
    projectChecklists: projectChecklistsReducer,
    templateFiles: templateFilesReducer,
    projectTemplateAssignments: projectTemplateAssignmentsReducer,
    clientQuotations: clientQuotationsReducer,
    clientMeetings: clientMeetingsReducer,
    clientProjects: clientProjectsReducer,
    clientAuth: clientAuthReducer,
    projectTasks: projectTasksReducer,
    dashboard: dashboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }),
  devTools: import.meta.env.VITE_NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;