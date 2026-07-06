import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Grade from "./pages/Grade";
import Lesson from "./pages/Lesson";
import Topic from "./pages/Topic";
import Admin from "./pages/Admin";
import Search from "./pages/Search";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import { I18nProvider } from "@/lib/i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/grade/:grade" element={<Grade />} />
            <Route path="/topic/:id" element={<Topic />} />
            <Route path="/lesson/:id" element={<Lesson />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/search" element={<Search />} />
            <Route path="/history" element={<History />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
