import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import MOCK_DATA from '../data.json';

/* ============================================================
 * Domain entities (SRP)
 * ============================================================ */

export type PartOfSpeech =
	| 'noun'
	| 'verb'
	| 'adjective'
	| 'adverb'
	| 'pronoun'
	| 'preposition'
	| 'conjunction'
	| 'interjection';

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

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type CefrBand = 'basic' | 'intermediate' | 'advanced';

export interface CefrBandInfo {
	band: CefrBand;
	label: string;
	shortLabel: string;
	levels: string;
	tone: 'good' | 'warn' | 'bad';
}

export function bandForLevel(level: CefrLevel): CefrBandInfo {
	if (level === 'A1' || level === 'A2') {
		return {
			band: 'basic',
			label: 'Básico',
			shortLabel: 'Básico',
			levels: 'A1/A2',
			tone: 'good',
		};
	}
	if (level === 'B1' || level === 'B2') {
		return {
			band: 'intermediate',
			label: 'Intermediário',
			shortLabel: 'Intermed.',
			levels: 'B1/B2',
			tone: 'warn',
		};
	}
	return {
		band: 'advanced',
		label: 'Avançado/Fluente',
		shortLabel: 'Avançado',
		levels: 'C1/C2',
		tone: 'bad',
	};
}

export interface LevelClassifier {
	classify(sentence: string): CefrLevel;
}

/** Heuristic proxy for real NLP/API classification. */
export class HeuristicLevelClassifier implements LevelClassifier {
	classify(sentence: string): CefrLevel {
		const cleaned = sentence.trim();
		if (!cleaned) return 'A1';
		const words = cleaned.split(/\s+/).filter(Boolean);
		const wordCount = words.length;
		const avgLen =
			words.reduce(
				(acc, w) => acc + w.replace(/[^A-Za-zÀ-ÿ]/g, '').length,
				0,
			) / Math.max(1, wordCount);
		const score = avgLen * 1.5 + wordCount * 0.12;
		if (score < 7) return 'A1';
		if (score < 9) return 'A2';
		if (score < 11) return 'B1';
		if (score < 13) return 'B2';
		if (score < 15) return 'C1';
		return 'C2';
	}
}

/* ============================================================
 * Story selection strategy (SRP + OCP)
 * ============================================================ */

export interface StorySelectionStrategy {
	next(total: number, previousIndex: number | null): number;
}

export class SequentialStorySelectionStrategy implements StorySelectionStrategy {
	next(total: number, previousIndex: number | null): number {
		if (total <= 0) return 0;
		if (previousIndex === null) return 0;
		return (previousIndex + 1) % total;
	}
}

