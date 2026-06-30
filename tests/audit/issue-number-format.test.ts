import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const issuesRouteSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/issues.fastify.ts'),
  'utf8'
);
const projectSettingsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../components/ProjectSettingsModal.tsx'),
  'utf8'
);

describe('issue identifier numbering', () => {
  // Bug: defaults to 101 instead of 1, leaving a confusing gap when a
  // project has its first few issues. Also unpadded — NEO-1, NEO-2, NEO-10
  // look inconsistent vs NEO-001, NEO-002, NEO-010. Linear-style numbering
  // pads to 3 digits and lets ≥1000 render at natural width.

  it('first issue in a project starts at 1 (was 101)', () => {
    expect(issuesRouteSrc).toMatch(/highestNumber > 0 \? highestNumber \+ 1 : 1/);
    expect(issuesRouteSrc).not.toMatch(/: 101\b/);
  });

  it('identifier numeric portion is padded to 3 digits', () => {
    expect(issuesRouteSrc).toMatch(/String\(nextNumber\)\.padStart\(3, '0'\)/);
    expect(issuesRouteSrc).toMatch(/identifier: `\$\{project\.identifier\}-\$\{paddedNumber\}`/);
    expect(issuesRouteSrc).toMatch(/identifier: `\$\{parentIssue\.project\.identifier\}-\$\{paddedNumber\}`/);
  });
});

describe('project settings modal closes after delete', () => {
  // Bug: after await onDelete(...) resolved, nothing called onClose. The
  // user saw the modal stay open showing details for a project that had
  // just been removed from the DB. Worse: the modal's save/delete state
  // was now operating on a stale project reference.

  it('calls onClose() after successful delete', () => {
    const onClickBlock = projectSettingsSrc.match(/onClick=\{async \(\) => \{[\s\S]*?await onDelete\(project\.id\);[\s\S]*?\}\}/)?.[0] ?? '';
    expect(onClickBlock).toMatch(/await onDelete\(project\.id\);/);
    expect(onClickBlock).toMatch(/onClose\(\)/);
  });

  it('keeps modal open on delete failure (user can retry)', () => {
    const onClickBlock = projectSettingsSrc.match(/onClick=\{async \(\) => \{[\s\S]*?await onDelete[\s\S]*?\}\}/)?.[0] ?? '';
    expect(onClickBlock).toMatch(/catch/);
    // onClose should be inside try (success path), not after finally
    const onCloseIdx = onClickBlock.indexOf('onClose()');
    const catchIdx = onClickBlock.indexOf('catch');
    expect(onCloseIdx).toBeGreaterThan(-1);
    expect(catchIdx).toBeGreaterThan(onCloseIdx);
  });
});
