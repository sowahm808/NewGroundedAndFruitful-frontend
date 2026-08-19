import { CHARACTER_PARTICIPATION_COPY } from './character.component';

describe('character participation semantics', () => {
  it('states that zero and ten receive the same participation credit', () => {
    expect(CHARACTER_PARTICIPATION_COPY).toContain(
      'A rating of 0 and a rating of 10 earn the same participation credit.',
    );
  });
});
