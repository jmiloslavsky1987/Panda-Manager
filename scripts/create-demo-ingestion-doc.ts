/**
 * create-demo-ingestion-doc.ts — Generate a demo DOCX for testing the AI ingestion pipeline.
 *
 * Run: npx tsx scripts/create-demo-ingestion-doc.ts
 *
 * Output: scripts/demo-ingestion-doc.docx
 *
 * Scenario: A fictional "Vertex Logistics — BigPanda AIOps Deployment" project document.
 * Contains: stakeholders, milestones, risks, actions, decisions, and tasks in a structured
 * format that the BigPanda AI extraction pipeline is designed to recognize.
 * Purpose: Upload to the Context tab to demo the full ingest → extract → review queue → approve flow.
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
        // ── Cover ───────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'Vertex Logistics', bold: true, size: 52, color: '1E40AF' })],
          spacing: { before: 0, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'BigPanda AIOps Deployment — Project Status Update', size: 34, color: '334155' })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Week of April 21, 2026  |  Prepared by: Alex Chen, BigPanda PS Lead', size: 22, color: '64748B' })],
          spacing: { after: 400 },
        }),

        // ── Project Overview ──────────────────────────────────────────────
        heading1('Project Overview'),
        labeled('Customer', 'Vertex Logistics'),
        labeled('Project', 'BigPanda AIOps Deployment — ADR + Biggy AI'),
        labeled('Overall Status', 'GREEN — On Track'),
        labeled('Go-Live Target', 'September 30, 2026'),
        labeled('Start Date', 'March 3, 2026'),
        labeled('PS Lead', 'Alex Chen'),
        labeled('Integration Engineer', 'Maria Santos'),
        labeled('Solutions Architect', 'Tom Osei'),
        spacer(),
        body('Vertex Logistics is deploying BigPanda AIOps across their North America distribution center network (12 DC hubs, 3 regional offices). ADR pipeline is live for the first 3 integrations. Biggy AI pilot has been approved and kicks off May 5. PagerDuty and Datadog integrations are complete; ServiceNow webhook is in UAT. The project is tracking well with two open risks being actively managed.'),
        spacer(),

        // ── Milestones ────────────────────────────────────────────────────
        heading1('Milestones'),
        sectionTable(
          ['Milestone', 'Target Date', 'Status', 'Owner', 'Notes'],
          [
            ['ADR Pipeline — First 3 Integrations Live', '2026-04-15', 'COMPLETE', 'Maria Santos', 'PagerDuty, Datadog, and Dynatrace all live in production. Load test at 2x volume passed April 14.'],
            ['ServiceNow ITSM Automation — Production Go-Live', '2026-05-07', 'ON TRACK', 'Maria Santos', 'UAT running — 6/8 scenarios passing. Two field mapping issues being resolved this week.'],
            ['Biggy AI Pilot — DC Hub Operations Team', '2026-06-15', 'ON TRACK', 'Tom Osei', 'Pilot kickoff approved. Tom designing enrichment fields with Hub Operations team April 30.'],
            ['Phase 2 — Remaining 9 DC Hubs Live', '2026-08-30', 'ON TRACK', 'Alex Chen', 'Phase 2 scoping complete. Regional office teams will onboard in parallel with final 3 hubs.'],
            ['Full Production Go-Live — All Sites', '2026-09-30', 'ON TRACK', 'Alex Chen', 'All 12 DC hubs + 3 regional offices live. Biggy AI operational. ServiceNow fully automated.'],
          ]
        ),
        spacer(),

        // ── Risks ─────────────────────────────────────────────────────────
        heading1('Risks'),
        sectionTable(
          ['Risk', 'Severity', 'Likelihood', 'Impact', 'Owner', 'Target Date', 'Mitigation'],
          [
            [
              'Legacy Nagios instances at DC hubs 5–9 are running end-of-life v4.4 — webhook support limited, SNMP trap forwarding required as fallback',
              'Medium', 'Medium', 'Medium', 'Maria Santos', '2026-05-20',
              'DC Hub ops team agreed to SNMP fallback approach. Maria designed SNMP listener config. Will validate at Hub 5 pilot site May 6.',
            ],
            [
              'ServiceNow upgrade window (June 2026) may interrupt UAT completion and production cutover timeline — Vertex ITSM team not yet confirmed upgrade date',
              'Medium', 'Low', 'High', 'Alex Chen', '2026-05-01',
              'Alex to confirm ServiceNow upgrade date with Tom Callahan (Vertex ITSM) by May 1. If upgrade is before May 7, cutover will be rescheduled to post-upgrade.',
            ],
            [
              'Vertex DC Hub Operations team lead (Kyle Park) is being promoted to Regional Director — may reduce his availability for Biggy AI pilot design and correlation policy tuning',
              'Low', 'High', 'Medium', 'Alex Chen', '2026-04-30',
              'Alex discussing backup SME assignment with Kyle before April 30. Pilot design sessions frontloaded to April week so Kyle can hand off with full context.',
            ],
          ]
        ),
        spacer(),

        // ── Actions ───────────────────────────────────────────────────────
        heading1('Actions & Open Questions'),
        sectionTable(
          ['#', 'Type', 'Description', 'Owner', 'Due Date', 'Status'],
          [
            ['A-VL-001', 'Action', 'Complete ServiceNow UAT — resolve 2 remaining field mapping failures (incident category and assignment group)', 'Maria Santos', '2026-04-25', 'In Progress'],
            ['A-VL-002', 'Action', 'Confirm ServiceNow upgrade date with Tom Callahan (Vertex ITSM) — determine if June window conflicts with production cutover', 'Alex Chen', '2026-05-01', 'Open'],
            ['A-VL-003', 'Action', 'Design Biggy AI enrichment fields with Kyle Park — define incident summary template, probable cause fields, and affected systems mapping', 'Tom Osei', '2026-04-30', 'Open'],
            ['A-VL-004', 'Action', 'Validate Nagios SNMP trap forwarding at DC Hub 5 pilot site — confirm alert payload completeness and latency', 'Maria Santos', '2026-05-06', 'Open'],
            ['A-VL-005', 'Action', 'Quarterly business review deck — prepare Phase 1 success metrics for CIO presentation (MTTA improvement, ticket reduction, pilot scope)', 'Alex Chen', '2026-05-10', 'Open'],
            ['A-VL-006', 'Action', 'Prepare Phase 2 resource plan — confirm Maria Santos availability for parallel hub onboarding Aug–Sep', 'Alex Chen', '2026-05-15', 'Open'],
            ['Q-VL-001', 'Question', 'Should Biggy AI incident summaries be visible only to DC Hub Operations team, or should regional managers also have access to AI-generated incident context in ServiceNow tickets?', 'Vertex IT (Kyle Park)', 'TBD', 'Open'],
          ]
        ),
        spacer(),

        // ── Stakeholders ──────────────────────────────────────────────────
        heading1('Stakeholders'),
        sectionTable(
          ['Name', 'Role', 'Company', 'Email', 'Notes'],
          [
            ['Alex Chen', 'PS Delivery Lead', 'BigPanda', 'alex.chen@bigpanda.io', 'Primary delivery lead. Executive relationship and QBR cadence.'],
            ['Maria Santos', 'Integration Engineer', 'BigPanda', 'maria.santos@bigpanda.io', 'ADR pipeline, ServiceNow automation, Nagios SNMP design.'],
            ['Tom Osei', 'Solutions Architect', 'BigPanda', 'tom.osei@bigpanda.io', 'Biggy AI design, correlation policy, pilot measurement.'],
            ['Rachel Monroe', 'VP Technology Operations', 'Vertex Logistics', 'r.monroe@vertexlog.com', 'Executive sponsor. P1 SLA and MTTA reduction accountable owner.'],
            ['Kyle Park', 'DC Hub Operations Lead', 'Vertex Logistics', 'k.park@vertexlog.com', 'Biggy AI pilot owner. Being promoted to Regional Director — transition risk.'],
            ['Sandra Torres', 'ServiceNow ITSM Admin', 'Vertex Logistics', 's.torres@vertexlog.com', 'Owns ServiceNow configuration. UAT partner for webhook integration.'],
            ['James Liu', 'Network Operations Manager', 'Vertex Logistics', 'j.liu@vertexlog.com', 'Owns DC hub network infrastructure. Nagios administration authority.'],
          ]
        ),
        spacer(),

        // ── Key Decisions ─────────────────────────────────────────────────
        heading1('Key Decisions'),
        body('The following decisions have been made and documented for this project:'),
        spacer(),

        body('Decision 1 — Nagios SNMP fallback approach (April 8, 2026)', true),
        body('DC Hubs 5–9 will use SNMP trap forwarding instead of REST API for Nagios integration due to end-of-life v4.4 limitations. This decision was agreed with James Liu (Network Ops) in the integration design workshop. REST API upgrade is not feasible before Phase 2 go-live timeline. SNMP produces equivalent alert data and is a supported BigPanda integration pattern.'),
        spacer(),

        body('Decision 2 — Biggy AI pilot team selection: DC Hub Operations only (April 15, 2026)', true),
        body('Biggy AI pilot will run exclusively with the DC Hub Operations team (Kyle Park) for the first 8 weeks. Regional office teams will not be included in the initial pilot. Rationale: Hub Operations has the highest alert volume (78% of daily alerts) and most mature correlation policies, providing the best signal quality for pilot accuracy measurement.'),
        spacer(),

        body('Decision 3 — ServiceNow is system of record; BigPanda is primary triage interface (March 20, 2026)', true),
        body('Rachel Monroe (VP Technology Operations) confirmed: BigPanda is the primary incident triage and correlation interface for NOC and DC Operations teams. ServiceNow is the system of record for incident lifecycle, SLA tracking, and customer communication. BigPanda tickets auto-create ServiceNow records via webhook. Teams do not manage incidents directly in ServiceNow.'),
        spacer(),

        body('Decision 4 — Alert source deduplication window: 5 minutes for same-source, 2 minutes for cross-source (March 20, 2026)', true),
        body('Correlation deduplication windows agreed with Kyle Park and James Liu: alerts from the same monitoring tool within a 5-minute window are deduplicated by alert tag. Alerts from different monitoring tools (e.g., PagerDuty + Datadog) within a 2-minute window are correlated into a single incident with both sources listed. This reduces alert storms during large DC hub incidents.'),
        spacer(),

        // ── Current Sprint / Focus ────────────────────────────────────────
        heading1('Current Sprint Focus'),
        heading2('Priority 1: ServiceNow UAT Completion'),
        labeled('Owner', 'Maria Santos'),
        labeled('Target', 'April 25, 2026'),
        body('Two field mapping failures in UAT: (1) incident_category field not mapping to ServiceNow ITSM category taxonomy correctly — Vertex uses a custom category tree; (2) assignment_group webhook field is populating with BigPanda internal group names instead of Vertex ITSM group names. Maria investigating both with Sandra Torres this week. UAT sign-off blocking production go-live milestone (M-VL-002).'),
        spacer(),

        heading2('Priority 2: Biggy AI Pilot Design'),
        labeled('Owner', 'Tom Osei'),
        labeled('Target', 'April 30, 2026'),
        body('Tom Osei meeting with Kyle Park April 30 to design Biggy AI enrichment fields. Key design decisions: (1) which 10 incident types to include in 8-week pilot, (2) enrichment field mapping — incident summary, probable cause, affected systems, recommended action; (3) accuracy measurement methodology. Kyle to confirm backup SME before April 30 handoff.'),
        spacer(),

        heading2('Priority 3: Nagios SNMP Validation at Hub 5'),
        labeled('Owner', 'Maria Santos'),
        labeled('Target', 'May 6, 2026'),
        body('Maria Santos on-site at DC Hub 5 in Dallas, TX on May 6 to validate SNMP trap forwarding configuration. Validation criteria: alert latency <30 seconds, payload completeness >95%, deduplication working for correlated hub alerts. If Hub 5 validates, same configuration will be rolled out to Hubs 6–9 in Phase 2.'),
        spacer(),

        // ── Engagement Log ────────────────────────────────────────────────
        heading1('Recent Engagement History'),
        sectionTable(
          ['Date', 'Summary'],
          [
            ['2026-04-21', 'Weekly sync — Alex Chen, Kyle Park, Sandra Torres. ADR milestone M-VL-001 closed. ServiceNow UAT status reviewed: 6/8 scenarios passing, 2 field mapping issues active. Biggy AI pilot design session scheduled April 30 with Tom Osei.'],
            ['2026-04-15', 'ADR Phase 1 go-live celebration sync — Rachel Monroe joined. M-VL-001 officially closed. Load test results shared: 2x volume passed, P99 alert latency 4.2 seconds. Rachel approved Biggy AI pilot kickoff for May 5.'],
            ['2026-04-08', 'Integration design review — DC Hubs 5–9. James Liu confirmed Nagios SNMP fallback approach. Maria Santos presented SNMP listener architecture. Hub 5 pilot site selected for May 6 validation.'],
            ['2026-03-28', 'Phase 2 scoping workshop — Alex Chen, Rachel Monroe, Kyle Park. 9 remaining hubs mapped to Phase 2 timeline. Parallel onboarding approach agreed for final 3 hubs. Q3 regional office onboarding added to scope.'],
            ['2026-03-20', 'Kickoff meeting at Vertex Logistics Dallas HQ. Rachel Monroe presented business case: 23,000 daily alerts across DC network, P1 MTTA at 47 minutes vs 15-minute SLA. Scope, phased timeline, and weekly cadence agreed.'],
          ]
        ),
        spacer(),

        // ── Footer ────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: '─────────────────────────────────────────────────────────', color: 'CBD5E1', size: 18 })],
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Confidential — BigPanda Professional Services  |  Vertex Logistics  |  April 2026', size: 18, color: '94A3B8' })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(process.cwd(), 'scripts', 'demo-ingestion-doc.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Demo ingestion document created: ${outputPath}`);
  console.log(`   Size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
  console.log(`\nUpload this file to the Context tab of any project to test the AI ingestion pipeline.`);
  console.log(`The document contains:`);
  console.log(`  • 5 milestones (1 complete, 4 on_track)`);
  console.log(`  • 3 risks with severity/likelihood/impact/target_date`);
  console.log(`  • 7 actions + 1 open question`);
  console.log(`  • 7 stakeholders with roles and emails`);
  console.log(`  • 4 key decisions with context`);
  console.log(`  • 5 engagement history entries`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
