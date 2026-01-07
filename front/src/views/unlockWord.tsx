import { useUnlockWord } from '../logic/hook';
import { TextDisplay } from './textDisplay';
import { DictionaryView } from './dictionary';

export const UnlockWordApp = () => {
	const {
		currentParagraph,
		targetText,
		userInput,
		selectedWord,
		isComplete,
		containerRef,
		progress,
		handleKeyDown,
		setSelectedWord,
		handleNextParagraph,
	} = useUnlockWord();

	return (
		<div className='max-w-5xl w-full'>
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{/* Main Text Area */}
				<div className='lg:col-span-2'>
					<div className='bg-white border border-stone-200 rounded overflow-hidden shadow-sm'>
						{/* Progress Header */}
						<div className='bg-stone-100 px-6 md:px-8 py-4 border-b border-stone-200'>
							<div className='flex items-center justify-between mb-3'>
								<div className='text-gray-900 font-bold text-lg'>
									{currentParagraph.title}
								</div>
								<span className='text-green-800 font-bold text-lg'>
									{Math.round(progress)}%
								</span>
							</div>

							<div className='w-full bg-stone-300 rounded-full h-2 overflow-hidden'>
								<div
									className='h-full bg-green-700 transition-all duration-500 ease-out'
									style={{ width: `${progress}%` }}
								/>
							</div>
						</div>

						{/* Typing Area */}
						<div
							ref={containerRef}
							tabIndex={0}
							onKeyDown={handleKeyDown}
							className='px-8 md:px-12 py-12 md:py-16 min-h-[500px] focus:outline-none cursor-default'>
							<div className='mb-8'>
								<div className='text-xs text-gray-600 uppercase font-semibold tracking-wider mb-2'>
									Digite para praticar
								</div>
							</div>

							<TextDisplay
								paragraph={currentParagraph}
								targetText={targetText}
								userInput={userInput}
								isComplete={isComplete}
								onWordClick={setSelectedWord}
							/>

							{isComplete && (
								<div className='mt-12 pt-8 border-t border-stone-200'>
									<div className='flex flex-col items-center gap-4'>
										<div className='text-green-800 text-xl font-bold'>
											✓ Texto completo!
										</div>
										<button
											onClick={handleNextParagraph}
											className='bg-green-800 hover:bg-green-900 text-white px-8 py-3 rounded font-semibold text-sm transition-colors duration-200'>
											Próximo Texto →
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				<DictionaryView selectedWord={selectedWord} />
			</div>
		</div>
	);
};