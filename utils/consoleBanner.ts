/**
 * Console Banner for Linny
 * Shows a small brand banner in the browser console.
 */

export const showConsoleBanner = () => {
  if (import.meta.env.PROD) {
    const originalLog = console.log;
    const banner = `%cLinny`;
    const styles = [
      'color: #0066FF',
      'font-family: ui-sans-serif, system-ui, sans-serif',
      'font-size: 14px',
      'font-weight: bold'
    ].join(';');
    originalLog(banner, styles);
  }
};
