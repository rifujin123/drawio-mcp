import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { UseCaseSpecInputSchema, UseCaseSpecInput } from '../types/usecase-spec.js';

// ─── Helper: Render long text with wrapping ────────────────────

function wrapText(text: string): string {
  // Simple word wrap at 80 chars for text format
  if (text.length <= 80) return text;
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let idx = remaining.lastIndexOf(' ', 80);
    if (idx === -1) idx = 80;
    lines.push(remaining.substring(0, idx));
    remaining = remaining.substring(idx).trimStart();
  }
  return lines.join('\n  ');
}

// ─── Markdown Generator ────────────────────────────────────────

function generateMarkdown(input: UseCaseSpecInput): string {
  const lines: string[] = [];
  const hl = '─'.repeat(60);

  // ── Header ──
  lines.push(`# 📋 ĐẶC TẢ USE CASE`);
  lines.push('');
  lines.push(hl);
  lines.push('');

  // ── 1. Thông tin chung ──
  lines.push('## 1. Thông tin chung');
  lines.push('');

  // Simple definition list style for general info
  const infoRows: { label: string; value: string }[] = [
    { label: 'Tên use case', value: input.useCaseName },
    { label: 'Mã số', value: input.useCaseId ?? '—' },
    { label: 'Mô tả sơ lược', value: input.description },
  ];

  for (const row of infoRows) {
    lines.push(`| **${row.label}** | ${row.value} |`);
  }
  lines.push('');

  // ── 2. Actor ──
  lines.push('## 2. Actor');
  lines.push('');

  const actorRows: { label: string; value: string }[] = [
    { label: 'Actor chính', value: input.primaryActor },
    { label: 'Actor phụ', value: input.secondaryActor ?? 'Không có' },
  ];

  for (const row of actorRows) {
    lines.push(`| **${row.label}** | ${row.value} |`);
  }
  lines.push('');

  // ── 3. Điều kiện ──
  lines.push('## 3. Điều kiện');
  lines.push('');

  if (input.trigger) {
    lines.push(`| **Trigger / tác nhân kích hoạt** | ${input.trigger} |`);
  }

  lines.push('| **Tiền điều kiện** |');
  for (const cond of input.preConditions) {
    lines.push(`| › ${cond} |`);
  }
  lines.push('');

  lines.push('| **Hậu điều kiện** |');
  for (const cond of input.postConditions) {
    lines.push(`| › ${cond} |`);
  }
  lines.push('');

  if (input.priority) {
    lines.push(`| **Độ ưu tiên** | ${input.priority} |`);
    lines.push('');
  }

  // ── 4. Luồng sự kiện chính ──
  lines.push('## 4. Luồng sự kiện chính (Basic Flow)');
  lines.push('');
  lines.push('| # | Hành động của Actor | Phản hồi của Hệ thống |');
  lines.push('|---|---|---|');

  for (const step of input.mainFlow) {
    const actorText = step.actor ?? '';
    const systemText = step.system ?? '';
    // Check if this step has both, or is system-only / actor-only
    if (actorText && systemText) {
      // One row with both
      lines.push(`| ${step.step} | ${actorText} | ${systemText} |`);
    } else if (systemText && !actorText) {
      // System-only step: merge into previous or standalone
      lines.push(`| ${step.step} | | ${systemText} |`);
    } else if (actorText && !systemText) {
      // Actor-only: standalone
      lines.push(`| ${step.step} | ${actorText} | |`);
    }
  }
  lines.push('');

  // ── 5. Luồng sự kiện thay thế ──
  const altFlows = input.alternativeFlows ?? [];
  if (altFlows.length > 0) {
    lines.push('## 5. Luồng sự kiện thay thế (Alternative Flow)');
    lines.push('');
    lines.push('> Các luồng thay thế vẫn dẫn đến kết quả **thành công**, nhưng đi theo đường khác.');
    lines.push('');

    for (const flow of altFlows) {
      const flowName = flow.name ?? `Luồng thay thế`;
      lines.push(`### ${flowName}`);
      lines.push('');
      lines.push('| # | Hành động của Actor | Phản hồi của Hệ thống |');
      lines.push('|---|---|---|');
      for (const step of flow.steps) {
        const a = step.actor ?? '';
        const s = step.system ?? '';
        if (a && s) {
          lines.push(`| ${step.step} | ${a} | ${s} |`);
        } else if (s) {
          lines.push(`| ${step.step} | | ${s} |`);
        } else if (a) {
          lines.push(`| ${step.step} | ${a} | |`);
        }
      }
      lines.push('');
    }
  }

  // ── 6. Luồng sự kiện ngoại lệ ──
  const excFlows = input.exceptionFlows ?? [];
  if (excFlows.length > 0) {
    lines.push('## 6. Luồng sự kiện ngoại lệ (Exception Flow)');
    lines.push('');
    lines.push('> Các luồng ngoại lệ dẫn đến kết quả **thất bại** hoặc cần xử lý đặc biệt.');
    lines.push('');

    for (const flow of excFlows) {
      const flowName = flow.name ?? `Luồng ngoại lệ`;
      lines.push(`### ${flowName}`);
      lines.push('');
      lines.push('| # | Hành động của Actor | Phản hồi của Hệ thống |');
      lines.push('|---|---|---|');
      for (const step of flow.steps) {
        const a = step.actor ?? '';
        const s = step.system ?? '';
        if (a && s) {
          lines.push(`| ${step.step} | ${a} | ${s} |`);
        } else if (s) {
          lines.push(`| ${step.step} | | ${s} |`);
        } else if (a) {
          lines.push(`| ${step.step} | ${a} | |`);
        }
      }
      lines.push('');
    }
  }

  // ── 7. Thông tin bổ sung ──
  const br = input.businessRules ?? [];
  const nfr = input.nonFunctionalRequirements ?? [];
  if (br.length > 0 || nfr.length > 0) {
    lines.push('## 7. Thông tin bổ sung');
    lines.push('');

    if (br.length > 0) {
      lines.push('### Business Rules (Quy tắc nghiệp vụ)');
      lines.push('');
      for (const rule of br) {
        lines.push(`- ${rule}`);
      }
      lines.push('');
    }

    if (nfr.length > 0) {
      lines.push('### Non-Functional Requirements (Yêu cầu phi chức năng)');
      lines.push('');
      for (const req of nfr) {
        lines.push(`- ${req}`);
      }
      lines.push('');
    }
  }

  // ── Footer ──
  lines.push('---');
  lines.push(`*Đặc tả được tạo tự động — ${new Date().toLocaleDateString('vi-VN')}*`);
  lines.push('');

  return lines.join('\n');
}

