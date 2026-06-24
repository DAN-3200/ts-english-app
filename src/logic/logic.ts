import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import MOCK_DATA from "../data.json";

/* ============================================================
 * Domain entities (SRP)
 * ============================================================ */

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection";

export interface Word {
  _id?: string;
  term: string;
  partOfSpeech: PartOfSpeech;
  definition: string;
  examples: string[];
  synonyms?: string[];
  translation: string;
}

export interface Story {
  _id?: string;
  title: string;
  story: string;
  moral: string;
  words: Word[];
  level?: CefrLevel;
}

/* ============================================================
 * CEFR level classification (SRP + OCP)
 * ============================================================ */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type CefrBand = "basic" | "intermediate" | "advanced";

export interface CefrBandInfo {
  band: CefrBand;
  label: string;
  shortLabel: string;
  levels: string;
  tone: "good" | "warn" | "bad";
}

export function bandForLevel(level: CefrLevel): CefrBandInfo {
  if (level === "A1" || level === "A2") {
    return {
      band: "basic",
      label: "Básico",
      shortLabel: "Básico",
      levels: "A1/A2",
      tone: "good",
    };
  }
  if (level === "B1" || level === "B2") {
    return {
      band: "intermediate",
      label: "Intermediário",
      shortLabel: "Intermed.",
      levels: "B1/B2",
      tone: "warn",
    };
  }
  return {
    band: "advanced",
    label: "Avançado/Fluente",
    shortLabel: "Avançado",
    levels: "C1/C2",
    tone: "bad",
  };
}

export interface LevelClassifier {
  classify(sentence: string): CefrLevel;
}

/** Heuristic proxy for real NLP/API classification. */
export class HeuristicLevelClassifier implements LevelClassifier {
  classify(sentence: string): CefrLevel {
    const cleaned = sentence.trim();
    if (!cleaned) return "A1";
    const words = cleaned.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const avgLen =
      words.reduce(
        (acc, w) => acc + w.replace(/[^A-Za-zÀ-ÿ]/g, "").length,
        0,
      ) / Math.max(1, wordCount);
    const score = avgLen * 1.5 + wordCount * 0.12;
    if (score < 7) return "A1";
    if (score < 9) return "A2";
    if (score < 11) return "B1";
    if (score < 13) return "B2";
    if (score < 15) return "C1";
    return "C2";
  }
}

/* ============================================================
 * Ports (DIP + ISP)
 * ============================================================ */

export interface StoryRepository {
  getNext(): Promise<Story>;
}

export interface CompletionNotifier {
  notifyCompleted(): void;
}

export interface TextMatcher {
  matches(input: string, target: string): boolean;
}

/* ============================================================
 * Default implementations
 * ============================================================ */

const MOCK_STORIES: Story[] = MOCK_DATA as Story[];

export class MockStoryRepository implements StoryRepository {
  private index = 0;
  constructor(private readonly stories: Story[] = MOCK_STORIES) {}
  async getNext(): Promise<Story> {
    const story = this.stories[this.index % this.stories.length];
    this.index += 1;
    return Promise.resolve(story);
  }
}

export class WebAudioCompletionNotifier implements CompletionNotifier {
  notifyCompleted(): void {
    if (typeof window === "undefined") return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctor();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.18);
    } catch {
      /* no-op */
    }
  }
}

export class NoopCompletionNotifier implements CompletionNotifier {
  notifyCompleted(): void {}
}

export class CaseInsensitiveTextMatcher implements TextMatcher {
  matches(input: string, target: string): boolean {
    return input.toLowerCase().trim() === target.toLowerCase().trim();
  }
}

/* ============================================================
 * DI container
 * ============================================================ */

export interface UnlockWordDeps {
  repository: StoryRepository;
  notifier: CompletionNotifier;
  matcher: TextMatcher;
  levelClassifier: LevelClassifier;
}

export const defaultDeps: UnlockWordDeps = {
  repository: new MockStoryRepository(),
  notifier: new WebAudioCompletionNotifier(),
  matcher: new CaseInsensitiveTextMatcher(),
  levelClassifier: new HeuristicLevelClassifier(),
};

export const UnlockWordDepsContext = createContext<UnlockWordDeps>(defaultDeps);
export const useUnlockWordDeps = () => useContext(UnlockWordDepsContext);

/* ============================================================
 * Pure helpers
 * ============================================================ */

const PUNCT_RE = /[.,!?;:]/g;
const EDGE_PUNCT_RE = /^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?"']+$/g;

export const stripPunct = (s: string) => s.replace(PUNCT_RE, "");
export const trimEdgePunct = (s: string) => s.replace(EDGE_PUNCT_RE, "");

export function isWordTyped(
  word: string,
  wordStart: number,
  userInput: string,
): boolean {
  const clean = stripPunct(word);
  for (let i = 0; i < clean.length; i++) {
    const u = userInput[wordStart + i] || "";
    if (u.toLowerCase() !== clean[i].toLowerCase()) return false;
  }
  return true;
}

export function findWord(story: Story, raw: string): Word | null {
  const key = stripPunct(raw).toLowerCase();
  return story.words.find((w) => w.term.toLowerCase() === key) ?? null;
}

