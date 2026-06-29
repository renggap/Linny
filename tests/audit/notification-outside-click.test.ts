import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/NotificationPopover.tsx'),
  'utf8'
);

describe('NotificationPopover outside-click + mark all read', () => {
  it('declares an onClose prop', () => {
    expect(src).toMatch(/onClose/);
    expect(src).toMatch(/interface NotificationPopoverProps[\s\S]*?onClose/);
  });

  it('adds mousedown listener via useEffect to detect outside clicks', () => {
    expect(src).toMatch(/useEffect/);
    expect(src).toMatch(/addEventListener\(['"]mousedown['"]/);
  });

  it('uses a ref to detect whether the click target is inside the popover', () => {
    expect(src).toMatch(/useRef/);
    expect(src).toMatch(/\.contains\(/);
  });

  it('renders a "Mark all read" button in the header', () => {
    expect(src).toMatch(/Mark all read/i);
  });

  it('wires the button to api.notifications.markAllRead via useMutation', () => {
    expect(src).toMatch(/markAllRead/);
    expect(src).toMatch(/useMutation/);
  });

  it('uses optimistic update to mark all notifications as read in the cache', () => {
    expect(src).toMatch(/setQueryData/);
  });
});
