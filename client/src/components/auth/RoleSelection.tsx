import { Button } from "@/components/ui/button";
import { UserCog, Building2, ArrowLeft } from "lucide-react";

type UserRole = "client" | "service" | null;

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
  onBack?: () => void;
}

export default function RoleSelection({
  onSelect,
  onBack,
}: RoleSelectionProps) {
  return (
    <div className="relative space-y-6">
      {onBack && (
        <Button
          variant="ghost"
          className="absolute left-4 top-4 p-0 text-[#00aff5]"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <h3 className="text-lg font-semibold text-center text-[#00aff5]">
        Alege tipul de cont
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="p-6 h-auto flex flex-col items-center hover:border-[#00aff5] hover:text-[#00aff5] transition-all"
          onClick={() => onSelect("client")}
        >
          <UserCog className="h-8 w-8" />
          <span className="text-sm font-medium">Client</span>
        </Button>
        <Button
          variant="outline"
          className="p-6 h-auto flex flex-col items-center hover:border-[#00aff5] hover:text-[#00aff5] transition-all"
          onClick={() => onSelect("service")}
        >
          <Building2 className="h-8 w-8" />
          <span className="text-sm font-medium">Service Auto</span>
        </Button>
      </div>
    </div>
  );
}