/** Count typing errors comparing user input to target. */
export function countErrors(input: string, target: string): number {
  let errs = 0;
  const len = Math.min(input.length, target.length);
  for (let i = 0; i < len; i++) {
    if (input[i].toLowerCase() !== target[i].toLowerCase()) errs += 1;
  }
  return errs;
}

/** Words-per-minute (5 chars = 1 word, standard typing metric). */
export function computeWpm(charsTyped: number, elapsedMs: number): number {
  if (elapsedMs <= 0 || charsTyped <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round(charsTyped / 5 / minutes);
}

/* ============================================================
 * Text segmentation (SRP) — pre-computes word/space tokens
 * so the view stays declarative and the matching loop runs
 * once per story instead of once per render.
 * ============================================================ */

export type Segment =
  | { kind: "space"; start: number }
  | { kind: "char"; start: number; char: string }
  | { kind: "word"; start: number; length: number; word: Word };

export function segmentStory(story: Story): Segment[] {
  const target = story.story;
  const segments: Segment[] = [];
  const sortedWords = [...(story.words || [])].sort(
    (a, b) => b.term.length - a.term.length,
  );

  let i = 0;
  while (i < target.length) {
    const ch = target[i];

    if (ch === " ") {
      segments.push({ kind: "space", start: i });
      i += 1;
      continue;
    }

    let matched: Word | null = null;
    let matchedLen = 0;
    for (const w of sortedWords) {
      const len = w.term.length;
      const seg = target.substring(i, i + len);
      if (trimEdgePunct(seg).toLowerCase() === trimEdgePunct(w.term).toLowerCase()) {
        matched = w;
        matchedLen = len;
        break;
      }
    }

    if (matched) {
      segments.push({ kind: "word", start: i, length: matchedLen, word: matched });
      i += matchedLen;
    } else {
      segments.push({ kind: "char", start: i, char: ch });
      i += 1;
    }
  }

  return segments;
}

/** A word segment is "unlocked" when fully and correctly typed. */
export function isSegmentTyped(
  seg: Extract<Segment, { kind: "word" }>,
  userInput: string,
  target: string,
): boolean {
  const typed = userInput.substring(seg.start, seg.start + seg.length);
  const expected = target.substring(seg.start, seg.start + seg.length);
  return (
    typed.length === seg.length &&
    typed.toLowerCase() === expected.toLowerCase()
  );
}

/* ============================================================
 * Orchestration hook
 * ============================================================ */

const EMPTY_STORY: Story = { title: "", story: "", moral: "", words: [] };

export function useUnlockWord() {
  const { repository, notifier, matcher, levelClassifier } = useUnlockWordDeps();

  const [story, setStory] = useState<Story>(EMPTY_STORY);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const loadNext = useCallback(async () => {
    setLoading(true);
    const next = await repository.getNext();
    setStory(next);
    setUserInput("");
    setSelectedWord(null);
    setIsComplete(false);
    setStartedAt(null);
    setElapsedMs(0);
    setLoading(false);
    queueMicrotask(() => inputRef.current?.focus());
  }, [repository]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const targetText = story.story;

  /* completion */
  useEffect(() => {
    if (!isComplete && targetText && matcher.matches(userInput, targetText)) {
      setIsComplete(true);
      notifier.notifyCompleted();
    }
  }, [userInput, targetText, isComplete, matcher, notifier]);

  /* live timer */
  useEffect(() => {
    if (startedAt === null || isComplete) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);
    return () => window.clearInterval(id);
  }, [startedAt, isComplete]);

  const handleInputChange = useCallback(
    (raw: string) => {
      if (isComplete) return;
      const clamped = raw.slice(0, targetText.length);
      setUserInput(clamped);
      if (startedAt === null && clamped.length > 0) {
        setStartedAt(Date.now());
      }
    },
    [isComplete, targetText.length, startedAt],
  );

  const resetInput = useCallback(() => {
    setUserInput("");
    setStartedAt(null);
    setElapsedMs(0);
    setIsComplete(false);
    focusInput();
  }, [focusInput]);

  /** Select a word for the dictionary panel without stealing focus. */
  const selectWord = useCallback(
    (w: Word) => {
      setSelectedWord(w);
      // Keep typing flow alive — re-focus textarea after the click.
      focusInput();
    },
    [focusInput],
  );

  const stats = useMemo(() => {
    const errors = countErrors(userInput, targetText);
    const typed = userInput.length;
    const accuracy =
      typed === 0
        ? 100
        : Math.max(0, Math.round(((typed - errors) / typed) * 100));
    const wpm = computeWpm(typed, elapsedMs);
    return { errors, accuracy, wpm, typed };
  }, [userInput, targetText, elapsedMs]);

  const progress =
    targetText.length === 0 ? 0 : (userInput.length / targetText.length) * 100;

  const level = useMemo<CefrLevel>(
    () => story.level ?? levelClassifier.classify(targetText),
    [story.level, targetText, levelClassifier],
  );
  const levelBand = useMemo(() => bandForLevel(level), [level]);

  const segments = useMemo(() => segmentStory(story), [story]);

  return {
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
    level,
    levelBand,
    segments,
    setSelectedWord: selectWord,
    setIsFocused,
    focusInput,
    handleInputChange,
    resetInput,
    handleNextParagraph: loadNext,
  };
}
