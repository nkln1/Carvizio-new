
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import { useAuth } from "@/context/AuthContext";

interface AuthDialogProps {
  trigger?: React.ReactNode;
  defaultView?: "login" | "signup";
}

export default function AuthDialog({ 
  trigger,
  defaultView = "login" 
}: AuthDialogProps) {
  const [view, setView] = useState<"login" | "signup">(defaultView);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Close dialog when user is authenticated
  useEffect(() => {
    if (user) {
      setOpen(false);
    }
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Login</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            {view === "login" ? "Conectare" : "Creează cont"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {view === "login" 
              ? "Conectează-te pentru a accesa toate funcționalitățile"
              : "Creează un cont nou pentru a începe"
            }
          </DialogDescription>
        </DialogHeader>
        {view === "login" ? <LoginForm /> : <SignupForm />}
        <div className="text-center mt-4">
          <Button
            variant="link"
            onClick={() => setView(view === "login" ? "signup" : "login")}
          >
            {view === "login"
              ? "Nu ai cont? Creează unul acum"
              : "Ai deja cont? Conectează-te"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
