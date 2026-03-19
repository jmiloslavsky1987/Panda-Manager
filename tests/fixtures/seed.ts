// Test fixtures — plain TypeScript objects matching projects table schema
// Used by test stubs throughout Wave 0-4

export const KAISER_PROJECT = {
  name: 'Kaiser PA3.0',
  customer: 'KAISER',
  status: 'active',
  source_file: 'KAISER_Project_Context.md',
};

export const AMEX_PROJECT = {
  name: 'AMEX PA3.0',
  customer: 'AMEX',
  status: 'active',
  source_file: 'AMEX_Project_Context.md',
};

export const SAMPLE_ACTION = {
  external_id: 'A-KAISER-001',
  description: 'Test action',
  status: 'open',
  source: 'yaml',
};
