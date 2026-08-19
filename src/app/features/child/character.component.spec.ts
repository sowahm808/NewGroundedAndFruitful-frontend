import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { CharacterCycle, CharacterResult, ChildApi } from './child-api.service';
import { CHARACTER_PARTICIPATION_COPY, CharacterComponent } from './character.component';

describe('CharacterComponent', () => {
  let fixture: ComponentFixture<CharacterComponent>;
  let component: CharacterComponent;
  let api: jasmine.SpyObj<ChildApi>;

  const cycle: CharacterCycle = {
    id: 'cycle-1',
    status: 'available',
    version: 4,
    qualities: Array.from({ length: 5 }, (_, index) => ({
      id: `quality-${index + 1}`,
      name: `Quality ${index + 1}`,
    })),
    responses: [],
  };
  const completion: CharacterResult = {
    status: 'completed',
    participationAward: { label: 'Participation awarded', points: 1 },
    calculatedAt: '2026-08-19T12:00:00Z',
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<ChildApi>('ChildApi', ['character', 'saveCharacter', 'completeCharacter']);
    api.character.and.returnValue(of(cycle));
    await TestBed.configureTestingModule({
      imports: [CharacterComponent],
      providers: [{ provide: ChildApi, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(CharacterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('states that zero and ten receive the same participation credit without changing the UI copy', () => {
    expect(CHARACTER_PARTICIPATION_COPY).toContain(
      'A rating of 0 and a rating of 10 earn the same participation credit.',
    );
    expect(fixture.nativeElement.textContent).toContain('Save draft');
    expect(fixture.nativeElement.textContent).toContain('Complete all reflections');
  });

  it('uses the typed draft API and accepts a subset containing rating zero', () => {
    const saved: CharacterCycle = {
      ...cycle,
      status: 'draft',
      version: 5,
      responses: [{ qualityId: 'quality-1', rating: 0 }],
    };
    api.saveCharacter.and.returnValue(of(saved));
    component.responses.at(0).controls.rating.setValue(0);

    component.draft();

    expect(api.saveCharacter).toHaveBeenCalledWith([{ qualityId: 'quality-1', rating: 0, reflection: undefined }], 4);
    expect(api.completeCharacter).not.toHaveBeenCalled();
    expect(component.cycle()).toBe(saved);
    expect(component.message()).toBe('Draft saved.');
    expect(component.busy()).toBeFalse();
  });

  it('uses the typed completion API for one command containing every configured quality', () => {
    api.completeCharacter.and.returnValue(of(completion));
    component.responses.controls.forEach((response, index) => response.controls.rating.setValue(index * 2));

    component.complete();

    expect(api.completeCharacter).toHaveBeenCalledOnceWith(
      cycle.qualities.map((quality, index) => ({ qualityId: quality.id, rating: index * 2, reflection: undefined })),
      4,
      jasmine.any(String),
    );
    expect(api.saveCharacter).not.toHaveBeenCalled();
    expect(component.cycle()?.status).toBe('completed');
    expect(component.message()).toBe('Reflection complete. Participation awarded');
    expect(component.busy()).toBeFalse();
  });

  it('treats a repeated/idempotent completion result as successful', () => {
    api.completeCharacter.and.returnValue(of({ ...completion, participationAward: undefined }));
    component.responses.controls.forEach((response) => response.controls.rating.setValue(10));

    component.complete();

    expect(component.message()).toBe('Reflection complete.');
    expect(component.cycle()?.status).toBe('completed');
  });

  for (const error of [
    new ApiError(409, 'business_conflict', 'This reflection was already completed.'),
    new ApiError(422, 'validation_error', 'One or more ratings are invalid.'),
  ]) {
    it(`shows the normalized ${error.status} API error and resets submitting state`, () => {
      api.saveCharacter.and.returnValue(throwError(() => error));
      component.responses.at(0).controls.rating.setValue(1);

      component.draft();

      expect(component.message()).toBe(error.message);
      expect(component.busy()).toBeFalse();
    });
  }

  it('normalizes an unknown error without exposing it and resets submitting state', () => {
    api.saveCharacter.and.returnValue(throwError(() => new Error('private backend detail')));
    component.responses.at(0).controls.rating.setValue(1);

    component.draft();

    expect(component.message()).toBe('The reflection could not be saved.');
    expect(component.message()).not.toContain('private backend detail');
    expect(component.busy()).toBeFalse();
  });

  it('prevents duplicate submissions while a request is active', () => {
    const pending = new Subject<CharacterCycle>();
    api.saveCharacter.and.returnValue(pending);
    component.responses.at(0).controls.rating.setValue(1);

    component.draft();
    component.draft();

    expect(api.saveCharacter).toHaveBeenCalledTimes(1);
    expect(component.busy()).toBeTrue();
    pending.next({ ...cycle, status: 'draft' });
    pending.complete();
    expect(component.busy()).toBeFalse();
  });

  it('does not submit completion until all configured qualities are answered', () => {
    component.responses.at(0).controls.rating.setValue(0);
    component.complete();
    expect(api.completeCharacter).not.toHaveBeenCalled();
  });
});
