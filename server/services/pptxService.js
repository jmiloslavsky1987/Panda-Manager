'use strict';
// server/services/pptxService.js
// Generates PPTX slide decks for External ELT (5 slides) and Internal ELT (4 slides).
// Uses pptxgenjs — pure Node.js, no API calls, no per-use costs.
// Layout: LAYOUT_WIDE (13.33" × 7.5", 16:9 widescreen).

const PptxGenJS = require('pptxgenjs');

// ─────────────────────────────────────────────────────────────
// Brand colors (hex without #, as required by pptxgenjs)
// ─────────────────────────────────────────────────────────────
const C = {
  navy:     '1E3A5F',
  navyMid:  '2D5282',
  teal:     '0D9488',
  tealDk:   '0F766E',
  tealLt:   'CCFBF1',
  white:    'FFFFFF',
  gray50:   'F9FAFB',
  gray100:  'F3F4F6',
  gray200:  'E5E7EB',
  gray300:  'D1D5DB',
  gray500:  '6B7280',
  gray700:  '374151',
  gray900:  '111827',
  green:    '16A34A',
  greenBg:  'DCFCE7',
  yellow:   'D97706',
  yellowBg: 'FEF3C7',
  red:      'DC2626',
  redBg:    'FEE2E2',
};

// ─────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────

function statusConfig(s) {
  const lower = (s || '').toLowerCase();
  if (lower === 'red' || lower === 'off_track')    return { color: C.red,    bg: C.redBg,    label: 'Off Track' };
  if (lower === 'yellow' || lower === 'at_risk')   return { color: C.yellow, bg: C.yellowBg, label: 'At Risk'   };
  return { color: C.green, bg: C.greenBg, label: 'On Track' };
}

function overallStatus(customer) {
  return statusConfig(customer && customer.status ? customer.status : 'on_track');
}

// ─────────────────────────────────────────────────────────────
// Shared slide helpers
// ─────────────────────────────────────────────────────────────

/** Navy header bar + white title at top of slide. */
function addSlideHeader(slide, title) {
  slide.addShape('rect', {
    x: 0, y: 0, w: 13.33, h: 0.72,
    fill: { color: C.navy }, line: { color: C.navy },
  });
  slide.addText(title, {
    x: 0.25, y: 0.08, w: 12.83, h: 0.56,
    fontSize: 17, fontFace: 'Calibri', color: C.white, bold: true, valign: 'middle',
  });
}

/** Gray background + teal fill progress bar. */
function addProgressBar(slide, x, y, w, h, pct) {
  slide.addShape('rect', { x, y, w, h, fill: { color: C.gray200 }, line: { color: C.gray200 } });
  const pctNum = Math.min(100, Math.max(0, pct || 0));
  if (pctNum > 0) {
    slide.addShape('rect', { x, y, w: w * (pctNum / 100), h, fill: { color: C.teal }, line: { color: C.teal } });
  }
}

/** Colored badge box with status label text. */
function addStatusBadge(slide, x, y, w, h, status) {
  const cfg = statusConfig(status);
  slide.addShape('rect', { x, y, w, h, fill: { color: cfg.bg }, line: { color: cfg.color, width: 1 } });
  slide.addText(cfg.label, {
    x: x + 0.04, y, w: w - 0.08, h,
    fontSize: 8, fontFace: 'Calibri', color: cfg.color, bold: true,
    align: 'center', valign: 'middle',
  });
}

/** Truncate a string to maxLen chars, adding '…' if needed. */
function trunc(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '\u2026' : str;
}

// ─────────────────────────────────────────────────────────────
// ELT workstream mapping — mirrors reportGenerator.js (CJS version)
// Maps YAML 11 sub-workstreams → ELT 4 ADR + 2 Biggy groupings.
// ─────────────────────────────────────────────────────────────

