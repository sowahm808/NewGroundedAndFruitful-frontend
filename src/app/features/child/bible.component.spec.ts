import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BibleComponent } from './bible.component';

describe('BibleComponent contract gate', () => {
  let fixture: ComponentFixture<BibleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibleComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(BibleComponent);
    fixture.detectChanges();
  });

  it('distinguishes unavailable configuration from no activity today', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('configuration dependency');
    expect(text).not.toContain('No activity today');
  });

  it('does not render or retain a correct-answer contract', () => {
    const html = fixture.nativeElement.innerHTML as string;
    for (const forbidden of [
      'correctChoiceId',
      'correctAnswer',
      'answerKey',
      'answerKeyFile',
      'storagePath',
      'adminNotes',
    ]) {
      expect(html).not.toContain(forbidden);
    }
  });
});
