import { useState, useEffect } from "react";
import {
  Loader2,
  Rocket,
  ShieldCheck,
  Brain,
  ArrowUpRight,
} from "lucide-react";
import type { LoadingStatus } from "../hooks/LLMContext";
import HfIcon from "./HfIcon";

interface LandingPageProps {
  onStart: () => void;
  status: LoadingStatus;
  isLoading: boolean;
  showChat: boolean;
}

const cards = [
  {
    title: "Step-by-step reasoning",
    eyebrow: "REASONING MODEL",
    body: "LFM2.5-Thinking generates its reasoning process before producing final answers, improving accuracy on complex tasks like math, coding, and logic.",
    Icon: Rocket,
  },
  {
    title: "Private edge inference",
    eyebrow: "LOCAL & PRIVATE",
    body: "WebGPU-accelerated browser inference ensures high performance. No data is sent to a server, and the demo can even run offline after the initial download.",
    Icon: ShieldCheck,
  },
  {
    title: "Scaled reinforcement",
    eyebrow: "TRAINING PIPELINE",
    body: "The 1.2B parameter model benefits from extended pre-training on 28T tokens and large-scale multi-stage reinforcement learning for best-in-class performance.",
    Icon: Brain,
  },
] as const;

export function LandingPage({ onStart, status, isLoading, showChat }: LandingPageProps) {
  const [introFade, setIntroFade] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIntroFade(false), 50);
    return () => clearTimeout(t);
  }, []);

  const hideMainContent = isLoading || showChat;
  const readyToStart = status.state === "ready";

  return (
    <div className="brand-surface relative flex h-full min-h-full flex-col overflow-x-hidden overflow-y-auto text-black">
      <div className="landing-brand-glow absolute inset-0" />

      <div
        className={`absolute inset-0 z-50 bg-white transition-opacity duration-1000 pointer-events-none ${
          introFade ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative z-10 mx-auto flex min-h-full w-full max-w-7xl flex-col px-6 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 lg:px-14 transition-all duration-700 ${
          hideMainContent
            ? "opacity-0 translate-y-4 pointer-events-none"
            : "opacity-100"
        }`}
      >
        <header className="animate-rise-in flex items-start justify-between">
          <img
            src="/liquid.svg"
            alt="Liquid AI"
            className="h-10 w-auto sm:h-12"
            draggable={false}
          />
          <p className="font-support text-[10px] uppercase tracking-[0.22em] text-[#000000b3] sm:text-xs">
            LFM2.5 WebGPU Demo
          </p>
        </header>

        <section className="mt-8 flex flex-col items-center text-center sm:mt-12 lg:mt-14">
          <div className="animate-rise-in-delayed space-y-5">
            <p className="font-support text-xs uppercase tracking-[0.2em] text-[#5505afb3]">
              Capable and efficient general-purpose AI systems at every scale
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              Capable reasoning.<br />Local inference.<br />WebGPU accelerated.
            </h1>
            <p className="max-w-2xl mx-auto text-base leading-relaxed text-[#000000b3] sm:text-lg">
              Run
              <a
                href="https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking-ONNX"
                target="_blank"
                rel="noreferrer"
                className="mx-1 underline decoration-[#5505af4d] underline-offset-4 hover:text-[#5505af] transition-colors"
              >
                LFM2.5-1.2B-Thinking
              </a>
              directly in your browser, powered by
              <HfIcon className="size-7 inline-block ml-1 mb-[1px]" />
              <a
                href="https://github.com/huggingface/transformers.js"
                target="_blank"
                rel="noreferrer"
                className="ml-1 underline decoration-[#5505af4d] underline-offset-4 hover:text-[#5505af] transition-colors"
              >
                Transformers.js
              </a>
            </p>
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-4 sm:mt-8 lg:mt-10 lg:flex-row">
          {cards.map(({ eyebrow, title, body, Icon }, idx) => (
            <article
              key={title}
              className="animate-rise-in flex-1 flex items-start gap-4 rounded-2xl border border-[#0000001a] bg-[#ffffffcc] px-4 py-4 backdrop-blur-sm sm:gap-5 sm:px-6 sm:py-5"
              style={{ animationDelay: `${120 + idx * 90}ms` }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#5505af4d] bg-[linear-gradient(135deg,#5505AF_0%,#CD82F0_55%,#FF5F1E_100%)] text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-support text-[10px] uppercase tracking-[0.2em] text-[#00000080]">
                  {eyebrow}
                </p>
                <h3 className="mt-1 text-xl font-medium leading-tight text-black">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#000000b3] sm:text-[15px]">
                  {body}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 flex flex-col items-center animate-rise-in sm:mt-8 lg:mt-10" style={{ animationDelay: "400ms" }}>
          <button
            onClick={onStart}
            className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-base font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#5505af] cursor-pointer"
          >
            {readyToStart
              ? "Start chatting"
              : "Load model & start chatting"}
            <ArrowUpRight className="h-4 w-4" />
          </button>
          {!readyToStart && (
            <p className="mt-3 text-xs text-[#00000080]">
              ~750 MB will be downloaded and cached locally for future sessions.
            </p>
          )}
        </section>
      </div>

      <div
        className={`brand-surface absolute inset-0 z-20 flex flex-col items-center justify-center transition-opacity duration-700 ${
          isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className={`flex w-full max-w-md flex-col items-center px-6 transition-all duration-700 ${isLoading ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <img
            src="/liquid.svg"
            alt="Liquid AI"
            className="mb-8 h-9 w-auto"
            draggable={false}
          />
          <Loader2 className="h-10 w-10 animate-spin text-[#5505af]" />
          <p className="mt-4 text-sm tracking-wide text-[#000000b3]">
            {status.state === "loading"
              ? (status.message ?? "Loading model…")
              : status.state === "error"
                ? "Error"
                : "Initializing…"}
          </p>
          <div className="mt-4 h-1.5 w-full rounded-full bg-[#0000001a] overflow-hidden">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#5505AF_0%,#CD82F0_60%,#FF5F1E_100%)] transition-[width] duration-300 ease-out"
              style={{
                width: `${status.state === "ready" ? 100 : status.state === "loading" && status.progress != null ? status.progress : 0}%`,
              }}
            />
          </div>
          {status.state === "error" && (
            <p className="mt-3 text-sm text-red-600">{status.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
