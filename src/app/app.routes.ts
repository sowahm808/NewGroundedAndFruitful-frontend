import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guards';
import { AppShellComponent } from './core/layout/app-shell.component';

const feature = (title: string, area: string, highlights: readonly string[] = []) => ({
  loadComponent: () => import('./features/shared/feature-page.component').then((m) => m.FeaturePageComponent),
  data: { title, area, highlights },
});
const childLinks = [
  { label: 'Today', path: '/child/today' },
  { label: 'Character', path: '/child/character' },
  { label: 'Bible', path: '/child/bible' },
  { label: 'Reading', path: '/child/reading' },
  { label: 'Project', path: '/child/project' },
  { label: 'Team', path: '/child/team' },
];
const parentLinks = [
  { label: 'Children', path: '/parent/children' },
  { label: 'Character', path: '/parent/character' },
  { label: 'Observations', path: '/parent/observations' },
  { label: 'Family', path: '/parent/family' },
  { label: 'Support', path: '/parent/academic-support' },
  { label: 'Reports', path: '/parent/reports' },
];
const mentorLinks = [
  { label: 'Teams', path: '/mentor/teams' },
  { label: 'Projects', path: '/mentor/projects' },
  { label: 'Reading', path: '/mentor/reading' },
  { label: 'Encouragement', path: '/mentor/encouragement' },
];
const adminNames = [
  'users',
  'teams',
  'quarters',
  'character',
  'activities',
  'bible',
  'family',
  'books',
  'surveys',
  'points',
  'reports',
  'audit',
] as const;
export const routes: Routes = [
  { path: 'auth/login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  {
    path: 'auth/child',
    loadComponent: () => import('./features/auth/child-login.component').then((m) => m.ChildLoginComponent),
  },
  { path: 'auth/forgot-password', ...feature('Reset your password', 'Secure account recovery') },
  {
    path: 'child',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['child'])],
    data: { links: childLinks },
    children: [
      {
        path: 'today',
        loadComponent: () =>
          import('./features/child/child-dashboard.component').then((m) => m.ChildDashboardComponent),
      },
      {
        path: 'character',
        loadComponent: () =>
          import('./features/character/character-assessment.component').then((m) => m.CharacterAssessmentComponent),
      },
      { path: 'bible', ...feature('Bible Time', 'Read · Reflect · Remember', ['Today’s reading', 'Reflection']) },
      { path: 'reading', ...feature('Reading Journey', 'Weekly participation', ['Quarter book', 'Weekly reflection']) },
      {
        path: 'project',
        ...feature('My Project', 'Idea · Goal · Guidance · Plan · Action · Progress · Reflection · Completion', [
          'Current milestone',
          'Mentor guidance',
        ]),
      },
      { path: 'team', ...feature('Our Team', 'Composite team progress', ['Quarter target', 'My contribution']) },
      { path: '', pathMatch: 'full', redirectTo: 'today' },
    ],
  },
  {
    path: 'parent',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['parent'])],
    data: { links: parentLinks },
    children: [
      { path: 'children/:childId', ...feature('Child overview', 'Linked child') },
      {
        path: 'children',
        ...feature('Your children', 'Parent dashboard', ['Participation this week', 'Team progress']),
      },
      { path: 'character', ...feature('Character cycle', 'Five active qualities') },
      {
        path: 'observations',
        ...feature('Positive observations', 'Notice growth', ['Submit an observation', 'Under review']),
      },
      {
        path: 'family',
        ...feature('Family Connection', 'Talk · Pray · Serve · Play · Gratitude', ['This week’s activity']),
      },
      {
        path: 'academic-support',
        ...feature('Academic support', 'Help with dignity', ['Reading', 'Reading comprehension', 'Mathematics']),
      },
      { path: 'reports', ...feature('Reports', 'Participation and growth') },
      { path: '', pathMatch: 'full', redirectTo: 'children' },
    ],
  },
  {
    path: 'mentor',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['mentor'])],
    data: { links: mentorLinks },
    children: [
      { path: 'teams/:teamId', ...feature('Team detail', 'Assigned team') },
      { path: 'teams', ...feature('Assigned teams', 'Mentor dashboard', ['Quarter progress', 'Weekly participation']) },
      { path: 'projects', ...feature('Project guidance', 'Support each next step') },
      { path: 'reading', ...feature('Reading status', 'Participation overview') },
      { path: 'encouragement', ...feature('May need encouragement', 'Kind, timely support') },
      { path: '', pathMatch: 'full', redirectTo: 'teams' },
    ],
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['admin', 'super_admin'])],
    data: { links: adminNames.map((n) => ({ label: n[0].toUpperCase() + n.slice(1), path: '/admin/' + n })) },
    children: [
      ...adminNames.map((name) => ({
        path: name,
        ...feature(name[0].toUpperCase() + name.slice(1), 'Administration', ['Search and filter', 'Paginated records']),
      })),
      { path: '', pathMatch: 'full' as const, redirectTo: 'users' },
    ],
  },
  { path: 'unauthorized', ...feature('You do not have access', 'Authorization') },
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', redirectTo: 'auth/login' },
];
