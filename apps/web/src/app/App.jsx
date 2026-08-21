import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from '../auth/AuthProvider.jsx';
import { browserRouter } from './router.jsx';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={browserRouter} />
    </AuthProvider>
  );
}
