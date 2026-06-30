import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from './Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary to catch and handle JavaScript errors in the component tree.
 * Prevents the entire app from crashing and provides a recovery option.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error details in state
    this.setState({
      error,
      errorInfo
    });

    // Optionally log to external service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    // Reload clears all state anyway — the setState above was redundant.
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1E1F24] text-[#DEDEDE] font-sans flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#2E3036] border border-[#363840] p-8 shadow-popover">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-semibold text-center mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-center mb-6">
              An unexpected error occurred. The error has been logged and you can try recovering.
            </p>

            {this.state.error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-300 mb-2">
                  Error details
                </summary>
                <div className="bg-[#1E1F24] rounded p-3 text-xs text-red-400 overflow-auto max-h-40">
                  <p className="font-mono mb-2">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="font-mono text-gray-500 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-[#363840] hover:bg-[#3E4049] text-white px-4 py-2.5 rounded font-medium transition-colors"
              >
                Go to Home
              </button>
            </div>

            <p className="text-xs text-gray-600 text-center mt-6">
              If this problem persists, try clearing your browser cache and localStorage.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
