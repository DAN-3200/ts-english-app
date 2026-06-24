import { BookOpen, Eye, EyeOff, RotateCcw, Keyboard } from "lucide-react";
import { useEffect, useRef, useState, type JSX, type ReactNode, type MouseEvent } from "react";
import {
  UnlockWordDepsContext,
  defaultDeps,
  isSegmentTyped,
  useUnlockWord,
  type CefrBandInfo,
  type CefrLevel,
  type Segment,
  type UnlockWordDeps,
  type Word,
} from "../logic/logic";

/* ============================================================
 * Root: wires dependencies (DIP).
 * ============================================================ */

export const UnlockWordApp = ({ deps }: { deps?: Partial<UnlockWordDeps> }) => {
  const merged: UnlockWordDeps = { ...defaultDeps, ...deps };
  return (
    <UnlockWordDepsContext.Provider value={merged}>
      <UnlockWordScreen />
    </UnlockWordDepsContext.Provider>
  );
};

/* ============================================================
 * Screen — composition only
 * ============================================================ */

const UnlockWordScreen = () => {
  const {
    story,
    loading,
    targetText,
    userInput,
    selectedWord,
    isComplete,
    isFocused,
    inputRef,
    progress,
    stats,
    segments,
    setSelectedWord,
    setIsFocused,
    focusInput,
    handleInputChange,
    resetInput,
    handleNextParagraph,
    level,
    levelBand,
  } = useUnlockWord();

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-7xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white border border-stone-200 rounded overflow-hidden shadow-sm">
              <ProgressHeader
                title={story.title || "Loading…"}
                progress={progress}
                stats={stats}
                onReset={resetInput}
                canReset={userInput.length > 0 && !isComplete}
                level={level}
                levelBand={levelBand}
              />

              {/*
                Click anywhere in the practice area refocuses the hidden input.
                The textarea itself is pointer-events:none so word clicks reach
                the <span onClick> below it.
              */}
              <div
                onClick={focusInput}
                className="relative px-8 md:px-12 py-12 md:py-16 min-h-[500px] cursor-default"
              >
                <TypingInput
                  ref={inputRef}
                  value={userInput}
                  disabled={isComplete || loading}
                  onChange={handleInputChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  ariaLabel={`Digite o texto: ${targetText}`}
                />

                <div className="mb-8 flex items-center justify-between">
                  <div className="text-xs text-gray-600 uppercase font-semibold tracking-wider">
                    Digite para praticar
                  </div>
                  <FocusIndicator focused={isFocused} disabled={isComplete || loading} />
                </div>

                {loading ? (
                  <SkeletonLines />
                ) : (
                  <TextDisplay
                    segments={segments}
                    targetText={targetText}
                    userInput={userInput}
                    isComplete={isComplete}
                    isFocused={isFocused}
                    onWordClick={setSelectedWord}
                  />
                )}

                {!isFocused && !isComplete && !loading && userInput.length === 0 && (
                  <FocusOverlay onClick={focusInput} />
                )}

                {isComplete && (
                  <CompletionFooter
                    moral={story.moral}
                    onNext={handleNextParagraph}
                    stats={stats}
                  />
                )}
              </div>
            </div>
          </div>
          <DictionaryView selectedWord={selectedWord} />
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * Typing input — hidden, accessible, NON-blocking
 *  - pointer-events-none so it never intercepts clicks
 *  - focus is driven programmatically by the wrapper's onClick
 *  - autoCapitalize / autoCorrect / spellCheck off for accurate practice
 * ============================================================ */

interface TypingInputProps {
  value: string;
  disabled: boolean;
  ariaLabel: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  ref: React.Ref<HTMLTextAreaElement>;
}

const TypingInput = ({
  value,
  disabled,
  ariaLabel,
  onChange,
  onFocus,
  onBlur,
  ref,
}: TypingInputProps) => (
  <textarea
    ref={ref}
    value={value}
    disabled={disabled}
    aria-label={ariaLabel}
    autoCapitalize="off"
    autoCorrect="off"
    autoComplete="off"
    spellCheck={false}
    onChange={(e) => onChange(e.target.value)}
    onFocus={onFocus}
    onBlur={onBlur}
    tabIndex={-1}
    className="absolute inset-0 z-0 h-full w-full resize-none bg-transparent text-transparent caret-transparent opacity-0 outline-none pointer-events-none"
  />
);

const FocusIndicator = ({
  focused,
  disabled,
}: {
  focused: boolean;
  disabled: boolean;
}) => (
  <div
    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${disabled ? "text-stone-400" : focused ? "text-green-700" : "text-stone-500"
      }`}
  >
    <span
      className={`inline-block size-1.5 rounded-full transition-all ${focused && !disabled ? "bg-green-600 animate-pulse" : "bg-stone-400"
        }`}
    />
    {focused ? "Pronto" : "Toque para digitar"}
  </div>
);

const FocusOverlay = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-[2px] text-stone-700 transition-all hover:bg-white/80"
  >
    <div className="flex size-12 items-center justify-center rounded-full bg-green-700 text-white shadow-md">
      <Keyboard className="size-6" />
    </div>
    <div className="text-sm font-semibold">Toque para começar a digitar</div>
    <div className="text-xs text-stone-500">ou pressione qualquer tecla</div>
  </button>
);

/* ============================================================
 * Presentational pieces
 * ============================================================ */

interface Stats {
  wpm: number;
  accuracy: number;
  errors: number;
  typed: number;
}

const ProgressHeader = ({
  title,
  progress,
  stats,
  onReset,
  canReset,
  level,
  levelBand,
}: {
  title: string;
  progress: number;
  stats: Stats;
  onReset: () => void;
  canReset: boolean;
  level: CefrLevel;
  levelBand: CefrBandInfo;
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const prevProgress = useRef(progress);
  useEffect(() => {
    if (progress !== prevProgress.current) {
      prevProgress.current = progress;
      setIsTyping(true);
      const id = window.setTimeout(() => setIsTyping(false), 500);
      return () => window.clearTimeout(id);
    }
  }, [progress]);

  return (
    <div className="bg-stone-100 px-6 md:px-8 py-4 border-b border-stone-200">
      <div className="flex items-center justify-between mb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <LevelBadge level={level} band={levelBand} />
          <div className="text-gray-900 font-bold text-lg truncate">{title}</div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-stone-700 shrink-0">
          <Stat label="WPM" value={stats.wpm} />
          <Stat
            label="Precisão"
            value={`${stats.accuracy}%`}
            tone={stats.accuracy >= 95 ? "good" : stats.accuracy >= 80 ? "warn" : "bad"}
          />
          <Stat
            label="Erros"
            value={stats.errors}
            tone={stats.errors === 0 ? "good" : "bad"}
          />
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            aria-label="Reiniciar digitação"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-stone-600 transition hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <span className="text-green-800 font-bold text-lg tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <div className="w-full bg-stone-300 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${isTyping
              ? "bg-[linear-gradient(90deg,#15803d,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#f59e0b,#22c55e,#15803d)] bg-[length:300%_100%] animate-[rainbow-shimmer_1.6s_linear_infinite] shadow-[0_0_12px_rgba(34,197,94,0.7)]"
              : "bg-green-700"
            }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const LEVEL_BADGE_TONE: Record<CefrBandInfo["tone"], string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-300",
  warn: "bg-amber-100 text-amber-800 border-amber-300",
  bad: "bg-rose-100 text-rose-800 border-rose-300",
};

const LevelBadge = ({ level, band }: { level: CefrLevel; band: CefrBandInfo }) => (
  <div
    title={`${band.label} (${band.levels})`}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider shrink-0 ${LEVEL_BADGE_TONE[band.tone]}`}
  >
    <span className="font-mono text-[11px]">{level}</span>
    <span className="hidden sm:inline opacity-80">· {band.shortLabel}</span>
  </div>
);

const Stat = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) => {
  const color =
    tone === "good"
      ? "text-green-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "bad"
          ? "text-red-700"
          : "text-stone-700";
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className={`tabular-nums text-sm ${color}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
        {label}
      </span>
    </div>
  );
};

const CompletionFooter = ({
  moral,
  onNext,
  stats,
}: {
  moral: string;
  onNext: () => void;
  stats: Stats;
}) => (
  <div className="mt-12 pt-8 border-t border-stone-200">
    <p className="text-stone-600 text-sm mb-6 italic text-center">
      <span className="font-semibold text-stone-700">Moral:</span> {moral}
    </p>
    <div className="flex flex-col items-center gap-4">
      <div className="text-green-800 text-xl font-bold">✓ Texto completo!</div>
      <div className="flex gap-6 text-xs text-stone-600">
        <span>
          <strong className="text-stone-900">{stats.wpm}</strong> WPM
        </span>
        <span>
          <strong className="text-stone-900">{stats.accuracy}%</strong> precisão
        </span>
      </div>
      <button
        onClick={onNext}
        className="bg-green-800 hover:bg-green-900 text-white px-8 py-3 rounded font-semibold text-sm transition-colors duration-200"
      >
        Próximo Texto →
      </button>
    </div>
  </div>
);

const SkeletonLine = ({ className = "" }: { className?: string }) => (
  <div className={`h-4 w-full rounded-md bg-stone-200 animate-pulse ${className}`} />
);

const SkeletonLines = () => (
  <div className="space-y-3">
    <SkeletonLine />
    <SkeletonLine className="w-11/12" />
    <SkeletonLine className="w-10/12" />
    <SkeletonLine className="w-8/12" />
  </div>
);

/* ============================================================
 * TextDisplay — pure render from pre-computed segments.
 * Word spans own the dictionary-trigger interaction; they
 * stopPropagation so the wrapper's focus handler doesn't fire
 * when the user is opening the dictionary.
 * ============================================================ */

const TextDisplay = ({
  segments,
  targetText,
  userInput,
  isComplete,
  isFocused,
  onWordClick,
}: {
  segments: Segment[];
  targetText: string;
  userInput: string;
  isComplete: boolean;
  isFocused: boolean;
  onWordClick: (w: Word) => void;
}) => {
  const cursorAt = userInput.length;
  const showCursor = isFocused && !isComplete;

  const renderChars = (textSegment: string, startIndex: number) =>
    textSegment.split("").map((char, i) => {
      const gi = startIndex + i;
      const u = userInput[gi] || "";
      const has = u !== "";
      const ok = u.toLowerCase() === char.toLowerCase();
      const isCursor = gi === cursorAt && showCursor;

      return (
        <span
          key={i}
          className={`relative transition-colors duration-150 ${has && ok
              ? "text-gray-900"
              : has && !ok
                ? "text-red-700 bg-red-50"
                : "text-gray-400"
            }`}
        >
          {isCursor && (
            <span className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-green-700 animate-pulse" />
          )}
          {char}
        </span>
      );
    });

  const elements: JSX.Element[] = segments.map((seg) => {
    if (seg.kind === "space") {
      const u = userInput[seg.start] || "";
      const has = u !== "";
      const ok = u === " ";
      const isCursor = seg.start === cursorAt && showCursor;
      return (
        <span
          key={`space-${seg.start}`}
          className={`inline-block relative transition-colors duration-150 ${has && !ok ? "bg-red-100" : ""
            }`}
          style={{ width: "0.35em" }}
        >
          {isCursor && (
            <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-700 animate-pulse" />
          )}
          {has && !ok && (
            <span className="absolute inset-0 flex items-center justify-center text-red-700 text-[10px]">
              ⎵
            </span>
          )}
        </span>
      );
    }

    if (seg.kind === "char") {
      return (
        <span key={`char-${seg.start}`}>
          {renderChars(seg.char, seg.start)}
        </span>
      );
    }

    // word segment
    const unlocked = isSegmentTyped(seg, userInput, targetText);
    const handleClick = (e: MouseEvent<HTMLSpanElement>) => {
      if (!unlocked) return;
      e.stopPropagation();
      onWordClick(seg.word);
    };

    return (
      <span
        key={`word-${seg.start}`}
        onClick={handleClick}
        role={unlocked ? "button" : undefined}
        tabIndex={unlocked ? 0 : undefined}
        aria-label={unlocked ? `Definição de ${seg.word.term}` : undefined}
        className={`relative z-10 transition-all duration-200 ${unlocked
            ? "cursor-pointer hover:underline decoration-green-700 decoration-2 underline-offset-4"
            : ""
          }`}
      >
        {renderChars(targetText.substring(seg.start, seg.start + seg.length), seg.start)}
      </span>
    );
  });

  return (
    <div className="relative z-10 text-xl leading-relaxed font-serif select-none">
      {elements}
    </div>
  );
};

/* ============================================================
 * Dictionary
 * ============================================================ */

const DictionaryView = ({ selectedWord }: { selectedWord: Word | null }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="lg:col-span-1">
      <div className="bg-white border border-stone-200 rounded p-6 sticky top-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-green-800" />
          <h3 className="text-lg font-bold text-gray-900">Dicionário</h3>
        </div>

        {selectedWord ? (
          <div className="space-y-4">
            <h3 className="text-3xl font-bold text-gray-900 mb-1 capitalize">
              {selectedWord.term}
            </h3>
            <span className="text-gray-600 text-sm italic">
              {selectedWord.partOfSpeech}
            </span>

            <div className="bg-stone-100 rounded p-3 border-l-4 border-green-800 flex items-start justify-between gap-3">
              {visible ? (
                <div className="text-green-800 font-semibold text-base">
                  {selectedWord.translation}
                </div>
              ) : (
                <div className="italic text-stone-400 select-none">
                  Translation hidden
                </div>
              )}
              <button
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Hide translation" : "Show translation"}
                className="text-green-800 hover:text-green-900 transition"
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Section label="Definição">
              <p className="text-gray-800 leading-relaxed text-sm">
                {selectedWord.definition}
              </p>
            </Section>

            <div className="bg-stone-50 rounded p-3">
              <SectionLabel>Exemplo</SectionLabel>
              <p className="text-gray-700 italic leading-relaxed text-sm">
                "{selectedWord.examples?.[0] ?? ""}"
              </p>
            </div>

            {selectedWord.synonyms && selectedWord.synonyms.length > 0 && (
              <Section label="Sinônimos">
                <div className="flex flex-wrap gap-2">
                  {selectedWord.synonyms.map((s, i) => (
                    <span
                      key={i}
                      className="inline-block bg-stone-100 text-gray-800 px-3 py-1 rounded-full text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-gray-600 text-sm leading-relaxed">
              Clique em uma palavra
              <br />
              completamente digitada para
              <br />
              ver sua definição
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
    {children}
  </div>
);

const Section = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <SectionLabel>{label}</SectionLabel>
    {children}
  </div>
);
