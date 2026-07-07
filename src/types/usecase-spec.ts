import { z } from 'zod';

// ─── Use Case Specification Types ──────────────────────────────

export const FlowStepSchema = z.object({
  step: z.string().min(1).describe('Step number, e.g. "1", "2", "6.1", "9.2"'),
  actor: z.string().optional().describe('Action performed by the actor'),
  system: z.string().optional().describe('Action performed by the system'),
});

export const FlowGroupSchema = z.object({
  name: z.string().optional().describe('Optional name for this flow group (e.g., "Lớp đầy")'),
  steps: z.array(FlowStepSchema),
});

export const UseCaseSpecInputSchema = z.object({
  useCaseName: z.string().min(1).describe('Tên use case (e.g., "Đăng ký học phần")'),
  useCaseId: z.string().optional().describe('Mã định danh use case (e.g., "UC-01")'),
  description: z.string().min(1).describe('Mô tả sơ lược về use case'),
  primaryActor: z.string().min(1).describe('Actor chính'),
  secondaryActor: z.string().optional().describe('Actor phụ (nếu có)'),
  trigger: z.string().optional().describe('Điều kiện kích hoạt use case'),
  preConditions: z.array(z.string()).min(1).describe('Danh sách tiền điều kiện'),
  postConditions: z.array(z.string()).min(1).describe('Danh sách hậu điều kiện'),
  priority: z.string().optional().describe('Mức độ ưu tiên (e.g., "Must Have", "Should Have")'),

  mainFlow: z.array(FlowStepSchema).min(1).describe('Luồng sự kiện chính (happy case)'),
  alternativeFlows: z.array(FlowGroupSchema).optional().describe('Các luồng sự kiện thay thế'),
  exceptionFlows: z.array(FlowGroupSchema).optional().describe('Các luồng sự kiện ngoại lệ'),

  businessRules: z.array(z.string()).optional().describe('Các quy tắc business (nếu có)'),
  nonFunctionalRequirements: z.array(z.string()).optional().describe('Yêu cầu phi chức năng (nếu có)'),

  outputFormat: z.enum(['markdown', 'text']).optional().default('markdown').describe('Định dạng output'),
  outputPath: z.string().optional().describe('Đường dẫn file để lưu (optional)'),
});

export type FlowStep = z.infer<typeof FlowStepSchema>;
export type FlowGroup = z.infer<typeof FlowGroupSchema>;
export type UseCaseSpecInput = z.infer<typeof UseCaseSpecInputSchema>;
