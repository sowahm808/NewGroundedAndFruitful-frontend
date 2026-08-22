import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminApiService } from './admin-api.service';
import { AdminResourceComponent, AdminResourceDefinition } from './admin-resource.component';

const participants: AdminResourceDefinition = {
  resource: 'participants',
  title: 'Participants',
  description: 'Manage participant enrollment without exposing private journey content.',
  statuses: ['pending', 'active', 'withdrawn'],
  sorts: [{ value: '-updatedAt', label: 'Recently updated' }],
  actions: {},
};

@Component({
  standalone: true,
  imports: [AdminResourceComponent],
  template: `<gf-admin-resource [definition]="definition()" />`,
})
class TestHostComponent {
  readonly definition = input.required<AdminResourceDefinition>();
}

describe('AdminResourceComponent required input lifecycle', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let api: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['list', 'command']);
    api.list.and.returnValue(of({ items: [], page: 1, pageSize: 25, total: 0 }));
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: AdminApiService, useValue: api }],
    });
  });

  it('does not read definition before the parent binds it', fakeAsync(() => {
    fixture = TestBed.createComponent(TestHostComponent);

    expect(() => flushMicrotasks()).not.toThrow();
    expect(api.list).not.toHaveBeenCalled();

    fixture.componentRef.setInput('definition', participants);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(api.list).toHaveBeenCalledOnceWith('participants', {
      page: 1,
      pageSize: 25,
      sort: '-updatedAt',
    });
  }));

  it('terminates loading and renders the participant empty state', () => {
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentRef.setInput('definition', participants);
    fixture.detectChanges();

    const resource = fixture.debugElement.children[0].componentInstance as AdminResourceComponent;
    expect(resource.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('No participants have been enrolled.');
  });
});