// ─── Plain Text Generator ──────────────────────────────────────

function generateText(input: UseCaseSpecInput): string {
  const lines: string[] = [];
  const hl = '='.repeat(60);

  lines.push(hl);
  lines.push('  ĐẶC TẢ USE CASE');
  lines.push(hl);
  lines.push('');

  // 1. General info
  lines.push('1. THÔNG TIN CHUNG');
  lines.push('─'.repeat(40));
  lines.push(`  Tên use case:     ${input.useCaseName}`);
  lines.push(`  Mã số:            ${input.useCaseId ?? '—'}`);
  lines.push(`  Mô tả:            ${wrapText(input.description)}`);
  lines.push('');

  // 2. Actor
  lines.push('2. ACTOR');
  lines.push('─'.repeat(40));
  lines.push(`  Actor chính:      ${input.primaryActor}`);
  lines.push(`  Actor phụ:        ${input.secondaryActor ?? 'Không có'}`);
  lines.push('');

  // 3. Conditions
  lines.push('3. ĐIỀU KIỆN');
  lines.push('─'.repeat(40));
  if (input.trigger) lines.push(`  Trigger:          ${input.trigger}`);
  lines.push('  Tiền điều kiện:');
  for (const c of input.preConditions) lines.push(`    › ${c}`);
  lines.push('  Hậu điều kiện:');
  for (const c of input.postConditions) lines.push(`    › ${c}`);
  if (input.priority) lines.push(`  Độ ưu tiên:       ${input.priority}`);
  lines.push('');

  // 4. Main flow
  lines.push('4. LUỒNG SỰ KIỆN CHÍNH');
  lines.push('─'.repeat(40));
  for (const step of input.mainFlow) {
    const actorText = step.actor ? `[Actor] ${step.actor}` : '';
    const systemText = step.system ? `[System] ${step.system}` : '';
    const sep = actorText && systemText ? ' → ' : '';
    lines.push(`  ${step.step}. ${actorText}${sep}${systemText}`.trimEnd());
  }
  lines.push('');

  // 5. Alternative flows
  const altFlows = input.alternativeFlows ?? [];
  if (altFlows.length > 0) {
    lines.push('5. LUỒNG SỰ KIỆN THAY THẾ');
    lines.push('─'.repeat(40));
    for (const flow of altFlows) {
      const flowName = flow.name ?? 'Luồng thay thế';
      lines.push(`  [${flowName}]`);
      for (const step of flow.steps) {
        const a = step.actor ? `[Actor] ${step.actor}` : '';
        const s = step.system ? `[System] ${step.system}` : '';
        const sep = a && s ? ' → ' : '';
        lines.push(`    ${step.step}. ${a}${sep}${s}`.trimEnd());
      }
      lines.push('');
    }
  }

  // 6. Exception flows
  const excFlows = input.exceptionFlows ?? [];
  if (excFlows.length > 0) {
    lines.push('6. LUỒNG SỰ KIỆN NGOẠI LỆ');
    lines.push('─'.repeat(40));
    for (const flow of excFlows) {
      const flowName = flow.name ?? 'Luồng ngoại lệ';
      lines.push(`  [${flowName}]`);
      for (const step of flow.steps) {
        const a = step.actor ? `[Actor] ${step.actor}` : '';
        const s = step.system ? `[System] ${step.system}` : '';
        const sep = a && s ? ' → ' : '';
        lines.push(`    ${step.step}. ${a}${sep}${s}`.trimEnd());
      }
      lines.push('');
    }
  }

  // 7. Additional
  const br = input.businessRules ?? [];
  const nfr = input.nonFunctionalRequirements ?? [];
  if (br.length > 0 || nfr.length > 0) {
    lines.push('7. THÔNG TIN BỔ SUNG');
    lines.push('─'.repeat(40));
    if (br.length > 0) {
      lines.push('  Business Rules:');
      for (const r of br) lines.push(`    › ${r}`);
    }
    if (nfr.length > 0) {
      lines.push('  Non-Functional Reqs:');
      for (const r of nfr) lines.push(`    › ${r}`);
    }
    lines.push('');
  }

  lines.push(hl);
  return lines.join('\n');
}

