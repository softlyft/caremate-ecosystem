import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { assertPublicEnv } from './lib/env';
import './index.css';
import './app.css';

assertPublicEnv();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
