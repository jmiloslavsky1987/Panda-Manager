import { describe, it, expect } from 'vitest';
import { matchCollateralCategory } from '../../components/wizard/CollateralUploadStep';

describe('checklist-match: matchCollateralCategory', () => {
  it('matches SOW filename to "sow" category', () => {
    expect(matchCollateralCategory('project-sow-v1.pdf')).toBe('sow');
  });

  it('matches kickoff deck to "kickoff" category', () => {
    expect(matchCollateralCategory('kickoff-deck.pptx')).toBe('kickoff');
  });

  it('returns null for unrecognized filenames', () => {
    expect(matchCollateralCategory('random.txt')).toBeNull();
  });

  it('is case-insensitive for known patterns', () => {
    expect(matchCollateralCategory('PROJECT-SOW-FINAL.PDF')).toBe('sow');
  });
});
