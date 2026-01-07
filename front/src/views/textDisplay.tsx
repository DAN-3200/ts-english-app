import type { JSX } from 'react';
import type { Paragraph, Word } from '../logic/entity';

export const TextDisplay = ({
	paragraph,
	targetText,
	userInput,
	isComplete,
	onWordClick,
}: {
	paragraph: Paragraph;
	targetText: string;
	userInput: string;
	isComplete: boolean;
	onWordClick: (word: Word) => void;
}) => {
	const isWordComplete = (word: string, wordStartIndex: number): boolean => {
		const cleanWord = word.replace(/[.,!?]/g, '');
		for (let i = 0; i < cleanWord.length; i++) {
			const globalIndex = wordStartIndex + i;
			const userChar = userInput[globalIndex] || '';
			const expectedChar = cleanWord[i].toLowerCase();
			if (userChar.toLowerCase() !== expectedChar) {
				return false;
			}
		}
		return true;
	};

	const getWordData = (word: string): Word | null => {
		const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
		return paragraph.wordsQuery.find((w) => w.term.toLowerCase() === cleanWord) || null;
	};

	let charIndex = 0;
	const elements: JSX.Element[] = [];
	const words = targetText.split(' ');

	words.forEach((word, wordIndex) => {
		const wordData = getWordData(word);
		const wordStartIndex = charIndex;
		const wordComplete = isWordComplete(word, wordStartIndex);

		const wordChars = word.split('').map((char, charIdx) => {
			const globalCharIndex = wordStartIndex + charIdx;
			const userChar = userInput[globalCharIndex] || '';
			const isCharCorrect = userChar.toLowerCase() === char.toLowerCase();
			const hasUserInput = userChar !== '';
			const isCursor = globalCharIndex === userInput.length - 1 && !isComplete;

			return (
				<span
					key={charIdx}
					className={`
            transition-all duration-200
            ${hasUserInput && isCharCorrect ? 'text-gray-900' : ''}
            ${hasUserInput && !isCharCorrect ? 'text-red-700' : ''}
            ${!hasUserInput ? 'text-gray-400' : ''}
            ${isCursor ? 'relative' : ''}
          `}>
					{char}
					{isCursor && (
						<span className='absolute -right-0.5 top-0 bottom-0 w-0.5 bg-green-800 animate-pulse' />
					)}
				</span>
			);
		});

		elements.push(
			<span
				key={`word-${wordIndex}`}
				className={`
          transition-all duration-200 select-none
          ${
						wordComplete && wordData
							? 'cursor-pointer hover:underline decoration-green-700 decoration-2 underline-offset-4'
							: ''
					}
        `}
				onClick={() => wordComplete && wordData && onWordClick(wordData)}>
				{wordChars}
			</span>
		);

		charIndex += word.length;

		if (wordIndex < words.length - 1) {
			const spaceIndex = charIndex;
			const isSpaceCursor = spaceIndex === userInput.length - 1 && !isComplete;
			const userChar = userInput[spaceIndex] || '';
			const isSpaceCorrect = userChar === ' ';
			const hasSpaceInput = userChar !== '';

			elements.push(
				<span
					key={`space-${wordIndex}`}
					className={`inline-block relative transition-all duration-200 ${
						hasSpaceInput && !isSpaceCorrect ? 'bg-red-100' : ''
					}`}
					style={{ width: '0.35em' }}>
					{hasSpaceInput && !isSpaceCorrect && (
						<span className='absolute inset-0 flex items-center justify-center text-red-700 text-[10px]'>
							⎵
						</span>
					)}
					{isSpaceCursor && (
						<span className='absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-green-800 animate-pulse' />
					)}
				</span>
			);

			charIndex += 1;
		}
	});

	return <div className='text-xl leading-relaxed font-serif'>{elements}</div>;
};
