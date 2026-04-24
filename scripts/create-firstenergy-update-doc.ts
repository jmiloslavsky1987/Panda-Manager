/**
 * create-firstenergy-update-doc.ts — Generate a DOCX for testing the Context tab
 * "updates" flow against the FirstEnergy demo project.
 *
 * Run: npx tsx scripts/create-firstenergy-update-doc.ts
 * Output: scripts/firstenergy-update-doc.docx
 *
 * This is a weekly sync note written in informal PS lead style.
 * It references existing seeded entities by name so the extraction + change-detection
 * pipeline will fuzzy-match them and surface proposed UPDATES and CLOSURES rather
 * than only new items. It also includes a few genuinely new items to show mixed output.
 *
 * Updates / closures it should trigger:
 *  - R-FE-001 (SCADA firewall) → status now mitigated (firewall approved)
 *  - A-FE-001 (SCADA firewall action) → completed
 *  - A-FE-004 (Remedy sign-off) → completed
 *  - M-FE-003 (Remedy automation go-live) → status complete, date moved to May 2
 *  - M-FE-004 (SCADA integration live) → date updated from May 20 to June 3
 *  - A-FE-003 (FP rate tuning) → progress update (in_progress, new note)
 *
 * New items it should surface:
 *  - New action: schedule Biggy AI Transmission team pilot kickoff
 *  - New risk: spring load test result — Transmission team NPM data volume higher than expected
 *  - New decision: Tivoli dark date moved to August 1 (not July 1) due to SCADA delay cascade
 *  - New engagement history entry for the weekly sync itself
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function body(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 22 })],
    spacing: { after: 120 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function labeled(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
    spacing: { after: 100 },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: '', spacing: { after: 80 } });
}

function sectionTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })],
        alignment: AlignmentType.CENTER,
      })],
      shading: { type: ShadingType.CLEAR, color: '1E40AF', fill: '1E40AF' },
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
    })),
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })], spacing: { after: 60 } })],
      shading: ri % 2 === 0
        ? { type: ShadingType.CLEAR, color: 'F8FAFC', fill: 'F8FAFC' }
        : { type: ShadingType.CLEAR, color: 'FFFFFF', fill: 'FFFFFF' },
      width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
    })),
  }));
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideV: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    },
  });
}

async function main() {
  const doc = new Document({
    sections: [{
      children: [

        // ── Cover ──────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'FirstEnergy', bold: true, size: 52, color: '1E40AF' })],
          spacing: { before: 0, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'AIOps Modernisation — Weekly Sync Notes', size: 34, color: '334155' })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'April 27, 2026  |  Prepared by: Jordan Lee, BigPanda PS Lead', size: 22, color: '64748B' })],
          spacing: { after: 400 },
        }),

        // ── Project Snapshot ───────────────────────────────────────────────
        heading1('Project Snapshot'),
        labeled('Customer', 'FirstEnergy'),
        labeled('Overall Status', 'GREEN'),
        labeled('Go-Live Target', 'August 15, 2026'),
        labeled('Attendees', 'Jordan Lee (BP), Sofia Reyes (BP), Marcus Webb (BP), Diana Huang (FE), Roy Garrett (FE), Aisha Thompson (FE)'),
        spacer(),

        // ── What Happened This Week ────────────────────────────────────────
        heading1('What Happened This Week'),
        body('Big week. Three items closed out and one major blocker cleared. Here\'s the summary:', true),
        spacer(),

        heading2('OT Firewall Approval — RESOLVED'),
        body('Aisha Thompson\'s team approved the OT firewall change control on April 24 as expected. Sofia completed the OSIsoft PI / OPC-UA bridge connectivity validation on April 25 — all 4 SCADA sensors confirming alert flow to BigPanda staging. The SCADA firewall delay risk is now fully mitigated. We are targeting SCADA production cutover the week of May 6, which sets our new SCADA go-live date at June 3 (was May 20 — the 2-week delay pushed us but Sofia\'s parallel staging work means we land on June 3 instead of June 6).'),
        spacer(),
        body('Action closed: "Resolve SCADA firewall change control — get OT security team to approve BigPanda outbound rules for PI server." Done April 25. Risk R-FE-001 (SCADA firewall change control delay) is now mitigated.'),
        spacer(),

        heading2('Remedy ITSM — Production Go-Live Complete'),
        body('Remedy automation went live May 2 (slightly ahead of the May 7 window). Tom Callahan confirmed production webhook active. Auto-create working for P2/P3. P1 manual confirm remains in place per Q-FE-002 decision. Action "Deliver Remedy automation go-live sign-off — confirm production webhook with ITSM team post-UAT completion" is closed. Milestone "Remedy Automation — Production Go-Live" is now COMPLETE as of May 2, 2026.'),
        spacer(),

        heading2('Generation Domain FP Rate — Progress Update'),
        body('Sofia ran the correlation tuning session with the Grid Ops team on April 28 during the spring load-shedding window. Generation domain FP rate dropped from 14% to 9.2% — now within the <10% target. Action A-FE-003 "Tune correlation FP rate for Generation domain — current rate 14%, target <8% before Phase 2 expansion" is still open (8% target not quite met — one more tuning pass planned for May 5 with additional Generation suppression rules).'),
        spacer(),

        // ── Open Actions ──────────────────────────────────────────────────
        heading1('Open Actions'),
        body('Updated action register as of April 27, 2026:'),
        spacer(),

        sectionTable(
          ['ID', 'Description', 'Owner', 'Due', 'Status'],
          [
            ['A-FE-002', 'Expand Biggy AI pilot to Transmission Operations team — prepare context briefing and schedule onboarding session', 'Marcus Webb', 'May 5, 2026', 'Open'],
            ['A-FE-003', 'Tune correlation FP rate for Generation domain — target <8%', 'Sofia Reyes', 'May 5, 2026', 'In Progress — 9.2% achieved, one more pass needed'],
            ['A-FE-005', 'Quarterly business review deck — prepare executive summary with Biggy AI pilot metrics for SVP Operations', 'Jordan Lee', 'May 12, 2026', 'Open'],
            ['A-FE-006', 'Configure SolarWinds NPM integration for Distribution network monitoring', 'Sofia Reyes', 'June 1, 2026', 'Open'],
            ['NEW', 'Schedule Biggy AI Transmission team pilot kickoff session for May 5 — confirm incident types with Chris Mendez, send calendar invite and pilot kit', 'Marcus Webb', 'April 30, 2026', 'Open'],
          ]
        ),
        spacer(),

        // ── Risks ─────────────────────────────────────────────────────────
        heading1('Risk Register Update'),
        spacer(),

        sectionTable(
          ['Risk', 'Owner', 'Status', 'Notes'],
          [
            ['SCADA firewall change control delay (R-FE-001)', 'Sofia Reyes', 'MITIGATED', 'Firewall approved April 24. SCADA production target June 3.'],
            ['NERC CIP compliance for Biggy AI enrichment (R-FE-002)', 'FirstEnergy Compliance', 'Open', 'Compliance review ongoing. No change this week.'],
            ['SCADA SME single point of failure (R-FE-003)', 'Jordan Lee', 'Open', 'Knowledge transfer session still scheduled May 3 with Leila Vasquez. Backup SME not yet confirmed.'],
            ['Tivoli dual-run alert duplication (R-FE-004)', 'Sofia Reyes', 'Mitigated', 'Source tagging working well. No duplication incidents in April.'],
            ['Spring load-shedding test alert volume (R-FE-005)', 'Marcus Webb', 'CLOSED', 'Load test April 28 passed at 3.2x volume. No correlation issues. Risk closed.'],
            ['Remedy ITSM upgrade in Q3 (R-FE-006)', 'Tom Callahan', 'Accepted', 'No change.'],
            ['NEW RISK — Transmission NPM data volume', 'Sofia Reyes', 'Open', 'SolarWinds NPM data from Transmission team\'s test environment is producing 3x the expected alert volume based on preliminary data shared by Chris Mendez April 26. Tenant sizing may need review before Phase 2 integration. Severity: Medium.'],
          ]
        ),
        spacer(),

        // ── Milestones ────────────────────────────────────────────────────
        heading1('Milestone Status'),
        spacer(),

        sectionTable(
          ['Milestone', 'Target Date', 'Status', 'Notes'],
          [
            ['Phase 1 ADR Pipeline — Production Go-Live', 'March 10, 2026', 'Complete', 'Done.'],
            ['Biggy AI Pilot — NOC & Grid Operations', 'May 15, 2026', 'On Track', 'Week 5 pilot underway. 91% accuracy now.'],
            ['Remedy Automation — Production Go-Live', 'May 2, 2026', 'Complete', 'Went live May 2. Closed ahead of schedule.'],
            ['OT Network SCADA Integration Live', 'June 3, 2026', 'On Track', 'Date revised from May 20. OT firewall cleared. Production week of May 6.'],
            ['Phase 2 — Transmission & Distribution Teams Live', 'July 15, 2026', 'On Track', 'Transmission team onboarding starting May 5.'],
            ['Full AIOps Production Go-Live — All Teams', 'August 15, 2026', 'On Track', 'No change.'],
          ]
        ),
        spacer(),

        // ── Decisions ─────────────────────────────────────────────────────
        heading1('Decisions'),
        spacer(),

        heading2('Tivoli Decommission Date Moved to August 1'),
        body('Decision: Tivoli Netcool dark date revised from July 1 to August 1, 2026. Rationale: The 2-week SCADA delay (now resolved) pushed SCADA production to June 3. The original Tivoli decommission plan assumed SCADA stable by late May to allow 30-day parallel validation before July 1. With June 3 as the SCADA go-live date, the 30-day validation window now ends July 3, making July 1 impossible. August 1 gives a clean 30-day buffer after SCADA stability is confirmed. Decision made by Jordan Lee with Diana Huang on April 27.'),
        spacer(),

        // ── What's Next ───────────────────────────────────────────────────
        heading1("What's Next"),
        bullet('May 5 — Biggy AI Transmission team pilot kickoff with Chris Mendez (Marcus Webb leading)'),
        bullet('May 5 — Generation domain FP tuning pass #2 with Sofia Reyes and Grid Ops team (target: <8%)'),
        bullet('May 6 — SCADA production connectivity validation begins (OPC-UA bridge + PI Web API go-live)'),
        bullet('May 12 — QBR deck due for Diana Huang / SVP Operations review (Jordan Lee)'),
        bullet('May 14 — Quarterly business review with FirstEnergy SVP Operations'),
        bullet('Ongoing — SCADA alarm taxonomy documentation session with Leila Vasquez, May 3'),
        spacer(),

        // ── Biggy AI Pilot Metrics ─────────────────────────────────────────
        heading1('Biggy AI Pilot — Week 5 Metrics'),
        labeled('Incident Summary Accuracy', '91% (up from 89% in Week 4)'),
        labeled('Mean Time to Acknowledge (MTTA)', '19 minutes (down from 21 min in Week 4)'),
        labeled('Remedy Tickets Eliminated This Week', '28 tickets (112 total in pilot window)'),
        labeled('Pilot Teams', 'NOC Operations + Grid Operations'),
        labeled('Status', 'On track for 8-week pilot completion by May 15'),
        spacer(),
        body('NOC team lead Roy Garrett reported the Biggy AI summaries are now "accurate enough that we read them before looking at the raw alerts." Grid Ops team using Biggy AI for 100% of P1 incidents in the pilot window.'),
        spacer(),

        // ── Stakeholders ──────────────────────────────────────────────────
        heading1('Stakeholder Notes'),
        bullet('Diana Huang (SVP Operations) — confirmed Phase 2 timeline. Expects QBR deck May 12.'),
        bullet('Aisha Thompson (OT Security) — firewall change control approved. Closed her involvement on SCADA integration blocker.'),
        bullet('Roy Garrett (NOC Ops Manager) — very positive on Biggy AI. Requesting pilot expansion to weekend shift.'),
        bullet('Chris Mendez (Transmission Ops Lead) — shared NPM data volume estimates April 26. Confirmed May 5 pilot kickoff attendance.'),
        bullet('Tom Callahan (ITSM Manager) — Remedy production webhook confirmed. Q-FE-002 auto-close decision still pending for P1s specifically.'),
        spacer(),

        // ── Notes ─────────────────────────────────────────────────────────
        heading1('Notes'),
        body('Weekly sync runs every Tuesday. Next sync: May 4, 2026.'),
        body('All action items and risks tracked in BigPanda PS project tracker. Jordan Lee owns weekly status distribution.'),

      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'firstenergy-update-doc.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Created: ${outPath}`);
  console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('Upload this file to the FirstEnergy project Context tab to test the updates flow.');
  console.log('Expected extraction output:');
  console.log('  UPDATES/CLOSURES:');
  console.log('  - R-FE-001 SCADA firewall risk → status: mitigated');
  console.log('  - R-FE-005 spring load test risk → status: closed');
  console.log('  - A-FE-001 SCADA firewall action → status: completed');
  console.log('  - A-FE-004 Remedy sign-off action → status: completed');
  console.log('  - A-FE-003 Generation FP rate action → notes update (9.2%, still open)');
  console.log('  - M-FE-003 Remedy go-live milestone → status: complete, date: May 2');
  console.log('  - M-FE-004 SCADA integration milestone → date: June 3 (was May 20)');
  console.log('  NEW ITEMS:');
  console.log('  - New action: schedule Transmission team Biggy AI pilot kickoff');
  console.log('  - New risk: Transmission NPM data volume higher than expected');
  console.log('  - New decision: Tivoli decommission date moved to August 1');
  console.log('  - New engagement history: April 27 weekly sync');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
