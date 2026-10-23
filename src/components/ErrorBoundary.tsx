import { Component, type ReactNode } from 'react';

interface State { hasError: boolean }

/** Catches unexpected render errors so the user sees a calm message and the emergency number. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fatal" role="alert">
        <h1>Something went wrong</h1>
        <p>Your saved data on this device is kept. Reload the page to continue.</p>
        <p>In an emergency, call <a href="tel:112">112</a>.</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
