import React from 'react';
import { Toaster } from 'sonner';

function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        duration: 3000,
      }}
    />
  );
}

export default ToastProvider;
