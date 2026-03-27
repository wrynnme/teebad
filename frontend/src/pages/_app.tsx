import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Component as ReactComponent } from "react";
import { LiffProvider } from "@/contexts/LiffContext";
import { Toaster } from "@/components/ui/sonner";

class ErrorBoundary extends ReactComponent<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace", color: "red" }}>
          <h2>Client Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <LiffProvider>
        <Component {...pageProps} />
        <Toaster richColors position="top-center" />
      </LiffProvider>
    </ErrorBoundary>
  );
}
