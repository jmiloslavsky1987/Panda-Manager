// server/__tests__/driveService.test.js
// Tests for driveService.js — TDD RED phase
// These tests verify the module's exported interface and structural requirements.
// Network calls are mocked: tests focus on contract/interface, not live Drive calls.

'use strict';

// Mock googleapis before requiring driveService
jest.mock('googleapis', () => {
  const mockFilesList = jest.fn();
  const mockFilesGet = jest.fn();
  const mockFilesUpdate = jest.fn();
  return {
    google: {
      auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({})),
      },
      drive: jest.fn().mockReturnValue({
        files: {
          list: mockFilesList,
          get: mockFilesGet,
          update: mockFilesUpdate,
        },
      }),
    },
    __mockFilesList: mockFilesList,
    __mockFilesGet: mockFilesGet,
    __mockFilesUpdate: mockFilesUpdate,
  };
});

jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('driveService exports', () => {
  let svc;

  beforeAll(() => {
    svc = require('../services/driveService');
  });

  test('exports listCustomerFiles as a function', () => {
    expect(typeof svc.listCustomerFiles).toBe('function');
  });

  test('exports readYamlFile as a function', () => {
    expect(typeof svc.readYamlFile).toBe('function');
  });

  test('exports writeYamlFile as a function', () => {
    expect(typeof svc.writeYamlFile).toBe('function');
  });

  test('exports checkDriveHealth as a function', () => {
    expect(typeof svc.checkDriveHealth).toBe('function');
  });
});

describe('listCustomerFiles', () => {
  let svc;
  let googleapis;

  beforeEach(() => {
    jest.resetModules();
    googleapis = require('googleapis');
    svc = require('../services/driveService');
  });

  test('returns array from drive.files.list', async () => {
    const mockFiles = [
      { id: 'abc', name: 'Acme_Master_Status.yaml', modifiedTime: '2026-01-01T00:00:00Z' },
      { id: 'def', name: 'Globex_Master_Status.yaml', modifiedTime: '2026-01-02T00:00:00Z' },
    ];
    googleapis.__mockFilesList.mockResolvedValueOnce({ data: { files: mockFiles } });

    const result = await svc.listCustomerFiles();
    expect(result).toEqual(mockFiles);
  });

  test('returns empty array when no files found', async () => {
    googleapis.__mockFilesList.mockResolvedValueOnce({ data: { files: [] } });
    const result = await svc.listCustomerFiles();
    expect(result).toEqual([]);
  });

  test('returns empty array when files property is undefined', async () => {
    googleapis.__mockFilesList.mockResolvedValueOnce({ data: {} });
    const result = await svc.listCustomerFiles();
    expect(result).toEqual([]);
  });
});

describe('readYamlFile', () => {
  let svc;
  let googleapis;
  const { Readable } = require('stream');

  beforeEach(() => {
    jest.resetModules();
    googleapis = require('googleapis');
    svc = require('../services/driveService');
  });

  test('returns UTF-8 string content of file', async () => {
    const yamlContent = 'customer: Acme\nstatus: active\n';
    const readable = Readable.from([Buffer.from(yamlContent, 'utf8')]);
    googleapis.__mockFilesGet.mockResolvedValueOnce({ data: readable });

    const result = await svc.readYamlFile('file-id-123');
    expect(result).toBe(yamlContent);
  });
});

describe('writeYamlFile', () => {
  let svc;
  let googleapis;

  beforeEach(() => {
    jest.resetModules();
    googleapis = require('googleapis');
    svc = require('../services/driveService');
  });

  test('calls drive.files.update with correct fileId and mimeType', async () => {
    googleapis.__mockFilesUpdate.mockResolvedValueOnce({ data: {} });

    const content = 'customer: Acme\nstatus: active\n';
    await svc.writeYamlFile('file-id-123', content);

    expect(googleapis.__mockFilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'file-id-123',
        media: expect.objectContaining({
          mimeType: 'text/plain',
        }),
      })
    );
  });
});

describe('checkDriveHealth', () => {
  let svc;
  let googleapis;

  beforeEach(() => {
    jest.resetModules();
    googleapis = require('googleapis');
    svc = require('../services/driveService');
  });

  test('returns ok:true with fileCount and files array', async () => {
    const mockFiles = [
      { id: 'abc', name: 'Acme_Master_Status.yaml', modifiedTime: '2026-01-01T00:00:00Z' },
    ];
    googleapis.__mockFilesList.mockResolvedValueOnce({ data: { files: mockFiles } });

    const result = await svc.checkDriveHealth();
    expect(result).toEqual({
      ok: true,
      fileCount: 1,
      files: ['Acme_Master_Status.yaml'],
    });
  });

  test('returns ok:true with fileCount:0 when no files', async () => {
    googleapis.__mockFilesList.mockResolvedValueOnce({ data: { files: [] } });
    const result = await svc.checkDriveHealth();
    expect(result).toEqual({ ok: true, fileCount: 0, files: [] });
  });
});
