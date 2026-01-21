import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { ctxMain, fetchParagraphAtom } from './store';
import { getTextContent } from '../infra/service/service';
import type { Word } from './entity';
import { playCompletionSound } from '../infra/utils/soundNotification';

export function useUnlockWord(initialParagraphIndex: number = 0) {
	const [currentParagraphIndex, setCurrentParagraphIndex] = useState(
		initialParagraphIndex,
	);
	const [userInput, setUserInput] = useState('');
	const [selectedWord, setSelectedWord] = useState<Word | null>(null);
	const [isComplete, setIsComplete] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const [paragraphs, setParagraphs] = useAtom(ctxMain.ParagraphQuery);

	const currentStory = paragraphs[currentParagraphIndex];
	const targetText = currentStory.story;

	useEffect(() => {
		containerRef.current?.focus();
	}, [currentParagraphIndex]);

	const [, fetchParagraphs] = useAtom(fetchParagraphAtom);

	useEffect(() => {
		fetchParagraphs();
	}, [fetchParagraphs]);

	useEffect(() => {
		if (
			userInput.toLowerCase().trim() === targetText.toLowerCase().trim() &&
			!isComplete
		) {
			setIsComplete(true);
			playCompletionSound();
		}
	}, [userInput, targetText, isComplete]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (isComplete) return;

		if (e.key === 'Backspace') {
			e.preventDefault();
			setUserInput((prev) => prev.slice(0, -1));
		} else if (e.key.length === 1) {
			e.preventDefault();
			const newInput = userInput + e.key;
			setUserInput(newInput);
		}
	};

	const handleNextParagraph = async () => {
		setCurrentParagraphIndex((currentParagraphIndex + 1) % paragraphs.length);
		setUserInput('');
		setSelectedWord(null);
		setIsComplete(false);
		const response = await getTextContent();
		setParagraphs((prev) => [
			...prev,
			{
				_id: response.id,
				title: response.title,
				story: response.story,
				moral: response.moral,
				words: response.words,
			},
		]);
	};

	const progress = (userInput.length / targetText.length) * 100;

	return {
		currentStory,
		targetText,
		userInput,
		selectedWord,
		isComplete,
		containerRef,
		progress,
		handleKeyDown,
		setSelectedWord,
		handleNextParagraph,
	};
}
