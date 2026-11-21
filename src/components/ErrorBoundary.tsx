import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Sitara Cloth House ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 p-6">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
              Something went wrong
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2.5 rounded-lg bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Return to Sitara Cloth House
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
