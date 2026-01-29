/**
 * Console Banner for Neo Linear
 * Shows a fancy desk lamp banner in the browser console
 * Disables all other console logs in production (like Linear.app does)
 */

export const showConsoleBanner = () => {
  // Disable all console logs in production except for our banner
  if (import.meta.env.PROD) {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    // Override console methods to silence them
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.error = () => {};

    // Show our banner - just NEO
    const banner = `
%c
  _   _   _
 / \\ / \\ / \\
( N | E | O )
 \\_/ \\_/ \\_/

`;

    const styles = [
      'color: #5E6AD2',
      'font-family: monospace',
      'font-size: 12px',
      'line-height: 12px',
      'font-weight: bold'
    ].join(';');

    originalLog(banner, styles);
  }
};
