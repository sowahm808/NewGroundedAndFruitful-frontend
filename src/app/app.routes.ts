import { Routes } from '@angular/router';
import {
  authGuard,
  capabilityGuard,
  guestGuard,
  onboardingGuard,
  organizationRoleGuard,
  organizationSetupGuard,
  personalWorkspaceGuard,
  roleGuard,
} from './core/guards/auth.guards';
import { AppShellComponent } from './core/layout/app-shell.component';
export const routes: Routes = [
  {
    path: 'onboarding/organization',
    canActivate: [organizationSetupGuard],
    loadComponent: () =>
      import('./features/onboarding/organization-onboarding.component').then((m) => m.OrganizationOnboardingComponent),
  },
  {
    path: 'onboarding/account-type',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/onboarding/account-type.component').then((m) => m.AccountTypeComponent),
  },
  {
    path: 'onboarding/personal',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/onboarding/personal-onboarding.component').then((m) => m.PersonalOnboardingComponent),
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/create-account',
    canActivate: [guestGuard],
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
    canActivate: [authGuard, personalWorkspaceGuard],
    children: [
      {
        path: 'children/:childId',
        canActivate: [capabilityGuard(['parent.children.read'])],
        loadComponent: () =>
          import('./features/parent/children/parent-child-detail.component').then((m) => m.ParentChildDetailComponent),
      },
      {
        path: 'children',
        canActivate: [capabilityGuard(['parent.children.read'])],
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
        canActivate: [capabilityGuard(['parent.observations.create'])],
        loadComponent: () =>
          import('./features/parent/observations/parent-observations.component').then(
            (m) => m.ParentObservationsComponent,
          ),
      },
      {
        path: 'family',
        canActivate: [capabilityGuard(['family.activities.read'])],
        loadComponent: () =>
          import('./features/parent/family/parent-family.component').then((m) => m.ParentFamilyComponent),
      },
      {
        path: 'academic-support',
        canActivate: [capabilityGuard(['support.requests.create'])],
        loadComponent: () =>
          import('./features/parent/academic-support/parent-academic-support.component').then(
            (m) => m.ParentAcademicSupportComponent,
          ),
      },
      {
        path: 'participation',
        canActivate: [capabilityGuard(['parent.children.read'])],
        loadComponent: () =>
          import('./features/parent/participation/parent-participation.component').then(
            (m) => m.ParentParticipationComponent,
          ),
      },
      {
        path: 'notifications',
        canActivate: [capabilityGuard(['parent.notifications.read'])],
        loadComponent: () =>
          import('./features/parent/notifications/parent-notifications.component').then(
            (m) => m.ParentNotificationsComponent,
          ),
      },
      {
        path: 'reports',
        canActivate: [capabilityGuard(['parent.reports.read'])],
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
        canActivate: [roleGuard(['super_admin'])],
        loadComponent: () => import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'quarters',
        canActivate: [organizationRoleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/quarters/admin-quarters.component').then((m) => m.AdminQuartersComponent),
      },
      {
        path: 'organizations',
        canActivate: [roleGuard(['super_admin'])],
        loadComponent: () =>
          import('./features/admin/organizations/admin-organizations.component').then(
            (m) => m.AdminOrganizationsComponent,
          ),
      },
      {
        path: 'memberships',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () =>
          import('./features/admin/memberships/admin-memberships.component').then((m) => m.AdminMembershipsComponent),
      },

      {
        path: 'teams',
        canActivate: [organizationRoleGuard('admin'), capabilityGuard(['admin.teams.manage'])],
        loadComponent: () =>
          import('./features/admin/teams/admin-teams.component').then((m) => m.AdminTeamsComponent),
      },
      ...[
        ['assignments', 'assignments', 'admin.assignments.manage'],
        ['character', 'character', 'admin.character.manage'],
        ['family', 'family', 'admin.family_activities.manage'],
        ['books', 'books', 'admin.books.manage'],
        ['projects', 'projects', 'admin.projects.manage'],
        ['surveys', 'surveys', 'admin.surveys.manage'],
        ['points', 'points', 'admin.point_rules.manage'],
        ['awards', 'awards', 'admin.awards.manage'],
      ].map(([path, resource, capability]) => ({
        path,
        canActivate: [organizationRoleGuard('admin'), capabilityGuard([capability])],
        data: { resource },
        loadComponent: () => import('./features/admin/admin-pages.component').then((m) => m.AdminPageComponent),
      })),
      {
        path: 'participants',
        canActivate: [organizationRoleGuard('admin'), capabilityGuard(['admin.participants.manage'])],
        loadComponent: () =>
          import('./features/admin/participants/admin-participants.component').then(
            (m) => m.AdminParticipantsComponent,
          ),
      },
      {
        path: 'reports',
        canActivate: [organizationRoleGuard('admin'), capabilityGuard(['admin.reports.read'])],
        loadComponent: () =>
          import('./features/admin/reports/admin-reports.component').then((m) => m.AdminReportsComponent),
      },
      {
        path: 'roles',
        canActivate: [roleGuard(['super_admin'])],
        data: { resource: 'roles' },
        loadComponent: () => import('./features/admin/admin-pages.component').then((m) => m.AdminPageComponent),
      },
      {
        path: 'bible',
        canActivate: [organizationRoleGuard('admin')],
        loadComponent: () => import('./features/admin/bible/admin-bible.component').then((m) => m.AdminBibleComponent),
      },
      {
        path: 'bible/imports/new',
        canActivate: [organizationRoleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/bible/admin-bible-import.component').then((m) => m.AdminBibleImportComponent),
      },
      {
        path: 'bible/imports/:importId',
        canActivate: [organizationRoleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/bible/admin-bible-review.component').then((m) => m.AdminBibleReviewComponent),
      },
      {
        path: 'bible/content/:contentSetId',
        canActivate: [organizationRoleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/bible/admin-bible-content.component').then((m) => m.AdminBibleContentComponent),
      },
      {
        path: 'audit',
        canActivate: [roleGuard(['super_admin'])],
        data: { resource: 'audit' },
        loadComponent: () => import('./features/admin/admin-pages.component').then((m) => m.AdminPageComponent),
      },
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
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/system/role-required.component').then((m) => m.RoleRequiredComponent),
  },
  {
    path: 'account/invitation',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/system/invitation-required.component').then((m) => m.InvitationRequiredComponent),
  },
  {
    path: 'account/recovery',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/system/account-recovery.component').then((m) => m.AccountRecoveryComponent),
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