// ─── Tool Definition ───────────────────────────────────────────

export const generateUseCaseSpecTool = {
  name: 'generate_usecase_specification',
  description: `Generate a detailed use case specification (đặc tả use case) in Vietnamese format.
Produces a structured document with use case name, actors, pre/post conditions, main flow,
alternative flows, and exception flows — rendered as a markdown table with Actor/System columns.
Optionally saves to a .md file.`,
  inputSchema: zodToJsonSchema(UseCaseSpecInputSchema),

  handler: async (args: unknown) => {
    const parsed = UseCaseSpecInputSchema.parse(args);

    // Generate content
    const markdown = generateMarkdown(parsed);
    const text = generateText(parsed);

    let outputContent: string;
    let contentType: string;
    let fileExt: string;

    if (parsed.outputFormat === 'text') {
      outputContent = text;
      contentType = 'text/plain';
      fileExt = 'txt';
    } else {
      outputContent = markdown;
      contentType = 'text/markdown';
      fileExt = 'md';
    }

    // Optionally write to file
    let savedPath: string | null = null;
    if (parsed.outputPath) {
      const resolved = path.resolve(parsed.outputPath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolved, outputContent, 'utf-8');
      savedPath = resolved;
    }

    // Build summary
    const summaryParts: string[] = [
      '✅ Use case specification generated successfully.',
      '',
      `📌 **Use case**: ${parsed.useCaseName}`,
      `👤 **Actor chính**: ${parsed.primaryActor}`,
      `📋 **Tiền điều kiện**: ${parsed.preConditions.length}`,
      `✅ **Hậu điều kiện**: ${parsed.postConditions.length}`,
      `🔄 **Main flow**: ${parsed.mainFlow.length} steps`,
      `↪️ **Alternative flows**: ${(parsed.alternativeFlows ?? []).length}`,
      `⚠️ **Exception flows**: ${(parsed.exceptionFlows ?? []).length}`,
    ];

    if (savedPath) {
      summaryParts.push(`📁 **Saved to**: \`${savedPath}\``);
    }

    summaryParts.push('');
    summaryParts.push('---');
    summaryParts.push('');
    summaryParts.push(outputContent);

    return {
      content: [
        {
          type: 'text',
          text: summaryParts.join('\n'),
        },
        ...(savedPath
          ? [
              {
                type: 'resource' as const,
                resource: {
                  uri: `file://${savedPath}`,
                  mimeType: contentType,
                  name: `Đặc tả Use Case — ${parsed.useCaseName}`,
                  text: outputContent,
                },
              },
            ]
          : []),
      ],
    };
  },
};
