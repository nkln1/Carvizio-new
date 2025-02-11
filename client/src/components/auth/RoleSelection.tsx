
import { Button } from "@/components/ui/button";
import { User, Building2 } from "lucide-react";

type UserRole = "client" | "service" | null;

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
}

export default function RoleSelection({ onSelect }: RoleSelectionProps) {
  return (
    <div className="flex flex-col items-center space-y-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-[#00aff5]">Alege tipul de cont</h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          className="flex flex-col items-center p-8 hover:border-[#00aff5] hover:text-[#00aff5] transition-all duration-200"
          onClick={() => onSelect("client")}
        >
          <User className="h-12 w-12 mb-2" />
          <span className="text-lg font-semibold">Client</span>
          <span className="text-sm text-gray-500 text-center mt-2">
            Caută și programează servicii auto
          </span>
        </Button>
        <Button
          variant="outline"
          className="flex flex-col items-center p-8 hover:border-[#00aff5] hover:text-[#00aff5] transition-all duration-200"
          onClick={() => onSelect("service")}
        >
          <Building2 className="h-12 w-12 mb-2" />
          <span className="text-lg font-semibold">Service Auto</span>
          <span className="text-sm text-gray-500 text-center mt-2">
            Oferă servicii și gestionează programări
          </span>
        </Button>
      </div>
    </div>
  );
}
