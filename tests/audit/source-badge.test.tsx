// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// components/SourceBadge.tsx is a Wave 0 stub that throws "not yet implemented".
// All 5 render() calls below will fail because the stub throws instead of rendering.
// This is the intended RED state — valid until Plan 22-02 provides the real component.
import { SourceBadge } from '@/components/SourceBadge';

describe('SourceBadge label derivation (AUDIT-01)', () => {
  it('AUDIT-01-1: source=manual renders badge text containing "Manual"', () => {
    render(<SourceBadge source="manual" />);
    expect(screen.getByText(/Manual/i)).toBeInTheDocument();
  });

  it('AUDIT-01-2: source=ingestion with artifactName renders "Ingested — SOW.pdf"', () => {
    render(<SourceBadge source="ingestion" artifactName="SOW.pdf" />);
    expect(screen.getByText(/Ingested\s*[—–-]\s*SOW\.pdf/i)).toBeInTheDocument();
  });

  it('AUDIT-01-3: source=discovery with discoverySource renders "Discovered — Slack"', () => {
    render(<SourceBadge source="discovery" discoverySource="Slack" />);
    expect(screen.getByText(/Discovered\s*[—–-]\s*Slack/i)).toBeInTheDocument();
  });

  it('AUDIT-01-4: source=discovery with null discoverySource renders "Discovered" without crash or "undefined"', () => {
    render(<SourceBadge source="discovery" discoverySource={null} />);
    const el = screen.getByText(/Discovered/i);
    expect(el).toBeInTheDocument();
    expect(el.textContent).not.toContain('undefined');
  });

  it('AUDIT-01-5: source=ingestion with null artifactName falls back to "Manual" badge (safety path)', () => {
    render(<SourceBadge source="ingestion" artifactName={null} />);
    expect(screen.getByText(/Manual/i)).toBeInTheDocument();
  });
});
