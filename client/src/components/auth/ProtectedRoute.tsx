import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";

interface ProtectedRouteProps extends Omit<RouteProps, 'component'> {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component, ...rest }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-[#00aff5]" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return (
    <Route path={path} {...rest}>
      <Component />
    </Route>
  );
}