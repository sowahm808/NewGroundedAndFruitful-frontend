import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guards';
import { AppShellComponent } from './core/layout/app-shell.component';
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
      {
        path: 'more/surveys/:surveyId',
        loadComponent: () => import('./features/child/survey.component').then((m) => m.SurveyComponent),
      },
      { path: 'more', loadComponent: () => import('./features/child/more.component').then((m) => m.MoreComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'today' },
    ],
  },
  {
    path: 'parent',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['parent'])],
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
        path: 'participation',
        loadComponent: () =>
          import('./features/parent/participation/parent-participation.component').then(
            (m) => m.ParentParticipationComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/parent/notifications/parent-notifications.component').then(
            (m) => m.ParentNotificationsComponent,
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
    children: [
      {
        path: 'teams',
        loadComponent: () => import('./features/mentor/mentor-teams.component').then((m) => m.MentorTeamsComponent),
      },
      {
        path: 'teams/:teamId',
        loadComponent: () =>
          import('./features/mentor/mentor-team-detail.component').then((m) => m.MentorTeamDetailComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/mentor/mentor-projects.component').then((m) => m.MentorProjectsComponent),
      },
      {
        path: 'reading',
        loadComponent: () => import('./features/mentor/mentor-reading.component').then((m) => m.MentorReadingComponent),
      },
      {
        path: 'encouragement',
        loadComponent: () =>
          import('./features/mentor/mentor-encouragement.component').then((m) => m.MentorEncouragementComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'teams' },
    ],
  },
  {
    path: 'observer',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['observer'])],
    children: [
      {
        path: 'observations',
        loadComponent: () =>
          import('./features/observer/observer-observations.component').then((m) => m.ObserverObservationsComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'observations' },
    ],
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard(['admin', 'super_admin'])],
    children: [
      {
        path: 'users',
        loadComponent: () => import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      ...[
        'organizations',
        'memberships',
        'roles',
        'participants',
        'teams',
        'assignments',
        'quarters',
        'character',
        'bible',
        'family',
        'books',
        'projects',
        'surveys',
        'points',
        'reports',
        'awards',
        'audit',
      ].map((resource) => ({
        path: resource,
        data: { resource },
        loadComponent: () => import('./features/admin/admin-pages.component').then((m) => m.AdminPageComponent),
      })),
      { path: '', pathMatch: 'full', redirectTo: 'quarters' },
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
    loadComponent: () => import('./features/system/unauthorized.component').then((m) => m.UnauthorizedComponent),
  },
  {
    path: 'account/role-required',
    loadComponent: () => import('./features/system/role-required.component').then((m) => m.RoleRequiredComponent),
  },
  {
    path: 'account/pending',
    loadComponent: () => import('./features/system/approval-pending.component').then((m) => m.ApprovalPendingComponent),
  },
  {
    path: 'account/disabled',
    loadComponent: () => import('./features/system/account-disabled.component').then((m) => m.AccountDisabledComponent),
  },
  {
    path: 'account/session-error',
    loadComponent: () => import('./features/system/session-error.component').then((m) => m.SessionErrorComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', loadComponent: () => import('./features/system/not-found.component').then((m) => m.NotFoundComponent) },
];
