import { useState, useRef, useEffect } from "react";
import AuthDialog from "./AuthDialog";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LoginDropdown() {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Add effect to handle automatic redirect when user logs in
  useEffect(() => {
    if (user) {
      if (user.role === "client") {
        setLocation("/dashboard");
      } else if (user.role === "service") {
        setLocation("/service-dashboard");
      }
    }
  }, [user, setLocation]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Success",
        description: "Te-ai deconectat cu succes!",
      });
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "A apărut o eroare la deconectare.",
      });
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" className="opacity-50 cursor-not-allowed">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
      </Button>
    );
  }

  if (!user) {
    return (
      <AuthDialog
        trigger={
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-600 hover:text-[#00aff5]"
          >
            <img
              src="https://i.ibb.co/NnnNWbN/Signlogin.png"
              alt="Login Icon"
              className="h-8 w-8"
            />
            <ChevronDown className="h-4 w-4" />
          </Button>
        }
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2"
        >
          <img
            src="https://i.ibb.co/NnnNWbN/Signlogin.png"
            alt={user.email}
            className="h-8 w-8 rounded-full"
          />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem className="cursor-pointer">
          {user.email}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          Deconectare
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}