function avgPct(values) {
  const nums = values.filter(v => typeof v === 'number');
  if (!nums.length) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

function worstStatus(statuses) {
  const s = statuses.map(x => (x || 'green').toLowerCase());
  if (s.includes('red') || s.includes('off_track'))    return 'red';
  if (s.includes('yellow') || s.includes('at_risk'))   return 'yellow';
  return 'green';
}

function getEltWorkstreams(customer) {
  const adr   = ((customer.workstreams || {}).adr)   || {};
  const biggy = ((customer.workstreams || {}).biggy) || {};

  const eltAdr = [
    {
      key: 'inbound_integrations', label: 'Inbound Integrations', group: 'adr',
      percent:  adr.inbound_integrations   ? (adr.inbound_integrations.percent_complete   || 0) : 0,
      status:   adr.inbound_integrations   ? (adr.inbound_integrations.status             || 'green') : 'green',
      notes:    adr.inbound_integrations   ? (adr.inbound_integrations.progress_notes     || '') : '',
      blockers: adr.inbound_integrations   ? (adr.inbound_integrations.blockers           || '') : '',
    },
    {
      key: 'configuration', label: 'Configuration', group: 'adr',
      percent: avgPct([
        adr.normalization          ? (adr.normalization.percent_complete          || 0) : 0,
        adr.platform_configuration ? (adr.platform_configuration.percent_complete || 0) : 0,
        adr.correlation            ? (adr.correlation.percent_complete            || 0) : 0,
      ]),
      status: worstStatus([
        adr.normalization          ? (adr.normalization.status          || 'green') : 'green',
        adr.platform_configuration ? (adr.platform_configuration.status || 'green') : 'green',
        adr.correlation            ? (adr.correlation.status            || 'green') : 'green',
      ]),
      notes: [
        adr.normalization          && adr.normalization.progress_notes,
        adr.platform_configuration && adr.platform_configuration.progress_notes,
        adr.correlation            && adr.correlation.progress_notes,
      ].filter(Boolean).join(' '),
      blockers: [
        adr.normalization          && adr.normalization.blockers,
        adr.platform_configuration && adr.platform_configuration.blockers,
        adr.correlation            && adr.correlation.blockers,
      ].filter(Boolean).join(' '),
    },
    {
      key: 'outbound_integrations', label: 'Outbound Integrations', group: 'adr',
      percent:  adr.outbound_integrations ? (adr.outbound_integrations.percent_complete   || 0) : 0,
      status:   adr.outbound_integrations ? (adr.outbound_integrations.status             || 'green') : 'green',
      notes:    adr.outbound_integrations ? (adr.outbound_integrations.progress_notes     || '') : '',
      blockers: adr.outbound_integrations ? (adr.outbound_integrations.blockers           || '') : '',
    },
    {
      key: 'workflow_configuration', label: 'Workflow Configuration', group: 'adr',
      percent:  adr.training_and_uat ? (adr.training_and_uat.percent_complete   || 0) : 0,
      status:   adr.training_and_uat ? (adr.training_and_uat.status             || 'green') : 'green',
      notes:    adr.training_and_uat ? (adr.training_and_uat.progress_notes     || '') : '',
      blockers: adr.training_and_uat ? (adr.training_and_uat.blockers           || '') : '',
    },
  ];

  const eltBiggy = [
    {
      key: 'integrations', label: 'Integrations', group: 'biggy',
      percent: avgPct([
        biggy.biggy_app_integration   ? (biggy.biggy_app_integration.percent_complete   || 0) : 0,
        biggy.udc                     ? (biggy.udc.percent_complete                     || 0) : 0,
        biggy.real_time_integrations  ? (biggy.real_time_integrations.percent_complete  || 0) : 0,
      ]),
      status: worstStatus([
        biggy.biggy_app_integration  ? (biggy.biggy_app_integration.status  || 'green') : 'green',
        biggy.udc                    ? (biggy.udc.status                    || 'green') : 'green',
        biggy.real_time_integrations ? (biggy.real_time_integrations.status || 'green') : 'green',
      ]),
      notes: [
        biggy.biggy_app_integration  && biggy.biggy_app_integration.progress_notes,
        biggy.udc                    && biggy.udc.progress_notes,
        biggy.real_time_integrations && biggy.real_time_integrations.progress_notes,
      ].filter(Boolean).join(' '),
      blockers: [
        biggy.biggy_app_integration  && biggy.biggy_app_integration.blockers,
        biggy.udc                    && biggy.udc.blockers,
        biggy.real_time_integrations && biggy.real_time_integrations.blockers,
      ].filter(Boolean).join(' '),
    },
    {
      key: 'workflow_configuration', label: 'Workflow Configuration', group: 'biggy',
      percent: avgPct([
        biggy.action_plans_configuration ? (biggy.action_plans_configuration.percent_complete || 0) : 0,
        biggy.workflows_configuration    ? (biggy.workflows_configuration.percent_complete    || 0) : 0,
      ]),
      status: worstStatus([
        biggy.action_plans_configuration ? (biggy.action_plans_configuration.status || 'green') : 'green',
        biggy.workflows_configuration    ? (biggy.workflows_configuration.status    || 'green') : 'green',
      ]),
      notes: [
        biggy.action_plans_configuration && biggy.action_plans_configuration.progress_notes,
        biggy.workflows_configuration    && biggy.workflows_configuration.progress_notes,
      ].filter(Boolean).join(' '),
      blockers: [
        biggy.action_plans_configuration && biggy.action_plans_configuration.blockers,
        biggy.workflows_configuration    && biggy.workflows_configuration.blockers,
      ].filter(Boolean).join(' '),
    },
  ];

  return { eltAdr, eltBiggy };
}

// ─────────────────────────────────────────────────────────────
// Data helpers
// ─────────────────────────────────────────────────────────────

function getOpenActionsSorted(customer) {
  return (customer.actions || [])
    .filter(a => a.status !== 'completed')
    .sort((a, b) => {
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
}

function getRecentCompleted(customer, sinceDate) {
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const cutoff = sinceDate || twoWeeksAgo;
  return (customer.actions || []).filter(
    a => a.status === 'completed' && a.completed_date && a.completed_date >= cutoff
  );
}

// ─────────────────────────────────────────────────────────────
// Shared: Title slide (both deck types)
// ─────────────────────────────────────────────────────────────

function buildTitleSlide(pptx, customer, isInternal) {
  const slide = pptx.addSlide();
  const name     = ((customer.customer || {}).name) || 'Customer';
  const program  = ((customer.project  || {}).name) || 'BigPanda Implementation';
  const today    = new Date();
  const monthYear = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Full navy background
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.navy }, line: { color: C.navy } });

  // Teal accent bar
  slide.addShape('rect', { x: 2.5, y: 5.15, w: 8.33, h: 0.06, fill: { color: C.teal }, line: { color: C.teal } });

  // Customer × BigPanda
  slide.addText(`${name} \u00D7 BigPanda`, {
    x: 0, y: 1.9, w: 13.33, h: 1.4,
    fontSize: 38, fontFace: 'Calibri', color: C.white, bold: true, align: 'center', valign: 'middle',
  });

  // Subtitle
  slide.addText(isInternal ? 'Internal Project Status Sync' : 'Monthly Project Status Review', {
    x: 0, y: 3.5, w: 13.33, h: 0.65,
    fontSize: 20, fontFace: 'Calibri', color: C.tealLt, align: 'center',
  });

  // Program | Month
  slide.addText(`${program}  \u2502  ${monthYear}`, {
    x: 0, y: 4.35, w: 13.33, h: 0.5,
    fontSize: 13, fontFace: 'Calibri', color: C.gray300, align: 'center',
  });

  // Confidential footer
  slide.addText('Confidential', {
    x: 0, y: 7.0, w: 13.33, h: 0.35,
    fontSize: 9, fontFace: 'Calibri', color: C.gray500, align: 'center',
  });
}

