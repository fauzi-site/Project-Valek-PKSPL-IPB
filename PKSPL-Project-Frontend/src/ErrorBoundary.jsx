
import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", background: "#fee2e2", color: "#991b1b", minHeight: "100vh" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Something went wrong.</h1>
          <pre style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ marginTop: "1rem", whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>
            {this.state.info?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

