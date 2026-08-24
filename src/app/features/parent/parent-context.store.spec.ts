import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { ActiveOrganizationService } from '../../core/organizations/active-organization.service';
import { ParentApi, CursorPage, ParentChild } from './parent-api.service';
import { ParentContextStore } from './parent-context.store';

describe('ParentContextStore', () => {
  const user = signal<{ uid: string } | null>({ uid: 'parent-a' });
  const generation = signal(1);
  const workspace = signal<string | null>('workspace-a');
  let children: jasmine.Spy;
  let store: ParentContextStore;

  beforeEach(() => {
    user.set({ uid: 'parent-a' });
    generation.set(1);
    workspace.set('workspace-a');
    children = jasmine.createSpy('children').and.returnValue(of({ items: [], hasMore: false }));
    TestBed.configureTestingModule({
      providers: [
        ParentContextStore,
        { provide: AuthService, useValue: { user: user.asReadonly(), sessionGeneration: generation.asReadonly() } },
        { provide: ActiveOrganizationService, useValue: { workspaceId: workspace.asReadonly() } },
        { provide: ParentApi, useValue: { children } },
      ],
    });
  });

  function create(): ParentContextStore {
    store = TestBed.inject(ParentContextStore);
    TestBed.flushEffects();
    return store;
  }
  it('loads once and treats a valid empty response as a terminal empty state', () => {
    create();
    TestBed.flushEffects();
    expect(children).toHaveBeenCalledTimes(1);
    expect(store.state()).toEqual({ status: 'empty', children: [] });
  });
  it('maps forbidden and dependency failures without throwing', () => {
    children.and.returnValue(
      throwError(() => new ApiError(403, 'relationship_forbidden', 'no', undefined, undefined, 'req-1')),
    );
    create();
    expect(store.state()).toEqual({ status: 'forbidden', requestId: 'req-1' });
    children.and.returnValue(throwError(() => new ApiError(503, 'dependency_failure', 'down')));
    store.retry();
    expect(store.state().status).toBe('dependency_error');
  });
  it('can retry and does not permanently cache an error', () => {
    children.and.returnValue(throwError(() => new ApiError(503, 'dependency_failure', 'down')));
    create();
    children.and.returnValue(of({ items: [], hasMore: false }));
    store.retry();
    expect(children).toHaveBeenCalledTimes(2);
    expect(store.state().status).toBe('empty');
  });
  it('does not publish a new state when the requested child is already selected', () => {
    children.and.returnValue(
      of({ items: [{ id: 'child-a', displayName: 'Child A', status: 'active' }], hasMore: false }),
    );
    create();
    expect(store.select('child-a')).toBeTrue();
    const selectedState = store.state();

    expect(store.select('child-a')).toBeTrue();
    expect(store.state()).toBe(selectedState);
  });
  it('cancels stale work and reloads for workspace, generation, logout and another user', () => {
    const pending = new Subject<CursorPage<ParentChild>>();
    children.and.returnValue(pending);
    create();
    expect(pending.observed).toBeTrue();
    workspace.set('workspace-b');
    TestBed.flushEffects();
    expect(pending.observed).toBeFalse();
    expect(children).toHaveBeenCalledTimes(2);
    generation.set(2);
    TestBed.flushEffects();
    user.set(null);
    TestBed.flushEffects();
    expect(store.state().status).toBe('unauthenticated');
    user.set({ uid: 'parent-b' });
    TestBed.flushEffects();
    expect(children).toHaveBeenCalledTimes(4);
  });
});
