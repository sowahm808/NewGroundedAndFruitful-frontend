import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guards';
import { AppShellComponent } from './core/layout/app-shell.component';
interface NavigationItem {
  readonly label: string;
  readonly path: string;
  readonly icon?: string;
  readonly exact?: boolean;
}
const childLinks: readonly NavigationItem[] = [
  { label: 'Today', path: '/child/today' },
  { label: 'Character', path: '/child/character' },
  { label: 'Bible', path: '/child/bible' },
  { label: 'Reading', path: '/child/reading' },
  { label: 'Project', path: '/child/project' },
  { label: 'Team', path: '/child/team' },
  { label: 'More', path: '/child/more' },
];
const parentLinks: readonly NavigationItem[] = [
  { label: 'Children', path: '/parent/children' },
  { label: 'Character', path: '/parent/character' },
  { label: 'Observations', path: '/parent/observations' },
  { label: 'Family', path: '/parent/family' },
  { label: 'Support', path: '/parent/academic-support' },
  { label: 'Reports', path: '/parent/reports' },
];
const mentorLinks: readonly NavigationItem[] = [
  { label: 'Teams', path: '/mentor/teams' },
  { label: 'Projects', path: '/mentor/projects' },
  { label: 'Reading', path: '/mentor/reading' },
  { label: 'Encouragement', path: '/mentor/encouragement' },
];
const observerLinks: readonly NavigationItem[] = [{ label: 'Observations', path: '/observer/observations' }];
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
const unavailable = () =>
  import('./features/shared/unavailable-page.component').then((m) => m.UnavailablePageComponent);
export const routes: Routes = [
  { path: 'auth/login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  {
    path: 'auth/create-account',
    loadComponent: () => import('./features/auth/create-account.component').then((m) => m.CreateAccountComponent),
  },
  {
    path: 'auth/child',
    loadComponent: () => import('./features/auth/child-login.component').then((m) => m.ChildLoginComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/password-reset.component').then((m) => m.PasswordResetComponent),
  },
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
        path: 'check-in',
        loadComponent: () => import('./features/child/check-in.component').then((m) => m.CheckInComponent),
      },
      {
        path: 'gratitude',
        loadComponent: () => import('./features/child/gratitude.component').then((m) => m.GratitudeComponent),
      },
      {
        path: 'character',
        loadComponent: () => import('./features/child/character.component').then((m) => m.CharacterComponent),
      },
      { path: 'bible', loadComponent: () => import('./features/child/bible.component').then((m) => m.BibleComponent) },
      {
        path: 'reading',
        loadComponent: () => import('./features/child/reading.component').then((m) => m.ReadingComponent),
      },
      {
        path: 'project',
        loadComponent: () => import('./features/child/project.component').then((m) => m.ProjectComponent),
      },
      { path: 'team', loadComponent: () => import('./features/child/team.component').then((m) => m.TeamComponent) },
      { path: 'more', loadComponent: () => import('./features/child/more.component').then((m) => m.MoreComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'today' },
    ],
  },
  {
    path: 'parent',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['parent'])],
    data: { links: parentLinks },
    children: [
      {
        path: 'children/:childId',
        loadComponent: () =>
          import('./features/parent/children/parent-child-detail.component').then((m) => m.ParentChildDetailComponent),
      },
      {
        path: 'children',
        loadComponent: () =>
          import('./features/parent/children/parent-children.component').then((m) => m.ParentChildrenComponent),
      },
      {
        path: 'character',
        loadComponent: () =>
          import('./features/parent/character/parent-character.component').then((m) => m.ParentCharacterComponent),
      },
      {
        path: 'observations',
        loadComponent: () =>
          import('./features/parent/observations/parent-observations.component').then(
            (m) => m.ParentObservationsComponent,
          ),
      },
      {
        path: 'family',
        loadComponent: () =>
          import('./features/parent/family/parent-family.component').then((m) => m.ParentFamilyComponent),
      },
      {
        path: 'academic-support',
        loadComponent: () =>
          import('./features/parent/academic-support/parent-academic-support.component').then(
            (m) => m.ParentAcademicSupportComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/parent/reports/parent-reports.component').then((m) => m.ParentReportsComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'children' },
    ],
  },
  {
    path: 'mentor',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['mentor'])],
    data: { links: mentorLinks },
    children: [
      ...['teams', 'teams/:teamId', 'projects', 'reading', 'encouragement'].map((path) => ({
        path,
        loadComponent: unavailable,
        data: { title: 'Mentor feature', eyebrow: 'Unavailable' },
      })),
      { path: '', pathMatch: 'full', redirectTo: 'teams' },
    ],
  },
  {
    path: 'observer',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['observer'])],
    data: { links: observerLinks },
    children: [
      { path: 'observations', loadComponent: unavailable, data: { title: 'Observations', eyebrow: 'Observer' } },
      { path: '', pathMatch: 'full', redirectTo: 'observations' },
    ],
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['admin', 'super_admin'])],
    data: { links: adminNames.map((n) => ({ label: n[0].toUpperCase() + n.slice(1), path: '/admin/' + n })) },
    children: [
      {
        path: 'quarters',
        loadComponent: () =>
          import('./features/admin/quarters/admin-quarters.component').then((m) => m.AdminQuartersComponent),
      },
      ...adminNames
        .filter((name) => name !== 'quarters')
        .map((name) => ({
          path: name,
          loadComponent: unavailable,
          data: { title: name[0].toUpperCase() + name.slice(1), eyebrow: 'Administration' },
        })),
      { path: '', pathMatch: 'full', redirectTo: 'users' },
    ],
  },
  {
    path: 'account/profile',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/account/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  {
    path: 'unauthorized',
    loadComponent: unavailable,
    data: { title: 'You do not have access', eyebrow: 'Authorization' },
  },
  {
    path: 'account/role-required',
    loadComponent: unavailable,
    data: {
      title: 'Your account needs a role',
      eyebrow: 'Account status',
      message: 'Contact an administrator to request a program role.',
    },
  },
  {
    path: 'account/pending',
    loadComponent: unavailable,
    data: {
      title: 'Approval pending',
      eyebrow: 'Account status',
      message: 'Your program membership is awaiting approval.',
    },
  },
  {
    path: 'account/disabled',
    loadComponent: unavailable,
    data: {
      title: 'Account unavailable',
      eyebrow: 'Account status',
      message: 'This account is disabled or suspended. Contact an administrator.',
    },
  },
  {
    path: 'account/session-error',
    loadComponent: unavailable,
    data: { title: 'Session unavailable', eyebrow: 'Account status', message: 'Return to sign in and retry.' },
  },
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: '**',
    loadComponent: unavailable,
    data: { title: 'Page not found', eyebrow: '404', message: 'Check the address or use your dashboard navigation.' },
  },
];
