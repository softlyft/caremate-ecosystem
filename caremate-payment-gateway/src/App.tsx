import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { CancelPage } from '@/pages/CancelPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { SuccessPage } from '@/pages/SuccessPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CheckoutPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
