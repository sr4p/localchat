import { useEffect, useState } from "react";

import { LiquidIntro } from "./components/LiquidIntro";
import { LandingPage } from "./components/LandingPage";
import { ChatApp } from "./components/ChatApp";
import { useLLM } from "./hooks/useLLM";
import "katex/dist/katex.min.css";

function App() {
  const { status, loadModel } = useLLM();

  const [stage, setStage] = useState<"intro" | "app">("intro");
  const [hasStarted, setHasStarted] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const isReady = status.state === "ready";
  const isLoading = hasStarted && !isReady && status.state !== "error";

  const handleStart = () => {
    setHasStarted(true);
    loadModel();
  };

  const handleGoHome = () => {
    setShowChat(false);
    setTimeout(() => setHasStarted(false), 700);
  };

  useEffect(() => {
    if (isReady && hasStarted) {
      setShowChat(true);
    }
  }, [isReady, hasStarted]);

  return (
    <div className="relative h-screen w-screen brand-surface">
      {stage === "intro" && (
        <LiquidIntro onEnter={() => setStage("app")} />
      )}

      {stage === "app" && (
        <>
          <div
            className={`absolute inset-0 z-10 transition-all duration-700 ${
              showChat ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <LandingPage
              onStart={handleStart}
              status={status}
              isLoading={isLoading}
              showChat={showChat}
            />
          </div>

          <div
            className={`absolute inset-0 transition-all duration-700 ${
              showChat ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {hasStarted && <ChatApp onGoHome={handleGoHome} />}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
