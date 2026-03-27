import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-content" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong.</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
            The application encountered an unexpected error. This might be due to corrupted local data.
          </p>
          <button 
            type="button" 
            className="tab-btn active" 
            onClick={this.handleReset}
          >
            Reset Application Data
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre style={{ marginTop: '2rem', textAlign: 'left', overflow: 'auto', maxHeight: '200px', fontSize: '0.8rem', opacity: 0.7 }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