// ─────────────────────────────────────────────────────────────
// External ELT: Slide 2 — Executive Summary
// ─────────────────────────────────────────────────────────────

function buildExecSummarySlide(pptx, customer) {
  const slide = pptx.addSlide();
  const { eltAdr } = getEltWorkstreams(customer);
  const lastEntry   = (customer.history || [])[0] || {};
  const openActions = getOpenActionsSorted(customer);
  const recentDone  = getRecentCompleted(customer, lastEntry.week_ending || null);
  const goLive      = (customer.project || {}).go_live_date;
  const ovStatus    = overallStatus(customer);

  addSlideHeader(slide, 'Executive Summary');

  // Status banner
  const bannerY = 0.8;
  slide.addShape('rect', { x: 0.25, y: bannerY, w: 12.83, h: 0.44, fill: { color: ovStatus.bg }, line: { color: ovStatus.color, width: 1 } });
  slide.addText(
    `Overall Status: ${ovStatus.label}${goLive ? `  \u2014  Project on track for ${goLive} go-live.` : ''}`,
    { x: 0.4, y: bannerY + 0.04, w: 12.4, h: 0.36, fontSize: 11, fontFace: 'Calibri', color: ovStatus.color, bold: true, valign: 'middle' }
  );

  // Three columns
  const colY = 1.35, colH = 5.9;

  // ── Col 1: Month Highlights (teal header) ──────────────────
  const c1x = 0.25, c1w = 3.85;
  slide.addShape('rect', { x: c1x, y: colY, w: c1w, h: 0.35, fill: { color: C.teal }, line: { color: C.teal } });
  slide.addText('Month Highlights', { x: c1x + 0.08, y: colY + 0.05, w: c1w - 0.16, h: 0.25, fontSize: 10, fontFace: 'Calibri', color: C.white, bold: true });

  const highlights = recentDone.slice(0, 4).map(a => `\u2022 ${trunc(a.description, 70)}`);
  if (highlights.length === 0 && lastEntry.progress) highlights.push(`\u2022 ${trunc(lastEntry.progress, 70)}`);
  if (highlights.length === 0) highlights.push('\u2022 [Add highlights]');

  slide.addText(highlights.join('\n'), {
    x: c1x + 0.08, y: colY + 0.42, w: c1w - 0.16, h: colH - 0.48,
    fontSize: 10, fontFace: 'Calibri', color: C.gray700, valign: 'top', wrap: true,
  });

  // ── Col 2: Design & Integration Progress (navy-mid header) ──
  const c2x = 4.3, c2w = 4.1;
  slide.addShape('rect', { x: c2x, y: colY, w: c2w, h: 0.35, fill: { color: C.navyMid }, line: { color: C.navyMid } });
  slide.addText('Design & Integration Progress', { x: c2x + 0.08, y: colY + 0.05, w: c2w - 0.16, h: 0.25, fontSize: 10, fontFace: 'Calibri', color: C.white, bold: true });

  const designProg = [];
  if (lastEntry.decisions) designProg.push(`\u2022 ${trunc(lastEntry.decisions, 70)}`);
  eltAdr.filter(sw => sw.notes).slice(0, 3).forEach(sw => designProg.push(`\u2022 ${sw.label}: ${trunc(sw.notes, 55)}`));
  if (designProg.length === 0) designProg.push('\u2022 [Add progress notes]');

  slide.addText(designProg.join('\n'), {
    x: c2x + 0.08, y: colY + 0.42, w: c2w - 0.16, h: colH - 0.48,
    fontSize: 10, fontFace: 'Calibri', color: C.gray700, valign: 'top', wrap: true,
  });

  // ── Col 3: Timeline (card with navy header) ──────────────────
  const c3x = 8.6, c3w = 4.48;
  slide.addShape('rect', { x: c3x, y: colY, w: c3w, h: colH, fill: { color: C.gray50 }, line: { color: C.gray200, width: 1 } });
  slide.addShape('rect', { x: c3x, y: colY, w: c3w, h: 0.35, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addText('Timeline', { x: c3x + 0.1, y: colY + 0.05, w: c3w - 0.2, h: 0.25, fontSize: 10, fontFace: 'Calibri', color: C.white, bold: true });

  const completedActions = (customer.actions || [])
    .filter(a => a.status === 'completed' && a.completed_date)
    .sort((a, b) => a.completed_date.localeCompare(b.completed_date))
    .slice(0, 6);

  const timelineLines = completedActions.map(a => {
    const d   = new Date(a.completed_date);
    const mon = d.toLocaleString('default', { month: 'short' });
    return `${mon} ${d.getDate()} \u2014 ${trunc(a.description, 45)}`;
  });
  if (timelineLines.length === 0) timelineLines.push('[No completed items yet]');

  slide.addText(timelineLines.join('\n'), {
    x: c3x + 0.1, y: colY + 0.42, w: c3w - 0.2, h: colH - 0.88,
    fontSize: 9, fontFace: 'Calibri', color: C.gray700, valign: 'top', wrap: true,
  });

  if (goLive) {
    slide.addShape('rect', { x: c3x + 0.1, y: colY + colH - 0.42, w: c3w - 0.2, h: 0.02, fill: { color: C.gray300 }, line: { color: C.gray300 } });
    slide.addText(`Go-Live Target: ${goLive}`, {
      x: c3x + 0.1, y: colY + colH - 0.38, w: c3w - 0.2, h: 0.34,
      fontSize: 10, fontFace: 'Calibri', color: C.tealDk, bold: true,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// External ELT: Slide 3 — Workstream Health Snapshot
// ─────────────────────────────────────────────────────────────

function buildHealthSnapshotSlide(pptx, customer) {
  const slide = pptx.addSlide();
  const { eltAdr, eltBiggy } = getEltWorkstreams(customer);
  const adrOverall   = worstStatus(eltAdr.map(sw => sw.status));
  const biggyOverall = worstStatus(eltBiggy.map(sw => sw.status));

  addSlideHeader(slide, 'Workstream Health Snapshot');

  // ── ADR card ────────────────────────────────────────────────
  const aX = 0.2, aY = 0.82, aW = 6.4, aH = 6.48;
  slide.addShape('rect', { x: aX, y: aY, w: aW, h: aH, fill: { color: C.white }, line: { color: C.gray200, width: 1 } });
  slide.addShape('rect', { x: aX, y: aY, w: aW, h: 0.46, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addText('ADR', { x: aX + 0.12, y: aY + 0.08, w: 1.8, h: 0.3, fontSize: 13, fontFace: 'Calibri', color: C.white, bold: true });
  addStatusBadge(slide, aX + 2.2, aY + 0.1, 1.1, 0.26, adrOverall);

  const aRowH = (aH - 0.46) / eltAdr.length;
  eltAdr.forEach((sw, i) => {
    const rY = aY + 0.46 + i * aRowH;
    if (i > 0) slide.addShape('rect', { x: aX + 0.1, y: rY, w: aW - 0.2, h: 0.01, fill: { color: C.gray200 }, line: { color: C.gray200 } });

    slide.addText(sw.label, { x: aX + 0.12, y: rY + 0.1, w: aW - 0.9, h: 0.28, fontSize: 10, fontFace: 'Calibri', color: C.gray900, bold: true });
    slide.addText(`${sw.percent}%`, { x: aX + aW - 0.78, y: rY + 0.1, w: 0.65, h: 0.28, fontSize: 11, fontFace: 'Calibri', color: C.tealDk, bold: true, align: 'right' });

    if (sw.notes) {
      slide.addText(trunc(sw.notes, 80), { x: aX + 0.12, y: rY + 0.4, w: aW - 0.24, h: 0.28, fontSize: 8, fontFace: 'Calibri', color: C.gray500, italic: true, wrap: true });
    }
    addProgressBar(slide, aX + 0.12, rY + aRowH - 0.32, aW - 0.9, 0.12, sw.percent);
  });

  // ── Biggy card ──────────────────────────────────────────────
  const bX = 6.73, bW = 6.4;
  slide.addShape('rect', { x: bX, y: aY, w: bW, h: aH, fill: { color: C.white }, line: { color: C.gray200, width: 1 } });
  slide.addShape('rect', { x: bX, y: aY, w: bW, h: 0.46, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addText('Biggy', { x: bX + 0.12, y: aY + 0.08, w: 1.8, h: 0.3, fontSize: 13, fontFace: 'Calibri', color: C.white, bold: true });
  addStatusBadge(slide, bX + 2.2, aY + 0.1, 1.1, 0.26, biggyOverall);

  const bRowH = (aH - 0.46) / eltBiggy.length;
  eltBiggy.forEach((sw, i) => {
    const rY = aY + 0.46 + i * bRowH;
    if (i > 0) slide.addShape('rect', { x: bX + 0.1, y: rY, w: bW - 0.2, h: 0.01, fill: { color: C.gray200 }, line: { color: C.gray200 } });

    slide.addText(sw.label, { x: bX + 0.12, y: rY + 0.1, w: bW - 0.9, h: 0.28, fontSize: 10, fontFace: 'Calibri', color: C.gray900, bold: true });
    slide.addText(`${sw.percent}%`, { x: bX + bW - 0.78, y: rY + 0.1, w: 0.65, h: 0.28, fontSize: 11, fontFace: 'Calibri', color: C.tealDk, bold: true, align: 'right' });

    if (sw.notes) {
      slide.addText(trunc(sw.notes, 120), { x: bX + 0.12, y: rY + 0.42, w: bW - 0.24, h: 0.6, fontSize: 9, fontFace: 'Calibri', color: C.gray500, italic: true, wrap: true });
    }
    addProgressBar(slide, bX + 0.12, rY + bRowH - 0.32, bW - 0.9, 0.12, sw.percent);
  });
}

// ─────────────────────────────────────────────────────────────
// Shared: External detail panel (Progress | Looking Ahead)
// Used in External ADR Detail (slide 4) and Biggy top half (slide 5).
// ─────────────────────────────────────────────────────────────

function addExternalDetailPanel(slide, x, y, w, h, sw, openActions) {
  // Panel border + header
  slide.addShape('rect', { x, y, w, h, fill: { color: C.white }, line: { color: C.gray200, width: 1 } });
  slide.addShape('rect', { x, y, w, h: 0.36, fill: { color: C.navyMid }, line: { color: C.navyMid } });
  slide.addText(sw.label, { x: x + 0.1, y: y + 0.05, w: w - 1.1, h: 0.26, fontSize: 10, fontFace: 'Calibri', color: C.white, bold: true });
  slide.addText(`${sw.percent}%`, { x: x + w - 1.0, y: y + 0.03, w: 0.88, h: 0.3, fontSize: 11, fontFace: 'Calibri', color: C.tealLt, bold: true, align: 'right' });

  // Content area: 55% left (Progress) / 45% right (Looking Ahead)
  const cY    = y + 0.4;
  const cH    = h - 0.4;
  const leftW = w * 0.54;
  const rX    = x + leftW + 0.04;
  const rW    = w - leftW - 0.08;

  // Vertical divider
  slide.addShape('rect', { x: x + leftW, y: cY + 0.05, w: 0.01, h: cH - 0.1, fill: { color: C.gray200 }, line: { color: C.gray200 } });

  // Progress (left)
  slide.addText('Progress', { x: x + 0.08, y: cY, w: leftW - 0.12, h: 0.24, fontSize: 9, fontFace: 'Calibri', color: C.tealDk, bold: true });
  const progressBullets = sw.notes
    ? sw.notes.split(/\.\s+/).filter(Boolean).slice(0, 4).map(s => `\u2022 ${s.replace(/\.$/, '')}`).join('\n')
    : '\u2022 Work in progress';
  slide.addText(progressBullets, {
    x: x + 0.08, y: cY + 0.26, w: leftW - 0.15, h: cH - 0.3,
    fontSize: 9, fontFace: 'Calibri', color: C.gray700, valign: 'top', wrap: true,
  });

  // Looking Ahead (right)
  slide.addText('Looking Ahead', { x: rX + 0.05, y: cY, w: rW - 0.1, h: 0.24, fontSize: 9, fontFace: 'Calibri', color: C.tealDk, bold: true });
  const relevant = openActions
    .filter(a => a.workstream && a.workstream.toLowerCase() === sw.group)
    .slice(0, 3)
    .map(a => `\u2022 ${trunc(a.description, 55)}${a.due ? ` (${a.due})` : ''}`);
  const lookingAhead = relevant.length > 0 ? relevant.join('\n') : '\u2022 Continue current work items';
  slide.addText(lookingAhead, {
    x: rX + 0.05, y: cY + 0.26, w: rW - 0.1, h: cH - 0.3,
    fontSize: 9, fontFace: 'Calibri', color: C.gray700, valign: 'top', wrap: true,
  });

  // Support Needed bar (only if blockers exist)
  if (sw.blockers) {
    const snY = y + h - 0.28;
    slide.addShape('rect', { x, y: snY, w, h: 0.26, fill: { color: C.yellowBg }, line: { color: C.yellow, width: 1 } });
    slide.addText(`Support Needed: ${trunc(sw.blockers, 90)}`, {
      x: x + 0.08, y: snY + 0.04, w: w - 0.16, h: 0.18,
      fontSize: 8, fontFace: 'Calibri', color: C.yellow, bold: true, wrap: true,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// External ELT: Slide 4 — ADR Detail (2×2 grid)
// ─────────────────────────────────────────────────────────────

function buildAdrDetailSlide(pptx, customer) {
  const slide = pptx.addSlide();
  const { eltAdr } = getEltWorkstreams(customer);
  const openActions = getOpenActionsSorted(customer);

  addSlideHeader(slide, 'ADR \u2014 Progress & Looking Ahead');

  const pW = 6.38, pH = 2.96;
  const c1 = 0.2, c2 = 6.75, r1 = 0.85, r2 = r1 + pH + 0.08;

  addExternalDetailPanel(slide, c1, r1, pW, pH, eltAdr[0], openActions); // Inbound
  addExternalDetailPanel(slide, c2, r1, pW, pH, eltAdr[1], openActions); // Configuration
  addExternalDetailPanel(slide, c1, r2, pW, pH, eltAdr[2], openActions); // Outbound
  addExternalDetailPanel(slide, c2, r2, pW, pH, eltAdr[3], openActions); // Workflow
}

// ─────────────────────────────────────────────────────────────
// External ELT: Slide 5 — Biggy Detail + Next Steps
// ─────────────────────────────────────────────────────────────

function buildBiggyNextStepsSlide(pptx, customer) {
  const slide = pptx.addSlide();
  const { eltBiggy } = getEltWorkstreams(customer);
  const openActions        = getOpenActionsSorted(customer);
  const upcomingMilestones = (customer.milestones || []).filter(m => m.status !== 'completed' && m.status !== 'complete');

  addSlideHeader(slide, 'Biggy \u2014 Progress & Looking Ahead  \u2502  Next Steps & Milestones');

  // Biggy panels (top half)
  const pW = 6.38, bigPH = 2.3;
  addExternalDetailPanel(slide, 0.2,  0.85, pW, bigPH, eltBiggy[0], openActions);
  addExternalDetailPanel(slide, 6.75, 0.85, pW, bigPH, eltBiggy[1], openActions);

  // Horizontal divider
  const divY = 0.85 + bigPH + 0.1;
  slide.addShape('rect', { x: 0.2, y: divY, w: 12.93, h: 0.02, fill: { color: C.gray300 }, line: { color: C.gray300 } });

  const nsY = divY + 0.15;

  // ── Left: Upcoming Milestones ────────────────────────────────
  slide.addText('Upcoming Milestones', {
    x: 0.2, y: nsY, w: 6.38, h: 0.3,
    fontSize: 11, fontFace: 'Calibri', color: C.navy, bold: true,
  });

  if (upcomingMilestones.length > 0) {
    const tableData = upcomingMilestones.slice(0, 5).map(m => [
      { text: trunc(m.name, 45), options: { fontSize: 9, fontFace: 'Calibri', color: C.gray700 } },
      { text: m.target_date || 'TBD', options: { fontSize: 9, fontFace: 'Calibri', color: C.gray500, align: 'center' } },
      { text: m.status || '', options: { fontSize: 9, fontFace: 'Calibri', color: C.tealDk, align: 'center' } },
    ]);
    slide.addTable(tableData, {
      x: 0.2, y: nsY + 0.35, w: 6.38,
      colW: [3.7, 1.35, 1.33],
      border: { color: C.gray200 },
      fill: { color: C.gray50 },
    });
  } else {
    slide.addText('[No upcoming milestones]', {
      x: 0.2, y: nsY + 0.35, w: 6.38, h: 0.35,
      fontSize: 9, fontFace: 'Calibri', color: C.gray500,
    });
  }

  // ── Right: Upcoming Sessions ─────────────────────────────────
  slide.addText('Upcoming Sessions', {
    x: 6.75, y: nsY, w: 6.38, h: 0.3,
    fontSize: 11, fontFace: 'Calibri', color: C.navy, bold: true,
  });
  const sessions = openActions.slice(0, 5).map(a =>
    `\u2022 ${trunc(a.description, 65)}${a.due ? ` (${a.due})` : ''}`
  );
  slide.addText(sessions.length > 0 ? sessions.join('\n') : '\u2022 [Add upcoming sessions]', {
    x: 6.75, y: nsY + 0.35, w: 6.38, h: 7.5 - nsY - 0.45,
    fontSize: 9, fontFace: 'Calibri', color: C.gray700, valign: 'top', wrap: true,
  });
}

// ─────────────────────────────────────────────────────────────
// Internal ELT: Slide 2 — Active Workstream Overview
// ─────────────────────────────────────────────────────────────

function buildWorkstreamOverviewSlide(pptx, customer) {
  const slide = pptx.addSlide();
  const { eltAdr, eltBiggy } = getEltWorkstreams(customer);
  const openActions = getOpenActionsSorted(customer);
  const highRisks   = (customer.risks || []).filter(r => r.severity === 'high' && r.status === 'open');

  addSlideHeader(slide, 'Active Workstream Overview');

  // Table header
  const hOpt = (txt) => ({ text: txt, options: { bold: true, fontSize: 9, fontFace: 'Calibri', color: C.white, fill: { color: C.navy } } });
  const headerRow = [hOpt('Workstream'), hOpt('Sub-Workstream'), hOpt('% Complete'), hOpt('Status'), hOpt('Notes / Key Context')];

  const makeRow = (sw, groupLabel, showGroup, fillColor) => {
    const cfg = statusConfig(sw.status);
    const base = { fill: { color: fillColor } };
    return [
      { text: showGroup ? groupLabel : '', options: { ...base, fontSize: 9, fontFace: 'Calibri', color: C.navy, bold: true } },
      { text: sw.label,          options: { ...base, fontSize: 9, fontFace: 'Calibri', color: C.gray700 } },
      { text: `${sw.percent}%`,  options: { ...base, fontSize: 9, fontFace: 'Calibri', color: C.tealDk, bold: true, align: 'center' } },
      { text: cfg.label,         options: { ...base, fontSize: 9, fontFace: 'Calibri', color: cfg.color, bold: true, align: 'center' } },
      { text: trunc(sw.notes, 90), options: { ...base, fontSize: 8, fontFace: 'Calibri', color: C.gray500 } },
    ];
  };

  const tableRows = [
    headerRow,
    ...eltAdr.map((sw, i)   => makeRow(sw, 'ADR',   i === 0, i % 2 === 0 ? C.white : C.gray50)),
    ...eltBiggy.map((sw, i) => makeRow(sw, 'Biggy', i === 0, i % 2 === 0 ? C.tealLt : C.white)),
  ];

  slide.addTable(tableRows, {
    x: 0.2, y: 0.85, w: 12.93,
    colW: [1.2, 2.4, 1.0, 1.0, 7.33],
    border: { color: C.gray200 },
    autoPage: false,
  });

  // Key Focuses bar
  const focusY = 5.45;
  slide.addShape('rect', { x: 0.2, y: focusY, w: 12.93, h: 0.34, fill: { color: C.tealLt }, line: { color: C.teal, width: 1 } });
  slide.addText('Key Focuses Right Now', { x: 0.3, y: focusY + 0.05, w: 2.8, h: 0.24, fontSize: 10, fontFace: 'Calibri', color: C.tealDk, bold: true });

  const keyFocuses = [];
  openActions.slice(0, 2).forEach(a => keyFocuses.push(`${keyFocuses.length + 1}. ${trunc(a.description, 65)}${a.due ? ` (${a.due})` : ''}`));
  if (highRisks.length > 0) keyFocuses.push(`${keyFocuses.length + 1}. Risk: ${trunc(highRisks[0].description, 60)}`);
  if (keyFocuses.length === 0) keyFocuses.push('1. [No open focus items]');

  slide.addText(keyFocuses.join('   |   '), {
    x: 3.2, y: focusY + 0.05, w: 9.8, h: 0.24,
    fontSize: 9, fontFace: 'Calibri', color: C.gray700, valign: 'middle',
  });
}

// ─────────────────────────────────────────────────────────────
// Shared: Internal detail panel (Where We Are | What's Next | Need Help With)
// ─────────────────────────────────────────────────────────────

function addInternalDetailPanel(slide, x, y, w, h, sw, openActions) {
  // Panel border + header
  slide.addShape('rect', { x, y, w, h, fill: { color: C.white }, line: { color: C.gray200, width: 1 } });
  slide.addShape('rect', { x, y, w, h: 0.33, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addText(sw.label, { x: x + 0.08, y: y + 0.05, w: w - 1.0, h: 0.23, fontSize: 9, fontFace: 'Calibri', color: C.white, bold: true });
  slide.addText(`${sw.percent}%`, { x: x + w - 0.88, y: y + 0.03, w: 0.78, h: 0.27, fontSize: 10, fontFace: 'Calibri', color: C.tealLt, bold: true, align: 'right' });

  // Three equal-width columns
  const cY   = y + 0.36;
  const cH   = h - 0.36;
  const colW = w / 3;

  const addCol = (colIdx, label, text, useRedBg) => {
    const cx = x + colIdx * colW;
    if (useRedBg && text !== 'N/A') {
      slide.addShape('rect', { x: cx, y: cY, w: colW, h: cH, fill: { color: C.redBg }, line: { color: C.redBg } });
    }
    // Vertical divider (not on first column)
    if (colIdx > 0) {
      slide.addShape('rect', { x: cx, y: cY + 0.04, w: 0.01, h: cH - 0.08, fill: { color: C.gray200 }, line: { color: C.gray200 } });
    }
    const labelColor = useRedBg ? C.red : C.tealDk;
    slide.addText(label, { x: cx + 0.07, y: cY + 0.04, w: colW - 0.1, h: 0.2, fontSize: 8, fontFace: 'Calibri', color: labelColor, bold: true });
    slide.addText(text || 'N/A', {
      x: cx + 0.07, y: cY + 0.26, w: colW - 0.14, h: cH - 0.3,
      fontSize: 8, fontFace: 'Calibri', color: C.gray700, valign: 'top', wrap: true,
    });
  };

  const whereWeAre = sw.notes || `${sw.percent}% complete.`;
  const relevant   = openActions.filter(a => a.workstream && a.workstream.toLowerCase() === sw.group)
    .slice(0, 2).map(a => `\u2022 ${trunc(a.description, 50)}`).join('\n') || '\u2022 Continue current work items';
  const needHelp   = sw.blockers || 'N/A';

  addCol(0, 'Where We Are',   trunc(whereWeAre, 200), false);
  addCol(1, "What's Next",    relevant,                false);
  addCol(2, 'Need Help With', needHelp,                true);
}

// ─────────────────────────────────────────────────────────────
// Internal ELT: Slide 3 — ADR Workstream Detail
// ─────────────────────────────────────────────────────────────

function buildInternalAdrDetailSlide(pptx, customer) {
  const slide = pptx.addSlide();
  const { eltAdr } = getEltWorkstreams(customer);
  const openActions = getOpenActionsSorted(customer);

  addSlideHeader(slide, 'ADR \u2014 Workstream Summary');

  const pW = 6.38, pH = 2.9;
  const c1 = 0.2, c2 = 6.75, r1 = 0.85, r2 = r1 + pH + 0.08;

  addInternalDetailPanel(slide, c1, r1, pW, pH, eltAdr[0], openActions);
  addInternalDetailPanel(slide, c2, r1, pW, pH, eltAdr[1], openActions);
  addInternalDetailPanel(slide, c1, r2, pW, pH, eltAdr[2], openActions);
  addInternalDetailPanel(slide, c2, r2, pW, pH, eltAdr[3], openActions);
}

// ─────────────────────────────────────────────────────────────
// Internal ELT: Slide 4 — Biggy Workstream Detail
// ─────────────────────────────────────────────────────────────

function buildInternalBiggyDetailSlide(pptx, customer) {
  const slide = pptx.addSlide();
  const { eltBiggy } = getEltWorkstreams(customer);
  const openActions  = getOpenActionsSorted(customer);

  addSlideHeader(slide, 'Biggy \u2014 Workstream Summary');

  // Two wide panels side by side
  addInternalDetailPanel(slide, 0.2,  0.85, 6.38, 6.3, eltBiggy[0], openActions);
  addInternalDetailPanel(slide, 6.75, 0.85, 6.38, 6.3, eltBiggy[1], openActions);
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Build a PPTX for the given customer and ELT deck type.
 * @param {object} customer  Full parsed customer YAML object
 * @param {'elt_external'|'elt_internal'} type
 * @returns {Promise<{base64: string, filename: string}>}
 */
async function generatePptxBase64(customer, type) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author  = 'BigPanda Project Intelligence';
  pptx.company = 'BigPanda';

  // Sanitize customer name for filename
  const rawName  = ((customer.customer || {}).name || 'Customer');
  const safeName = rawName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
  const today    = new Date().toISOString().slice(0, 10);
  const typeLabel = type === 'elt_external' ? 'External_ELT' : 'Internal_ELT';
  const filename  = `${safeName}_${typeLabel}_${today}.pptx`;

  if (type === 'elt_external') {
    buildTitleSlide(pptx, customer, false);
    buildExecSummarySlide(pptx, customer);
    buildHealthSnapshotSlide(pptx, customer);
    buildAdrDetailSlide(pptx, customer);
    buildBiggyNextStepsSlide(pptx, customer);
  } else {
    buildTitleSlide(pptx, customer, true);
    buildWorkstreamOverviewSlide(pptx, customer);
    buildInternalAdrDetailSlide(pptx, customer);
    buildInternalBiggyDetailSlide(pptx, customer);
  }

  const base64 = await pptx.write({ outputType: 'base64' });
  return { base64, filename };
}

module.exports = { generatePptxBase64 };
