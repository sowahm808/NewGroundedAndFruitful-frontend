import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { AdminQuartersApiService, QuarterList, QuarterQuery } from '../quarters/admin-quarters-api.service';
import { AdminBibleApiService } from './admin-bible-api.service';
import { AdminBibleImportComponent } from './admin-bible-import.component';

describe('AdminBibleImportComponent', () => {
  let fixture: ComponentFixture<AdminBibleImportComponent>;
  let component: AdminBibleImportComponent;
  let quarterResponses: Observable<QuarterList>[];
  let quarterQueries: QuarterQuery[];
  let createImport: jasmine.Spy;

  const autumn = {
    id: 'quarter-autumn',
    name: 'Autumn 2026',
    startsOn: '2026-09-01',
    endsOn: '2026-11-30',
    status: 'active' as const,
    updatedAt: '2026-08-20T12:00:00Z',
    version: 1,
    allowedActions: [],
  };
  const page = (items = [autumn], current = 1, totalPages = 1): QuarterList => ({
    items,
    pagination: { page: current, pageSize: 100, total: items.length, totalPages },
  });

  beforeEach(async () => {
    quarterResponses = [of(page())];
    quarterQueries = [];
    createImport = jasmine.createSpy('createImport').and.returnValue(of({ id: 'import-1', status: 'uploaded' }));
    await TestBed.configureTestingModule({
      imports: [AdminBibleImportComponent],
      providers: [
        provideRouter([]),
        {
          provide: AdminQuartersApiService,
          useValue: {
            list: (query: QuarterQuery) => {
              quarterQueries.push(query);
              const response = quarterResponses.shift();
              if (!response) throw new Error('Unexpected quarter request');
              return response;
            },
          },
        },
        { provide: AdminBibleApiService, useValue: { createImport } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminBibleImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('uses the canonical serialized query and populates canonical option values', () => {
    expect(quarterQueries).toEqual([{ page: 1, pageSize: 100, sort: '-updatedAt' }]);
    expect(JSON.stringify(quarterQueries)).not.toContain('startsOn');
    const option = fixture.nativeElement.querySelector('option[value="quarter-autumn"]') as HTMLOptionElement;
    expect(option.textContent).toContain('Autumn 2026');
  });

  it('loads every tenant-scoped page rather than assuming 100 is exhaustive', () => {
    quarterResponses = [of(page([], 1, 2)), of(page([{ ...autumn, id: 'quarter-winter', name: 'Winter 2026' }], 2, 2))];
    component.loadQuarters();
    fixture.detectChanges();
    expect(quarterQueries.slice(-2)).toEqual([
      { page: 1, pageSize: 100, sort: '-updatedAt' },
      { page: 2, pageSize: 100, sort: '-updatedAt' },
    ]);
    expect(component.quarters().map(({ id }) => id)).toEqual(['quarter-winter']);
  });

  it('renders loading, failure, retry, and empty states without submitting', () => {
    const pending = new Subject<QuarterList>();
    quarterResponses = [
      pending,
      throwError(() => new ApiError(422, 'validation_error', 'Invalid query')),
      of(page([])),
    ];
    component.loadQuarters();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading quarters…');
    pending.error(new ApiError(500, 'dependency_failure', 'failed'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Quarters could not be loaded.');
    quarterResponses.shift();
    (fixture.nativeElement.querySelector('.quarter-error button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No quarters are available.');
    expect(createImport).not.toHaveBeenCalled();
  });

  it('preserves selection during unrelated changes and submits the quarter ID', () => {
    component.form.setValue({ title: 'Autumn quiz', quarterId: autumn.id });
    component.form.controls.title.setValue('Updated quiz title');
    const question = new File(['questions'], 'questions.docx');
    const answer = new File(['answers'], 'answers.docx');
    component.selectQuestion({ target: { files: [question] } } as unknown as Event);
    component.selectAnswer({ target: { files: [answer] } } as unknown as Event);
    expect(component.form.controls.quarterId.value).toBe(autumn.id);
    component.submit();
    expect(createImport).toHaveBeenCalledOnceWith('Updated quiz title', autumn.id, question, answer);
  });

  it('keeps upload disabled until a quarter and both documents are selected', () => {
    component.form.controls.title.setValue('Autumn quiz');
    fixture.detectChanges();
    const upload = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(upload.disabled).toBeTrue();
    component.form.controls.quarterId.setValue(autumn.id);
    fixture.detectChanges();
    expect(upload.disabled).toBeTrue();
  });
});
