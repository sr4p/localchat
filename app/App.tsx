import { useEffect, useState } from 'react';

import { LiquidIntro } from './components/LiquidIntro';
import { LandingPage } from './components/LandingPage';
import { ChatApp } from './components/ChatApp';
import { useLLM } from './hooks/useLLM';
import 'katex/dist/katex.min.css';

function App() {
  const { status, loadModel } = useLLM();

  const [stage, setStage] = useState<'intro' | 'app'>('intro');
  const [hasStarted, setHasStarted] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const isReady = status.state === 'ready';
  const isLoading = hasStarted && !isReady && status.state !== 'error';

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
      {stage === 'intro' && <LiquidIntro onEnter={() => setStage('app')} />}

      {stage === 'app' && (
        <>
          <ChatApp onGoHome={handleGoHome} />
        </>
      )}
    </div>
  );
}

export default App;
