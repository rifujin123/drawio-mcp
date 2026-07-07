import { describe, it, expect } from 'vitest';
import { generateUseCaseSpecTool } from '../../src/tools/usecase-spec.js';

const sampleInput = {
  useCaseName: 'Đăng ký học phần',
  useCaseId: 'UC-01',
  description: 'Chức năng Đăng ký học phần giúp sinh viên có thể đăng ký học phần trực tuyến.',
  primaryActor: 'Sinh viên',
  secondaryActor: '',
  trigger: 'Sinh viên chọn chức năng Đăng ký học phần',
  preConditions: ['Đăng nhập thành công.'],
  postConditions: [
    'Số lớp được cập nhật.',
    'Sinh viên sẽ có lịch học.',
  ],
  mainFlow: [
    { step: '1', actor: 'Chọn chức năng Đăng ký học phần', system: '' },
    { step: '2', actor: '', system: 'Hiển thị trang đăng ký học phần' },
    { step: '3', actor: 'Chọn học kỳ hiện tại', system: '' },
    { step: '4', actor: '', system: 'Hiển thị danh sách học phần trong học kỳ' },
    { step: '5', actor: 'Chọn học phần muốn đăng ký', system: '' },
    { step: '6', actor: '', system: 'Kiểm tra học phần tiên quyết' },
    { step: '7', actor: '', system: 'Hiển thị danh sách lớp học phần' },
    { step: '8', actor: 'Chọn 1 lớp học phần', system: '' },
    { step: '9', actor: '', system: 'Kiểm tra sĩ số lớp' },
    { step: '10', actor: '', system: 'Thông báo đăng ký thành công' },
  ],
};

describe('generateUseCaseSpecTool', () => {
  it('should have correct name and description', () => {
    expect(generateUseCaseSpecTool.name).toBe('generate_usecase_specification');
    expect(generateUseCaseSpecTool.description).toContain('đặc tả use case');
  });

  it('should have valid inputSchema', () => {
    expect(generateUseCaseSpecTool.inputSchema).toBeDefined();
    expect(typeof generateUseCaseSpecTool.inputSchema).toBe('object');
  });

  it('should generate markdown output by default', async () => {
    const result = await generateUseCaseSpecTool.handler(sampleInput);
    const text = result.content[0].text;

    expect(text).toContain('ĐẶC TẢ USE CASE');
    expect(text).toContain('Đăng ký học phần');
    expect(text).toContain('Sinh viên');
    expect(text).toContain('Đăng nhập thành công');
    expect(text).toContain('| 1 |');
    expect(text).toContain('| 10 |');
  });

  it('should contain all major sections in markdown', async () => {
    const result = await generateUseCaseSpecTool.handler(sampleInput);
    const text = result.content[0].text;

    expect(text).toContain('## 1. Thông tin chung');
    expect(text).toContain('## 2. Actor');
    expect(text).toContain('## 3. Điều kiện');
    expect(text).toContain('## 4. Luồng sự kiện chính');
  });

  it('should include alternative flows when provided', async () => {
    const input = {
      ...sampleInput,
      alternativeFlows: [
        {
          name: 'Môn tiên quyết không thỏa',
          steps: [
            { step: '6.1', system: 'Hiển thị thông báo môn tiên quyết không thỏa' },
            { step: '6.2', actor: 'Xác nhận' },
            { step: '6.3', system: 'Quay lại bước 4' },
          ],
        },
      ],
    };

    const result = await generateUseCaseSpecTool.handler(input);
    const text = result.content[0].text;
    expect(text).toContain('## 5. Luồng sự kiện thay thế');
    expect(text).toContain('Môn tiên quyết không thỏa');
    expect(text).toContain('6.1');
  });

  it('should include exception flows when provided', async () => {
    const input = {
      ...sampleInput,
      exceptionFlows: [
        {
          name: 'Lớp đầy',
          steps: [
            { step: '9.1', system: 'Kiểm tra nếu là sinh viên năm cuối' },
            { step: '9.2', system: 'Hiển thị thông báo đăng ký thành công' },
            { step: '9.3', actor: 'Xác nhận và kết thúc' },
          ],
        },
      ],
    };

    const result = await generateUseCaseSpecTool.handler(input);
    const text = result.content[0].text;
    expect(text).toContain('## 6. Luồng sự kiện ngoại lệ');
    expect(text).toContain('Lớp đầy');
    expect(text).toContain('9.1');
  });

  it('should include business rules and NFR when provided', async () => {
    const input = {
      ...sampleInput,
      businessRules: ['Sinh viên chỉ được đăng ký tối đa 25 tín chỉ mỗi học kỳ'],
      nonFunctionalRequirements: ['Hệ thống hỗ trợ tối thiểu 500 sinh viên đăng ký đồng thời'],
    };

    const result = await generateUseCaseSpecTool.handler(input);
    const text = result.content[0].text;
    expect(text).toContain('## 7. Thông tin bổ sung');
    expect(text).toContain('25 tín chỉ');
    expect(text).toContain('500 sinh viên');
  });

  it('should produce text format when requested', async () => {
    const input = { ...sampleInput, outputFormat: 'text' as const };
    const result = await generateUseCaseSpecTool.handler(input);
    const text = result.content[0].text;

    expect(text).not.toContain('| **Tên use case** |'); // markdown table syntax
    expect(text).toContain('Tên use case:'); // plain text format
  });

  it('should save to file when outputPath provided', async () => {
    const tmpFile = `__test_uc_spec_${Date.now()}.md`;
    const input = { ...sampleInput, outputPath: tmpFile };

    const result = await generateUseCaseSpecTool.handler(input);
    const text = result.content[0].text;

    expect(text).toContain('Saved to');
    expect(text).toContain(tmpFile);

    // Verify the file was written
    const fs = await import('node:fs');
    const fileContent = fs.readFileSync(tmpFile, 'utf-8');
    expect(fileContent).toContain('ĐẶC TẢ USE CASE');

    // Clean up
    fs.unlinkSync(tmpFile);
  });
});
