import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4 bg-[#F0F8F5] min-h-[60vh] flex flex-col items-center justify-center rounded-2xl border border-[#F3C5BF] m-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FAECEB] text-[#A6473D] border border-[#F3C5BF] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-black text-[#1F5443]">
              Unable to load this incident.
            </h2>
            <p className="text-xs font-semibold text-[#4A7365] max-w-md mx-auto">
              Please try again.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#349670] hover:bg-[#2B8260] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <a
              href="/officer/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#B8E0CB] bg-white text-[#1F5443] font-bold text-xs hover:bg-[#E6F4ED] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Command Center</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
