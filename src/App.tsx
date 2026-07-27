import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const ComparePage = lazy(() => import("./pages/ComparePage.tsx"));
const MapPage = lazy(() => import("./pages/MapPage.tsx"));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage.tsx"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="mx-auto flex min-h-[55vh] max-w-[1480px] items-center justify-center px-4" role="status">
    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
      Nalagam pogled …
    </div>
  </div>
);

const lazyPage = (page: ReactNode) => <Suspense fallback={<PageFallback />}>{page}</Suspense>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Index />} />
            <Route path="/compare" element={lazyPage(<ComparePage />)} />
            <Route path="/map" element={lazyPage(<MapPage />)} />
            <Route path="/methodology" element={lazyPage(<MethodologyPage />)} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
