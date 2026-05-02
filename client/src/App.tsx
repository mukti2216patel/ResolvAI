import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Users from '@/pages/Users';
import TicketDetails from '@/pages/TicketDetails';
import TicketsList from '@/pages/TicketsList';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ThemeProvider } from '@/components/ThemeProvider';

axios.defaults.withCredentials = true;

const queryClientInstance = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ThemeProvider defaultTheme="dark" storageKey="helpdesk-theme">
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/tickets" element={<TicketsList />} />
              <Route path="/tickets/:id" element={<TicketDetails />} />
              <Route path="/users" element={<Users />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

