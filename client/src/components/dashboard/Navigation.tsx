import { Button } from "@/components/ui/button";
import { FileText, MessageCircle, Bell, Car, User, Plus } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onCreateRequest: () => void;
}

export function Navigation({ activeTab, setActiveTab, onCreateRequest }: NavigationProps) {
  return (
    <div className="bg-white shadow">
      <div className="container mx-auto">
        <div className="flex items-center justify-between p-4">
          <div className="flex space-x-4">
            <Button
              variant="ghost" className={`flex items-center gap-2 ${activeTab === "requests" ? "bg-[#0099d6] text-white hover:bg-[#0099d6]/90" : ""}`}
              onClick={() => setActiveTab("requests")}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Cererile Mele
            </Button>
            <Button
              variant="ghost" className={`flex items-center gap-2 ${activeTab === "offers" ? "bg-[#0099d6] text-white hover:bg-[#0099d6]/90" : ""}`}
              onClick={() => setActiveTab("offers")}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Oferte primite
            </Button>
            <Button
              variant="ghost" className={`flex items-center gap-2 ${activeTab === "messages" ? "bg-[#0099d6] text-white hover:bg-[#0099d6]/90" : ""}`}
              onClick={() => setActiveTab("messages")}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Mesaje
            </Button>
            <Button
              variant="ghost" className={`flex items-center gap-2 ${activeTab === "car" ? "bg-[#0099d6] text-white hover:bg-[#0099d6]/90" : ""}`}
              onClick={() => setActiveTab("car")}
              className="flex items-center gap-2"
            >
              <Car className="h-4 w-4" />
              Mașina mea
            </Button>
            <Button
              variant="ghost" className={`flex items-center gap-2 ${activeTab === "profile" ? "bg-[#0099d6] text-white hover:bg-[#0099d6]/90" : ""}`}
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Cont
            </Button>
          </div>
          <Button
            onClick={onCreateRequest}
            className="bg-[#00aff5] text-white hover:bg-[#0095d1] ml-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Creaza cerere
          </Button>
        </div>
      </div>
    </div>
  );
}
