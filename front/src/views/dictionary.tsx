import { BookOpen } from 'lucide-react';
import type { Word } from '../logic/entity';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export const DictionaryView = ({ selectedWord }: { selectedWord: Word }) => {
	const [visible, setVisible] = useState(false);

	return (
		<div className='lg:col-span-1'>
			<div className='bg-white border border-stone-200 rounded p-6 sticky top-8 shadow-sm'>
				<div className='flex items-center gap-2 mb-6'>
					<BookOpen className='w-5 h-5 text-green-800' />
					<h3 className='text-lg font-bold text-gray-900'>Dicionário</h3>
				</div>

				{selectedWord ? (
					<div className='space-y-4'>
						<h3 className='text-3xl font-bold text-gray-900 mb-1 capitalize'>
							{selectedWord.term}
						</h3>
						<span className='text-gray-600 text-sm italic'>
							{selectedWord.partOfSpeech}
						</span>
						<div className='bg-stone-100 rounded p-3 border-l-4 border-green-800 flex items-start justify-between gap-3'>
							{visible ? (
								<div className='text-green-800 font-semibold text-base'>
									{selectedWord.translation}
								</div>
							) : (
								<div className='italic text-stone-400 select-none'>
									Translation hidden
								</div>
							)}

							<button
								onClick={() => setVisible((v) => !v)}
								aria-label={visible ? 'Hide translation' : 'Show translation'}
								className='text-green-800 hover:text-green-900 transition'>
								{visible ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>

						<div>
							<div className='text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2'>
								Definição
							</div>
							<p className='text-gray-800 leading-relaxed text-sm'>
								{selectedWord.definition}
							</p>
						</div>

						<div className='bg-stone-50 rounded p-3'>
							<div className='text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2'>
								Exemplo
							</div>
							<p className='text-gray-700 italic leading-relaxed text-sm'>
								"{selectedWord.examples}"
							</p>
						</div>

						{selectedWord.synonyms?.length > 0 && (
							<div>
								<div className='text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3'>
									Sinônimos
								</div>
								<div className='flex flex-wrap gap-2'>
									{selectedWord.synonyms.map((s, i) => (
										<span
											key={i}
											className='inline-block bg-stone-100 text-gray-800 px-3 py-1 rounded-full text-xs'>
											{s}
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				) : (
					<div className='text-center py-16'>
						<BookOpen className='w-16 h-16 text-stone-300 mx-auto mb-4' />
						<p className='text-gray-600 text-sm leading-relaxed'>
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
