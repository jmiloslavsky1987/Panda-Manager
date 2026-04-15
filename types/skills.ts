// bigpanda-app/types/skills.ts
// Shared types for Skills tab metadata

export interface SkillMeta {
  name: string;           // filename without .md extension (e.g. "meeting-summary")
  label: string;          // from front-matter
  description: string;    // from front-matter
  inputRequired: boolean; // from front-matter input_required
  inputLabel: string;     // from front-matter input_label (empty string if not required)
  schedulable: boolean;   // from front-matter
  errorBehavior: 'retry' | 'fail'; // from front-matter error_behavior
  compliant: boolean;     // true if all required fields present and valid
}
