import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorHandler, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';
import { AdminQuartersApiService, Quarter, QuarterList, QuarterQuery } from '../quarters/admin-quarters-api.service';
import { AdminBibleApiService } from './admin-bible-api.service';
import { AdminBibleImportComponent } from './admin-bible-import.component';

describe('AdminBibleImportComponent', () => {
  let fixture: ComponentFixture<AdminBibleImportComponent>;
  let component: AdminBibleImportComponent;
  let quarterResponses: Observable<QuarterList>[];
  let quarterQueries: QuarterQuery[];
  let createImport: jasmine.Spy;
  let organizationId: ReturnType<typeof signal<string | null>>;
  let workspaceChanges: Subject<void>;
  let errorHandler: jasmine.SpyObj<ErrorHandler>;

  const autumn = {
    id: 'quarter-autumn',
    name: 'Autumn 2026',
    description: null,
    startDate: '2026-09-01' as Quarter['startDate'],
    endDate: '2026-11-30' as Quarter['endDate'],
    status: 'open' as const,
    workspaceId: 'organization-1',
    workspaceName: 'Workspace',
    statusLabel: 'Open',
    updatedAt: new Date('2026-08-20T12:00:00Z'),
    updatedAtIso: '2026-08-20T12:00:00Z',
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
    organizationId = signal<string | null>('organization-1');
    workspaceChanges = new Subject<void>();
    errorHandler = jasmine.createSpyObj<ErrorHandler>('ErrorHandler', ['handleError']);
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
        { provide: AdminBibleApiService, useValue: { createBibleContentImport: createImport } },
        { provide: ActiveOrganizationService, useValue: { organizationId, workspaceChanged$: workspaceChanges } },
        { provide: ErrorHandler, useValue: errorHandler },
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
    expect(createImport).toHaveBeenCalledOnceWith({
      organizationId: 'organization-1',
      quarterId: autumn.id,
      title: 'Updated quiz title',
      quizFile: question,
      answerKeyFile: answer,
      idempotencyKey: jasmine.any(String),
    });
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

  it('blocks upload without authoritative organization context', () => {
    organizationId.set(null);
    workspaceChanges.next();
    component.form.setValue({ title: 'Autumn quiz', quarterId: autumn.id });
    component.selectQuestion({ target: { files: [new File(['q'], 'q.docx')] } } as unknown as Event);
    component.selectAnswer({ target: { files: [new File(['a'], 'a.docx')] } } as unknown as Event);
    component.submit();
    fixture.detectChanges();
    expect(createImport).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Select an organization before uploading Bible content.');
  });

  it('clears the selected quarter and reloads after an organization change', () => {
    quarterResponses = [of(page([{ ...autumn, id: 'quarter-new' }]))];
    component.form.controls.quarterId.setValue(autumn.id);
    organizationId.set('organization-2');
    workspaceChanges.next();
    expect(component.form.controls.quarterId.value).toBe('');
    expect(component.quarters().map((quarter) => quarter.id)).toEqual(['quarter-new']);
  });

  it('maps backend field errors beside their canonical controls and prevents duplicate submission', () => {
    const pending = new Subject<{ id: string; status: 'uploaded' }>();
    createImport.and.returnValue(pending);
    component.form.setValue({ title: 'Autumn quiz', quarterId: autumn.id });
    component.selectQuestion({ target: { files: [new File(['q'], 'q.docx')] } } as unknown as Event);
    component.selectAnswer({ target: { files: [new File(['a'], 'a.docx')] } } as unknown as Event);
    component.submit();
    component.submit();
    expect(createImport).toHaveBeenCalledTimes(1);
    pending.error(
      new ApiError(422, 'validation_error', 'Invalid import', {
        fields: { quizFile: ['Question document is invalid.'] },
      }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Question document is invalid.');
  });

  it('handles reconciliation failures as safe page results and preserves the complete draft', () => {
    component.form.setValue({ title: 'Autumn quiz', quarterId: autumn.id });
    const question = new File(['private question text'], 'questions.docx');
    const answer = new File(['private answer text'], 'answers.docx');
    component.selectQuestion({ target: { files: [question] } } as unknown as Event);
    component.selectAnswer({ target: { files: [answer] } } as unknown as Event);
    createImport.and.returnValue(
      throwError(
        () =>
          new ApiError(
            422,
            'validation_error',
            'The documents could not be reconciled.',
            {
              fields: {
                questionDocument: ['Check the numbering in the question document.'],
                answerKeyDocument: ['Check the numbering in the answer-key document.'],
              },
              reconciliation: {
                questionDocumentCount: 12,
                answerKeyCount: 10,
                unmatchedQuestionNumbers: [11, 12],
                missingAnswerNumbers: [11],
                ambiguousAnswerNumbers: [7],
                questionText: 'must never appear',
                answerText: 'must never appear either',
              },
            },
            undefined,
            'request-422',
          ),
      ),
    );

    component.submit();
    fixture.detectChanges();

    const pageText = fixture.nativeElement.textContent as string;
    expect(errorHandler.handleError).not.toHaveBeenCalled();
    expect(component.form.getRawValue()).toEqual({ title: 'Autumn quiz', quarterId: autumn.id });
    expect(component.questionDocument()).toBe(question);
    expect(component.answerKeyDocument()).toBe(answer);
    expect(pageText).toContain('request-422');
    expect(pageText).toContain('Question document count');
    expect(pageText).toContain('12');
    expect(pageText).toContain('Answer-key count');
    expect(pageText).toContain('Unmatched question numbers');
    expect(pageText).toContain('11, 12');
    expect(pageText).toContain('Missing answer numbers');
    expect(pageText).toContain('Ambiguous answer numbers');
    expect(pageText).not.toContain('must never appear');
    expect(pageText).not.toContain('private question text');
    expect(pageText).not.toContain('private answer text');
    const fileFields = fixture.nativeElement.querySelectorAll('.file-field') as NodeListOf<HTMLElement>;
    expect(fileFields[0].textContent).toContain('Check the numbering in the question document.');
    expect(fileFields[1].textContent).toContain('Check the numbering in the answer-key document.');
  });

  it('forwards genuine programming errors to Angular ErrorHandler', () => {
    component.form.setValue({ title: 'Autumn quiz', quarterId: autumn.id });
    component.selectQuestion({ target: { files: [new File(['q'], 'q.docx')] } } as unknown as Event);
    component.selectAnswer({ target: { files: [new File(['a'], 'a.docx')] } } as unknown as Event);
    const programmingError = new TypeError('broken component invariant');
    createImport.and.returnValue(throwError(() => programmingError));

    component.submit();

    expect(errorHandler.handleError).toHaveBeenCalledOnceWith(programmingError);
    expect(component.error()).toBeNull();
  });

  it('handles one recoverable 500 locally, retains diagnostics and selections, and retries idempotently', () => {
    const first = new Subject<{ id: string; status: 'uploaded' }>();
    const retry = new Subject<{ id: string; status: 'uploaded' }>();
    createImport.and.returnValues(first, retry);
    component.form.setValue({ title: 'Autumn quiz', quarterId: autumn.id });
    const question = new File(['q'], 'q.docx');
    const answer = new File(['a'], 'a.docx');
    component.selectQuestion({ target: { files: [question] } } as unknown as Event);
    component.selectAnswer({ target: { files: [answer] } } as unknown as Event);

    component.submit();
    component.submit();
    const failure = new ApiError(500, 'dependency_failure', 'Backend failed', undefined, undefined, 'request-500');
    first.error(failure);
    fixture.detectChanges();

    expect(component.error()).toBe(failure);
    expect(errorHandler.handleError).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Bible import creation failed');
    expect(fixture.nativeElement.textContent).toContain('request-500');
    expect(component.form.getRawValue()).toEqual({ title: 'Autumn quiz', quarterId: autumn.id });
    expect(component.questionDocument()).toBe(question);
    expect(component.answerKeyDocument()).toBe(answer);

    component.submit();
    expect(createImport).toHaveBeenCalledTimes(2);
    expect(createImport.calls.argsFor(1)[0].idempotencyKey).toBe(createImport.calls.argsFor(0)[0].idempotencyKey);
  });
});
