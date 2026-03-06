// client/src/views/ReportGenerator.jsx
// Generates pre-filled reports from customer YAML data (no AI — pure heuristics).
// Three report types: Weekly Customer Status email, External ELT deck, Internal ELT deck.
// User edits the pre-filled content, then copies it out.

import React from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {
  generateWeeklyCustomerStatus,
  generateExternalELT,
  generateInternalELT,
} from '../lib/reportGenerator';
import { generateReportPptx } from '../api';

// Triggers a browser file download from a base64 PPTX blob
function downloadPptx(base64, filename) {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 transition-colors whitespace-nowrap"
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

// Single large editable textarea for the Weekly Customer Status email
function WeeklyStatusPanel({ customer }) {
  const [text, setText] = React.useState(
    () => generateWeeklyCustomerStatus(customer)
  );
  const lineCount = text.split('\n').length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Edit the pre-filled email below, then copy.
        </p>
        <CopyButton text={text} label="Copy Email" />
      </div>
      <textarea
        rows={Math.max(lineCount + 2, 20)}
        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono text-gray-800 resize-y focus:outline-none focus:border-teal-400 bg-white"
        value={text}
        onChange={e => setText(e.target.value)}
      />
    </div>
  );
}

// Per-slide cards with editable section textareas for ELT decks
function EltDeckPanel({ slides: initialSlides }) {
  const [slides, setSlides] = React.useState(initialSlides);

  const updateSection = (slideIdx, sectionIdx, value) => {
    setSlides(prev =>
      prev.map((slide, si) =>
        si !== slideIdx
          ? slide
          : {
              ...slide,
              sections: slide.sections.map((sec, secI) =>
                secI !== sectionIdx ? sec : { ...sec, content: value }
              ),
            }
      )
    );
  };

  const allText = slides
    .map(slide =>
      `=== ${slide.title} ===\n\n` +
      slide.sections.map(s => `--- ${s.label} ---\n${s.content}`).join('\n\n')
    )
    .join('\n\n\n');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Edit each slide section, then copy individually or all at once.
        </p>
        <CopyButton text={allText} label="Copy All Slides" />
      </div>

      {slides.map((slide, si) => {
        const slideText =
          `=== ${slide.title} ===\n\n` +
          slide.sections.map(s => `--- ${s.label} ---\n${s.content}`).join('\n\n');

        return (
          <div key={si} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Slide header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">{slide.title}</h4>
              <CopyButton text={slideText} label="Copy Slide" />
            </div>

            {/* Sections */}
            <div className="p-4 flex flex-col gap-4">
              {slide.sections.map((section, secI) => {
                const lineCount = section.content.split('\n').length;
                const rows = Math.min(Math.max(lineCount + 1, 2), 12);

                return (
                  <div key={secI} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {section.label}
                      </label>
                      <CopyButton text={section.content} />
                    </div>
                    <textarea
                      rows={rows}
                      className="w-full border border-gray-100 rounded px-3 py-2 text-sm font-mono text-gray-800 resize-y focus:outline-none focus:border-teal-400 bg-gray-50"
                      value={section.content}
                      onChange={e => updateSection(si, secI, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    key: 'weekly',
    label: 'Weekly Customer Status',
    description: 'External email to customer team with overall status, accomplishments, and workstream breakdown.',
  },
  {
    key: 'elt_external',
    label: 'External ELT Deck',
    description: '5-slide customer-facing leadership deck: exec summary, health snapshot, ADR detail, Biggy detail.',
  },
  {
    key: 'elt_internal',
    label: 'Internal ELT Deck',
    description: '4-slide internal leadership deck: workstream overview, ADR detail, Biggy detail with blockers.',
  },
];

export default function ReportGenerator() {
  const { customerId } = useParams();
  const { customer }   = useOutletContext();

  const [activeType,  setActiveType]  = React.useState('weekly');
  const [reportData,  setReportData]  = React.useState(null);
  const [reportKey,   setReportKey]   = React.useState(0);
  const [pptxLoading, setPptxLoading] = React.useState(false);
  const [pptxError,   setPptxError]   = React.useState(null);

  const isEltType = activeType === 'elt_external' || activeType === 'elt_internal';

  const handleGenerate = () => {
    let data;
    if (activeType === 'weekly') {
      data = { type: 'weekly', customer };
    } else if (activeType === 'elt_external') {
      data = { type: 'elt_external', slides: generateExternalELT(customer) };
    } else {
      data = { type: 'elt_internal', slides: generateInternalELT(customer) };
    }
    setReportData(data);
    setReportKey(k => k + 1);
    setPptxError(null);
  };

  const handleDownloadPptx = async () => {
    setPptxLoading(true);
    setPptxError(null);
    try {
      const { base64, filename } = await generateReportPptx(customerId, activeType);
      downloadPptx(base64, filename);
    } catch (err) {
      setPptxError(err.message || 'Failed to generate PPTX');
    } finally {
      setPptxLoading(false);
    }
  };

  const handleTypeChange = (key) => {
    setActiveType(key);
    setReportData(null);
    setPptxError(null);
  };

  const activeDesc = REPORT_TYPES.find(rt => rt.key === activeType)?.description ?? '';

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Report Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate pre-filled reports from project data. Edit before copying.
        </p>
      </div>

      {/* Report type selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
        <p className="text-sm font-medium text-gray-700">Report Type</p>

        <div className="flex gap-2 flex-wrap">
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.key}
              type="button"
              onClick={() => handleTypeChange(rt.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                activeType === rt.key
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:text-teal-600'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {activeDesc && (
          <p className="text-xs text-gray-400">{activeDesc}</p>
        )}

        {/* Action buttons — Generate (text) + Download PPTX (ELT only) */}
        <div className="flex gap-3 flex-wrap items-center">
          <button
            type="button"
            onClick={handleGenerate}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
          >
            Preview Report
          </button>

          {isEltType && (
            <button
              type="button"
              disabled={pptxLoading}
              onClick={handleDownloadPptx}
              className="px-5 py-2 text-sm font-medium text-teal-700 bg-white border border-teal-300 rounded-md hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {pptxLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Building PPTX…
                </>
              ) : (
                <>↓ Download PPTX</>
              )}
            </button>
          )}
        </div>

        {pptxError && (
          <p className="text-sm text-red-600">PPTX error: {pptxError}</p>
        )}
      </div>

      {/* Output panel — key forces full remount on each new generation */}
      {reportData && (
        <div key={reportKey} className="flex flex-col gap-4">
          {reportData.type === 'weekly' && (
            <WeeklyStatusPanel customer={reportData.customer} />
          )}
          {(reportData.type === 'elt_external' || reportData.type === 'elt_internal') && (
            <EltDeckPanel slides={reportData.slides} />
          )}
        </div>
      )}
    </div>
  );
}
