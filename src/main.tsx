import './tailwind.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UnlockWordApp } from "../src/views/view"

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<UnlockWordApp />
	</StrictMode>
);
