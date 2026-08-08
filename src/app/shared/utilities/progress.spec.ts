import { assessmentComplete, completedRatings, participationCompletionPoints, percent } from './progress';
describe('participation rules', () => {
  it('treats ratings 0 and 10 identically as completed', () => {
    expect(completedRatings([{ qualityId: 'a', rating: 0 }])).toBe(1);
    expect(completedRatings([{ qualityId: 'a', rating: 10 }])).toBe(1);
  });
  it('requires all five ratings', () => {
    expect(assessmentComplete([0, 1, 2, 3, 10].map((rating, i) => ({ qualityId: String(i), rating })))).toBeTrue();
    expect(assessmentComplete([0, 1, 2, 3, null].map((rating, i) => ({ qualityId: String(i), rating })))).toBeFalse();
  });
  it('does not use answer correctness to determine displayed points', () => {
    const correct = participationCompletionPoints(5, true);
    const incorrect = participationCompletionPoints(5, true);
    expect(correct).toBe(incorrect);
  });
  it('bounds progress', () => {
    expect(percent(12, 10)).toBe(100);
    expect(percent(5, 0)).toBe(0);
  });
});
