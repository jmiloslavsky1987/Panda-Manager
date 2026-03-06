// client/src/views/ReportGenerator.jsx
// Generates pre-filled reports from customer YAML data (no AI — pure heuristics).
// Three report types: Weekly Customer Status email, External ELT deck, Internal ELT deck.
// For Weekly Customer Status, an inline WeeklyEntryForm collects this week's data
// (pre-filled from last history entry) before generating the report.
// After generation, a "Save to history" button optionally persists the entry to YAML.

import React from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postHistory, generateReportPptx } from '../api';
import { WORKSTREAM_CONFIG } from '../lib/deriveCustomer';
import {
  generateWeeklyCustomerStatus,
  generateExternalELT,
  generateInternalELT,
  buildWeeklyFormPrefill,
} from '../lib/reportGenerator';

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

// Triggers a browser file download of plain text content
function downloadTxt(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Single large editable textarea for the Weekly Customer Status email
function WeeklyStatusPanel({ customer, customerId }) {
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
        <div className="flex items-center gap-2">
          <CopyButton text={text} label="Copy Email" />
          <button
            type="button"
            onClick={() => downloadTxt(text, `weekly-status-${customerId || 'report'}.txt`)}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 transition-colors whitespace-nowrap"
          >
            ↓ Download .txt
          </button>
        </div>
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
// Inline weekly entry form — mirrors WeeklyUpdateForm fields
// Pre-filled from last history entry via buildWeeklyFormPrefill
// ─────────────────────────────────────────────────────────────

function WeeklyEntryForm({ customer, onDataReady }) {
  const today = new Date().toISOString().split('T')[0];

  // Build nested workstream prefill from current YAML workstream state
  const buildPrefillWs = (cust) =>
    Object.fromEntries(
      Object.entries(WORKSTREAM_CONFIG).map(([groupKey, group]) => [
        groupKey,
        Object.fromEntries(
          group.subWorkstreams.map(sw => {
            const wsData = cust?.workstreams?.[groupKey]?.[sw.key];
            return [
              sw.key,
              {
                status:           wsData?.status           ?? 'green',
                percent_complete: wsData?.percent_complete ?? 0,
                progress_notes:   wsData?.progress_notes   ?? '',
                blockers:         wsData?.blockers          ?? '',
              },
            ];
          })
        ),
      ])
    );

  const prefillSummary = buildWeeklyFormPrefill(customer);

  const [weekEnding, setWeekEnding] = React.useState(today);
  const [wsState, setWsState] = React.useState(() => buildPrefillWs(customer));
  const [progress, setProgress] = React.useState(prefillSummary.progress);
  const [decisions, setDecisions] = React.useState(prefillSummary.decisions);
  const [outcomes, setOutcomes] = React.useState(prefillSummary.outcomes);

  const updateWs = (groupKey, subKey, field, value) => {
    setWsState(prev => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [subKey]: { ...prev[groupKey][subKey], [field]: value },
      },
    }));
  };

  // Build the history entry shape (matches what postHistory expects)
  const buildEntry = () => ({
    week_ending: weekEnding,
    workstreams: wsState,
    progress,
    decisions,
    outcomes,
  });

  // Build a synthetic customer for report generation using form data instead of raw YAML.
  // Merges form workstream state over the customer workstreams so generateWeeklyCustomerStatus
  // reads the user-entered values rather than stale YAML values.
  const buildCustomerWithFormData = () => ({
    ...customer,
    workstreams: Object.fromEntries(
      Object.entries(wsState).map(([groupKey, subs]) => [
        groupKey,
        Object.fromEntries(
          Object.entries(subs).map(([subKey, fields]) => [
            subKey,
            {
              ...(customer?.workstreams?.[groupKey]?.[subKey] ?? {}),
              ...fields,
            },
          ])
        ),
      ])
    ),
  });

  // Notify parent with both the merged customer (for generation) and entry (for save)
  const handlePreview = () => {
    onDataReady(buildCustomerWithFormData(), buildEntry());
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Week ending */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Week Ending</label>
        <input
          type="date"
          className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400"
          value={weekEnding}
          onChange={e => setWeekEnding(e.target.value)}
        />
      </div>

      {/* Per-workstream fieldsets */}
      {Object.entries(WORKSTREAM_CONFIG).map(([groupKey, group]) => (
        <fieldset key={groupKey} className="bg-white rounded-lg border border-gray-200 p-4">
          <legend className="text-sm font-semibold text-gray-800 px-1 mb-3">{group.label}</legend>
          <div className="flex flex-col gap-3">
            {group.subWorkstreams.map(sw => (
              <div key={sw.key} className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-700">{sw.label}</p>
                <div className="flex gap-3 flex-wrap items-start">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs text-gray-500">Status</label>
                    <select
                      className="border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-teal-400"
                      value={wsState[groupKey][sw.key].status}
                      onChange={e => updateWs(groupKey, sw.key, 'status', e.target.value)}
                    >
                      <option value="green">Green</option>
                      <option value="yellow">Yellow</option>
                      <option value="red">Red</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs text-gray-500">% Complete</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:border-teal-400"
                      value={wsState[groupKey][sw.key].percent_complete}
                      onChange={e => updateWs(groupKey, sw.key, 'percent_complete', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Progress Notes</label>
                  <textarea
                    rows={2}
                    className="border border-gray-200 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-teal-400"
                    value={wsState[groupKey][sw.key].progress_notes}
                    onChange={e => updateWs(groupKey, sw.key, 'progress_notes', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Blockers</label>
                  <textarea
                    rows={1}
                    className="border border-orange-200 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-orange-400"
                    value={wsState[groupKey][sw.key].blockers}
                    onChange={e => updateWs(groupKey, sw.key, 'blockers', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {/* Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Weekly Summary</h3>
          <p className="text-xs text-gray-400">Pre-filled from recent activity</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-sm font-medium text-gray-700">Progress</label>
          <textarea rows={3} className="border border-gray-200 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:border-teal-400"
            value={progress} onChange={e => setProgress(e.target.value)} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-sm font-medium text-gray-700">Decisions</label>
          <textarea rows={2} className="border border-gray-200 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:border-teal-400"
            value={decisions} onChange={e => setDecisions(e.target.value)} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-sm font-medium text-gray-700">Outcomes</label>
          <textarea rows={2} className="border border-gray-200 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:border-teal-400"
            value={outcomes} onChange={e => setOutcomes(e.target.value)} />
        </div>
      </div>

      {/* Preview button */}
      <button
        type="button"
        onClick={handlePreview}
        className="self-start px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
      >
        Preview Report
      </button>
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
  const queryClient    = useQueryClient();

  const [activeType,   setActiveType]   = React.useState('weekly');
  const [reportData,   setReportData]   = React.useState(null);
  const [reportKey,    setReportKey]    = React.useState(0);
  const [pptxLoading,  setPptxLoading]  = React.useState(false);
  const [pptxError,    setPptxError]    = React.useState(null);
  const [weeklyEntry,  setWeeklyEntry]  = React.useState(null);
  const [savedFlag,    setSavedFlag]    = React.useState(false);
  const [timelineDate, setTimelineDate] = React.useState('');

  const isEltType = activeType === 'elt_external' || activeType === 'elt_internal';

  const historyMutation = useMutation({
    mutationFn: (entry) => postHistory(customerId, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 3000);
    },
  });

  const handleGenerate = () => {
    let data;
    if (activeType === 'weekly') {
      data = { type: 'weekly', customer };
    } else if (activeType === 'elt_external') {
      data = { type: 'elt_external', slides: generateExternalELT(customer, timelineDate || null) };
    } else {
      data = { type: 'elt_internal', slides: generateInternalELT(customer, timelineDate || null) };
    }
    setReportData(data);
    setReportKey(k => k + 1);
    setPptxError(null);
  };

  const handleWeeklyDataReady = (mergedCustomer, entry) => {
    setWeeklyEntry(entry);
    const data = { type: 'weekly', customer: mergedCustomer };
    setReportData(data);
    setReportKey(k => k + 1);
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
    setWeeklyEntry(null);
    setSavedFlag(false);
    setTimelineDate('');
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

        {/* ELT Timeline date picker — MGT-04 */}
        {isEltType && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Report as of date <span className="text-xs text-gray-400 font-normal">(optional — leave blank for current data)</span>
            </label>
            <input
              type="date"
              className="border border-gray-200 rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-teal-400"
              value={timelineDate}
              onChange={e => setTimelineDate(e.target.value)}
            />
            {timelineDate && (
              <p className="text-xs text-gray-400">
                Showing data up to {timelineDate} — history entries and completed actions after this date are excluded.
              </p>
            )}
          </div>
        )}

        {/* Action buttons — Generate button only for ELT types; weekly uses WeeklyEntryForm preview button */}
        {activeType !== 'weekly' && (
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
        )}

        {pptxError && (
          <p className="text-sm text-red-600">PPTX error: {pptxError}</p>
        )}
      </div>

      {/* Weekly entry form — shown when Weekly Customer Status is selected */}
      {activeType === 'weekly' && (
        <WeeklyEntryForm
          customer={customer}
          onDataReady={handleWeeklyDataReady}
        />
      )}

      {/* Output panel — key forces full remount on each new generation */}
      {reportData && (
        <div key={reportKey} className="flex flex-col gap-4">
          {reportData.type === 'weekly' && (
            <WeeklyStatusPanel customer={reportData.customer} customerId={customerId} />
          )}
          {(reportData.type === 'elt_external' || reportData.type === 'elt_internal') && (
            <EltDeckPanel slides={reportData.slides} />
          )}

          {/* Save to history — shown after weekly report generation */}
          {reportData?.type === 'weekly' && weeklyEntry && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={historyMutation.isPending || savedFlag}
                onClick={() => historyMutation.mutate(weeklyEntry)}
                className="px-4 py-1.5 text-sm font-medium text-teal-700 bg-white border border-teal-300 rounded-md hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {historyMutation.isPending ? 'Saving...' : savedFlag ? 'Saved!' : 'Save to history'}
              </button>
              {historyMutation.isError && (
                <p className="text-sm text-red-600">Save failed: {historyMutation.error?.message}</p>
              )}
              <p className="text-xs text-gray-400">Optionally save this week's data to the YAML history.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
