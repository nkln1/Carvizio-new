import { useState, useRef, useEffect } from "react";
import AuthDialog from "./AuthDialog";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function LoginDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        className="flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <img
          src="https://i.ibb.co/NnnNWbN/Signlogin.png"
          alt={user.email}
          className="h-8 w-8 rounded-full"
        />
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 border-b border-gray-100 hover:bg-gray-100"
          >
            {user.email}
          </button>
          <button
            onClick={() => void handleSignOut()}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Deconectare
          </button>
        </div>
      )}
    </div>
  );
}