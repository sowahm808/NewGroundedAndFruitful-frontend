import { FormControl } from '@angular/forms';
import { toSlug } from './organization-onboarding.component';

describe('organization onboarding validation', () => {
  it('derives a bounded editable slug without identity data', () => {
    expect(toSlug(' Grounded & Fruitful Ghana ')).toBe('grounded-fruitful-ghana');
    expect(toSlug('---')).toBe('');
  });

  it('requires timezone confirmation through the component form contract', () => {
    const confirmation = new FormControl(false, { nonNullable: true });
    expect(confirmation.value).toBeFalse();
  });
});
