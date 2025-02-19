import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface TabWrapperProps {
  children: ReactNode;
  name: string;
  onError?: () => void;
}

export function TabWrapper({ children, name, onError }: TabWrapperProps) {
  return (
    <ErrorBoundary name={name} onReset={onError}>
      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
            </CardContent>
          </Card>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