export class RandomStorySelectionStrategy implements StorySelectionStrategy {
	next(total: number, previousIndex: number | null): number {
		if (total <= 1) return 0;
		let index = Math.floor(Math.random() * total);
		while (index === previousIndex) {
			index = Math.floor(Math.random() * total);
		}
		return index;
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
 * Spaced Repetition (Anki-like SM-2)
 * ============================================================ */

export type SrsGrade = 'again' | 'hard' | 'good' | 'easy';

/** Persisted SRS state for a single word/card. */
export interface SrsCard {
	key: string;
	word: Word;
	/** Days between scheduled reviews. 0 = brand new / lapsed. */
	interval: number;
	/** SM-2 easiness factor. */
	ease: number;
	/** Number of consecutive successful reviews. */
	reps: number;
	/** Total times rated Again after graduating. */
	lapses: number;
	/** Epoch ms when the card is next due. */
	due: number;
	/** Epoch ms of creation. */
	createdAt: number;
}

/**
 * Pure scheduling policy (OCP). Swap implementations to try
 * other algorithms (FSRS, Leitner) without touching the repo.
 */
export interface SrsScheduler {
	/** Initial state when a card is first marked. */
	initial(word: Word, now: number): SrsCard;
	/** Compute next state after a rating. */
	schedule(card: SrsCard, grade: SrsGrade, now: number): SrsCard;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

export class Sm2Scheduler implements SrsScheduler {
	initial(word: Word, now: number): SrsCard {
		return {
			key: wordKey(word),
			word,
			interval: 0,
			ease: 2.5,
			reps: 0,
			lapses: 0,
			due: now,
			createdAt: now,
		};
	}

	schedule(card: SrsCard, grade: SrsGrade, now: number): SrsCard {
		let { interval, ease, reps, lapses } = card;

		if (grade === 'again') {
			reps = 0;
			lapses += 1;
			interval = 0;
			ease = Math.max(MIN_EASE, ease - 0.2);
			return { ...card, reps, lapses, interval, ease, due: now + 60_000 };
		}

		if (grade === 'hard') {
			ease = Math.max(MIN_EASE, ease - 0.15);
			interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
			reps += 1;
		} else if (grade === 'good') {
			if (reps === 0) interval = 1;
			else if (reps === 1) interval = 3;
			else interval = Math.max(1, Math.round(interval * ease));
			reps += 1;
		} else {
			// easy
			ease += 0.15;
			if (reps === 0) interval = 2;
			else if (reps === 1) interval = 5;
			else interval = Math.max(1, Math.round(interval * ease * 1.3));
			reps += 1;
		}

		return {
			...card,
			interval,
			ease,
			reps,
			lapses,
			due: now + interval * DAY_MS,
		};
	}
}

/**
 * Persists spaced-review cards. Backed by localStorage today;
 * swap for an API-backed implementation without touching callers (DIP).
 */
export interface ReviewRepository {
	isMarked(word: Word): boolean;
	/** Toggle; when adding, initialize an SRS card. Returns new marked state. */
	toggleMark(word: Word): boolean;
	getMarkedKeys(): string[];
	getAllCards(): SrsCard[];
	getDueCards(now: number): SrsCard[];
	/** Apply a grade to a card and persist; returns the new state. */
	gradeCard(key: string, grade: SrsGrade, now: number): SrsCard | null;
}

/* ============================================================
 * Default implementations
 * ============================================================ */

const MOCK_STORIES: Story[] = MOCK_DATA as Story[];

export class MockStoryRepository implements StoryRepository {
	private previousIndex: number | null = null;

	constructor(
		private readonly stories: Story[] = MOCK_STORIES,
		private readonly strategy: StorySelectionStrategy = new RandomStorySelectionStrategy(),
	) {}

	async getNext(): Promise<Story> {
		const index = this.strategy.next(this.stories.length, this.previousIndex);
		this.previousIndex = index;
		return Promise.resolve(this.stories[index]);
	}
}

export class WebAudioCompletionNotifier implements CompletionNotifier {
	notifyCompleted(): void {
		if (typeof window === 'undefined') return;
		try {
			const Ctor =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			const ctx = new Ctor();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.type = 'sine';
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

const REVIEW_STORAGE_KEY = 'unlockword:review-cards:v2';

/**
 * localStorage-backed repository for SRS cards. Replace with an
 * `ApiReviewRepository` later — callers only know the interface (DIP).
 */
export class LocalStorageReviewRepository implements ReviewRepository {
	private cache: Map<string, SrsCard> | null = null;

	constructor(private readonly scheduler: SrsScheduler = new Sm2Scheduler()) {}

	private load(): Map<string, SrsCard> {
		if (this.cache) return this.cache;
		if (typeof window === 'undefined') {
			this.cache = new Map();
			return this.cache;
		}
		try {
			const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);
			const parsed: SrsCard[] = raw ? JSON.parse(raw) : [];
			this.cache = new Map(parsed.map((c) => [c.key, c]));
		} catch {
			this.cache = new Map();
		}
		return this.cache;
	}

	private persist(): void {
		if (typeof window === 'undefined' || !this.cache) return;
		try {
			window.localStorage.setItem(
				REVIEW_STORAGE_KEY,
				JSON.stringify([...this.cache.values()]),
			);
		} catch {
			/* no-op */
		}
	}

	isMarked(word: Word): boolean {
		return this.load().has(wordKey(word));
	}

	toggleMark(word: Word): boolean {
		const map = this.load();
		const key = wordKey(word);
		if (map.has(key)) {
			map.delete(key);
			this.persist();
			return false;
		}
		map.set(key, this.scheduler.initial(word, Date.now()));
		this.persist();
		return true;
	}

	getMarkedKeys(): string[] {
		return [...this.load().keys()];
	}

	getAllCards(): SrsCard[] {
		return [...this.load().values()];
	}

	getDueCards(now: number): SrsCard[] {
		return this.getAllCards()
			.filter((c) => c.due <= now)
			.sort((a, b) => a.due - b.due);
	}

	gradeCard(key: string, grade: SrsGrade, now: number): SrsCard | null {
		const map = this.load();
		const current = map.get(key);
		if (!current) return null;
		const next = this.scheduler.schedule(current, grade, now);
		map.set(key, next);
		this.persist();
		return next;
	}
}

export class NoopReviewRepository implements ReviewRepository {
	isMarked(): boolean {
		return false;
	}
	toggleMark(): boolean {
		return false;
	}
	getMarkedKeys(): string[] {
		return [];
	}
	getAllCards(): SrsCard[] {
		return [];
	}
	getDueCards(): SrsCard[] {
		return [];
	}
	gradeCard(): SrsCard | null {
		return null;
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
	reviewRepository: ReviewRepository;
}

export const defaultDeps: UnlockWordDeps = {
	repository: new MockStoryRepository(),
	notifier: new WebAudioCompletionNotifier(),
	matcher: new CaseInsensitiveTextMatcher(),
	levelClassifier: new HeuristicLevelClassifier(),
	reviewRepository: new LocalStorageReviewRepository(),
};

export const UnlockWordDepsContext = createContext<UnlockWordDeps>(defaultDeps);
export const useUnlockWordDeps = () => useContext(UnlockWordDepsContext);

/* ============================================================
 * Pure helpers
 * ============================================================ */

const PUNCT_RE = /[.,!?;:]/g;
const EDGE_PUNCT_RE =
	/^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?"']+$/g;

export const stripPunct = (s: string) => s.replace(PUNCT_RE, '');
export const trimEdgePunct = (s: string) => s.replace(EDGE_PUNCT_RE, '');

export function wordKey(word: Word): string {
	return word._id ?? word.term.toLowerCase();
}

export function isWordTyped(
	word: string,
	wordStart: number,
	userInput: string,
): boolean {
	const clean = stripPunct(word);
	for (let i = 0; i < clean.length; i++) {
		const u = userInput[wordStart + i] || '';
		if (u.toLowerCase() !== clean[i].toLowerCase()) return false;
	}
	return true;
}

export function findWord(story: Story, raw: string): Word | null {
	const key = stripPunct(raw).toLowerCase();
	return story.words.find((w) => w.term.toLowerCase() === key) ?? null;
}

export function countErrors(input: string, target: string): number {
	let errs = 0;
	const len = Math.min(input.length, target.length);
	for (let i = 0; i < len; i++) {
		if (input[i].toLowerCase() !== target[i].toLowerCase()) errs += 1;
	}
	return errs;
}

export function computeWpm(charsTyped: number, elapsedMs: number): number {
	if (elapsedMs <= 0 || charsTyped <= 0) return 0;
	const minutes = elapsedMs / 60000;
	return Math.round(charsTyped / 5 / minutes);
}

/** Human label for the next interval of a hypothetical grade. */
export function previewInterval(
	scheduler: SrsScheduler,
	card: SrsCard,
	grade: SrsGrade,
	now: number,
): string {
	const next = scheduler.schedule(card, grade, now);
	const ms = next.due - now;
	if (ms < 60 * 60 * 1000) {
		const m = Math.max(1, Math.round(ms / 60_000));
		return `<${m}min`;
	}
	if (ms < DAY_MS) {
		const h = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
		return `${h}h`;
	}
	const d = Math.max(1, Math.round(ms / DAY_MS));
	return `${d}d`;
}

/* ============================================================
 * Text segmentation
 * ============================================================ */

export type Segment =
	| { kind: 'space'; start: number }
	| { kind: 'char'; start: number; char: string }
	| { kind: 'word'; start: number; length: number; word: Word };

export function segmentStory(story: Story): Segment[] {
	const target = story.story;
	const segments: Segment[] = [];
	const sortedWords = [...(story.words || [])].sort(
		(a, b) => b.term.length - a.term.length,
	);

	let i = 0;
	while (i < target.length) {
		const ch = target[i];

		if (ch === ' ') {
			segments.push({ kind: 'space', start: i });
			i += 1;
			continue;
		}

		let matched: Word | null = null;
		let matchedLen = 0;
		for (const w of sortedWords) {
			const len = w.term.length;
			const seg = target.substring(i, i + len);
			if (
				trimEdgePunct(seg).toLowerCase() ===
				trimEdgePunct(w.term).toLowerCase()
			) {
				matched = w;
				matchedLen = len;
				break;
			}
		}

		if (matched) {
			segments.push({
				kind: 'word',
				start: i,
				length: matchedLen,
				word: matched,
			});
			i += matchedLen;
		} else {
			segments.push({ kind: 'char', start: i, char: ch });
			i += 1;
		}
	}

	return segments;
}

export function isSegmentTyped(
	seg: Extract<Segment, { kind: 'word' }>,
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
 * Spaced review session hook (SRP)
 * ============================================================ */

export interface ReviewSession {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	current: SrsCard | null;
	revealed: boolean;
	reveal: () => void;
	grade: (g: SrsGrade) => void;
	remaining: number;
	reviewed: number;
	totalAtStart: number;
	intervalPreview: (g: SrsGrade) => string;
}

function useReviewSession(
	repo: ReviewRepository,
	scheduler: SrsScheduler,
): ReviewSession {
	const [isOpen, setIsOpen] = useState(false);
	const [queue, setQueue] = useState<SrsCard[]>([]);
	const [revealed, setRevealed] = useState(false);
	const [reviewed, setReviewed] = useState(0);
	const [totalAtStart, setTotalAtStart] = useState(0);

	const open = useCallback(() => {
		const due = repo.getDueCards(Date.now());
		setQueue(due);
		setReviewed(0);
		setTotalAtStart(due.length);
		setRevealed(false);
		setIsOpen(true);
	}, [repo]);

	const close = useCallback(() => {
		setIsOpen(false);
		setQueue([]);
		setRevealed(false);
	}, []);

	const current = queue[0] ?? null;

	const grade = useCallback(
		(g: SrsGrade) => {
			if (!current) return;
			const now = Date.now();
			const updated = repo.gradeCard(current.key, g, now);
			setReviewed((r) => r + 1);
			setRevealed(false);
			setQueue((q) => {
				const rest = q.slice(1);
				// If still due in this session (e.g. Again), requeue at the end.
				if (updated && updated.due <= now + 5 * 60_000 && g === 'again') {
					return [...rest, updated];
				}
				return rest;
			});
		},
		[current, repo],
	);

	const intervalPreview = useCallback(
		(g: SrsGrade) =>
			current ? previewInterval(scheduler, current, g, Date.now()) : '',
		[current, scheduler],
	);

	return {
		isOpen,
		open,
		close,
		current,
		revealed,
		reveal: () => setRevealed(true),
		grade,
		remaining: queue.length,
		reviewed,
		totalAtStart,
		intervalPreview,
	};
}

/* ============================================================
 * Orchestration hook
 * ============================================================ */

const EMPTY_STORY: Story = { title: '', story: '', moral: '', words: [] };
const SHARED_SCHEDULER: SrsScheduler = new Sm2Scheduler();

export function useUnlockWord() {
	const { repository, notifier, matcher, levelClassifier, reviewRepository } =
		useUnlockWordDeps();

	const [story, setStory] = useState<Story>(EMPTY_STORY);
	const [loading, setLoading] = useState(true);
	const [userInput, setUserInput] = useState('');
	const [selectedWord, setSelectedWord] = useState<Word | null>(null);
	const [isComplete, setIsComplete] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const [startedAt, setStartedAt] = useState<number | null>(null);
	const [elapsedMs, setElapsedMs] = useState(0);
	const [markedKeys, setMarkedKeys] = useState<Set<string>>(
		() => new Set(reviewRepository.getMarkedKeys()),
	);
	const [dueCount, setDueCount] = useState<number>(
		() => reviewRepository.getDueCards(Date.now()).length,
	);

	const inputRef = useRef<HTMLTextAreaElement>(null);

	const focusInput = useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const loadNext = useCallback(async () => {
		setLoading(true);
		const next = await repository.getNext();
		setStory(next);
		setUserInput('');
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

	useEffect(() => {
		if (!isComplete && targetText && matcher.matches(userInput, targetText)) {
			setIsComplete(true);
			notifier.notifyCompleted();
		}
	}, [userInput, targetText, isComplete, matcher, notifier]);

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
		setUserInput('');
		setStartedAt(null);
		setElapsedMs(0);
		setIsComplete(false);
		focusInput();
	}, [focusInput]);

	const selectWord = useCallback(
		(w: Word) => {
			setSelectedWord(w);
			focusInput();
		},
		[focusInput],
	);

	const isWordMarkedForReview = useCallback(
		(word: Word) => markedKeys.has(wordKey(word)),
		[markedKeys],
	);

	const refreshReviewState = useCallback(() => {
		setMarkedKeys(new Set(reviewRepository.getMarkedKeys()));
		setDueCount(reviewRepository.getDueCards(Date.now()).length);
	}, [reviewRepository]);

	const toggleReviewMark = useCallback(
		(word: Word) => {
			reviewRepository.toggleMark(word);
			refreshReviewState();
		},
		[reviewRepository, refreshReviewState],
	);

	const reviewSession = useReviewSession(reviewRepository, SHARED_SCHEDULER);

	// Refresh badge count whenever the session closes or a grade is given.
	useEffect(() => {
		if (!reviewSession.isOpen) refreshReviewState();
	}, [reviewSession.isOpen, reviewSession.reviewed, refreshReviewState]);

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
		targetText.length === 0
			? 0
			: (userInput.length / targetText.length) * 100;

	const level = useMemo<CefrLevel>(
		() => story.level ?? levelClassifier.classify(targetText),
		[story.level, targetText, levelClassifier],
	);
	const levelBand = useMemo(() => bandForLevel(level), [level]);

	const segments = useMemo(() => segmentStory(story), [story]);

	const reviewCount = markedKeys.size;

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
		reviewCount,
		dueCount,
		isWordMarkedForReview,
		toggleReviewMark,
		setSelectedWord: selectWord,
		setIsFocused,
		focusInput,
		handleInputChange,
		resetInput,
		handleNextParagraph: loadNext,
		reviewSession,
	};
}
