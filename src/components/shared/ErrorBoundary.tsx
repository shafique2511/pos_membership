import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled application error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center p-4">
        <Card className="w-full max-w-xl border-destructive/30">
          <CardContent className="grid gap-4 pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 text-destructive" />
              <div>
                <h1 className="text-lg font-semibold">Something went wrong</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  The app caught an unexpected error. Refresh the page and check the console or monitoring logs if it happens again.
                </p>
                {this.state.message ? <p className="mt-3 rounded-md bg-muted p-3 text-sm">{this.state.message}</p> : null}
              </div>
            </div>
            <Button onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" />
              Reload app
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
}
