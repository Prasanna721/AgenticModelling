"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface AutomationStep {
  step: number;
  message: string;
  screenshotUrl?: string;
  status: "pending" | "running" | "completed" | "error";
  timestamp: number;
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("IDLE");
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  const startAutomation = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setSteps([]);
    setLatestScreenshot(null);
    setCurrentStep("INITIALIZING...");

    try {
      const response = await fetch("/api/post-job", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start automation");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "step") {
                setCurrentStep(data.message);
                setSteps((prev) => [
                  ...prev,
                  {
                    step: data.step,
                    message: data.message,
                    status: "running",
                    timestamp: Date.now(),
                  },
                ]);
              } else if (data.type === "screenshot") {
                setLatestScreenshot(data.url);
                setSteps((prev) =>
                  prev.map((s, i) =>
                    i === prev.length - 1
                      ? { ...s, screenshotUrl: data.url, status: "completed" }
                      : s
                  )
                );
              } else if (data.type === "complete") {
                setCurrentStep("COMPLETE");
                setSteps((prev) =>
                  prev.map((s) => ({ ...s, status: "completed" }))
                );
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setCurrentStep("ERROR");
    } finally {
      setIsRunning(false);
    }
  }, []);

  const getStatusClass = () => {
    if (error) return "error";
    if (isRunning) return "active";
    if (currentStep === "COMPLETE") return "success";
    return "";
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-bright)] bg-[var(--surface)]">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1
              className="text-xl tracking-[0.3em] text-[var(--accent)]"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
            >
              TZAFON
            </h1>
            <span className="text-xs text-[var(--text-muted)] tracking-wider">
              // JOB AUTOMATION
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="data-readout">
              STATUS: <span className="terminal-text">{currentStep}</span>
            </div>
            <div className={`status-led ${getStatusClass()}`} />
          </div>
        </div>
        {isRunning && <div className="loading-bar" />}
      </header>

      {/* Main content */}
      <main className="pt-14 pb-10 min-h-screen flex items-center justify-center px-4">
        {!latestScreenshot && !isRunning ? (
          // Initial state - centered button
          <div className="flex flex-col items-center justify-center gap-8">
            <div className="relative corner-brackets p-12">
              <div className="text-center mb-8">
                <p className="data-readout mb-2">READY TO DEPLOY</p>
                <p className="text-[var(--text-muted)] text-sm max-w-md">
                  Initialize browser automation sequence to post job listing on
                  Upwork platform.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={startAutomation}
                  disabled={isRunning}
                  className="industrial-btn"
                >
                  POST A JOB
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Running/completed state - viewport left, logs right
          <div className="w-full h-[calc(100vh-6rem)] flex gap-4">
            {/* Screenshot viewport - left side */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-[#0a0a0a] border border-[var(--border-bright)] flex flex-col">
                {/* Viewport header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[#111]">
                  <div className="flex items-center gap-3">
                    <div className={`status-led ${getStatusClass()}`} />
                    <span className="text-xs text-[var(--text-muted)] tracking-wider">
                      BROWSER VIEWPORT
                    </span>
                  </div>
                  <span className="text-xs text-[var(--accent)]">
                    {latestScreenshot ? "LIVE" : "CONNECTING..."}
                  </span>
                </div>

                {/* Screenshot display */}
                <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
                  {latestScreenshot ? (
                    <img
                      src={latestScreenshot}
                      alt="Browser automation screenshot"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                      <span className="terminal-text text-sm">
                        {currentStep}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action button below viewport */}
              {!isRunning && currentStep !== "IDLE" && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={startAutomation}
                    className="industrial-btn"
                  >
                    RUN AGAIN
                  </button>
                </div>
              )}
            </div>

            {/* Execution logs - right side */}
            <div className="w-80 border border-[var(--border-bright)] bg-[#0a0a0a] flex flex-col">
              <div className="px-4 py-2 border-b border-[var(--border)] bg-[#111] flex items-center justify-between">
                <span className="text-xs tracking-widest text-[var(--text-muted)]">
                  EXECUTION LOG
                </span>
                <span className="text-xs text-[var(--accent)]">
                  {steps.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {steps.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Waiting for execution...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-xs p-2 bg-[#111] border-l-2"
                        style={{
                          borderLeftColor:
                            step.status === "completed"
                              ? "var(--success)"
                              : step.status === "running"
                              ? "var(--accent)"
                              : step.status === "error"
                              ? "var(--error)"
                              : "var(--border)",
                        }}
                      >
                        <span className="text-[var(--text-muted)] shrink-0">
                          [{String(step.step).padStart(2, "0")}]
                        </span>
                        <span
                          className={
                            step.status === "running"
                              ? "terminal-text"
                              : "text-[var(--foreground)]"
                          }
                        >
                          {step.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 border border-[var(--error)] bg-[rgba(255,51,51,0.1)]">
                    <p className="text-xs text-[var(--error)]">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>TZAFON AUTOMATION</span>
          <span>
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            }).toUpperCase()}
          </span>
        </div>
      </footer>
    </div>
  );
}
