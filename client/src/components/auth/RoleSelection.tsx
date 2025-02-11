
import { Button } from "@/components/ui/button";
import { User, Building2 } from "lucide-react";

type UserRole = "client" | "service" | null;

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
}

export default function RoleSelection({ onSelect }: RoleSelectionProps) {
  return (
    <div className="flex flex-col items-center space-y-8 p-8 bg-white rounded-lg">
      <h2 className="text-2xl font-bold text-[#00aff5] tracking-tight">
        Alege tipul de cont
      </h2>
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <Button
          variant="outline"
          className="flex-1 flex flex-col items-center p-8 hover:border-[#00aff5] hover:text-[#00aff5] hover:shadow-md transition-all duration-300 rounded-xl border-2"
          onClick={() => onSelect("client")}
        >
          <User className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" />
          <span className="text-lg font-semibold mb-2">Client</span>
          <span className="text-sm text-gray-500 text-center">
            Caută și programează servicii auto
          </span>
        </Button>
        <Button
          variant="outline"
          className="flex-1 flex flex-col items-center p-8 hover:border-[#00aff5] hover:text-[#00aff5] hover:shadow-md transition-all duration-300 rounded-xl border-2"
          onClick={() => onSelect("service")}
        >
          <Building2 className="h-12 w-12 mb-4 transition-transform duration-300 group-hover:scale-110" />
          <span className="text-lg font-semibold mb-2">Service Auto</span>
          <span className="text-sm text-gray-500 text-center">
            Oferă servicii și gestionează programări
          </span>
        </Button>
      </div>
    </div>
  );
}
