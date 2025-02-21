import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface NavigationItemsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  onCreateRequest: () => void;
  newOffersCount: number;
}

interface NavigationItem {
  id: string;
  label: string;
  count?: number;
}

export function NavigationItems({
  activeTab,
  setActiveTab,
  isMenuOpen,
  setIsMenuOpen,
  onCreateRequest,
  newOffersCount,
}: NavigationItemsProps) {
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const navigationItems: NavigationItem[] = [
    { id: "requests", label: "Cereri" },
    {
      id: "offers",
      label: "Oferte primite",
      count: newOffersCount
    },
    { id: "car", label: "Mașini" },
    { id: "messages", label: "Mesaje" },
    { id: "profile", label: "Cont" },
  ];

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-[#00aff5]">
              Dashboard
            </h1>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                onClick={() => handleTabChange(item.id)}
                className={`${
                  activeTab === item.id
                    ? "bg-[#00aff5] hover:bg-[#0099d6]"
                    : ""
                } relative`}
              >
                {item.label}
                {item.id === "offers" && item.count && item.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#00aff5] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </Button>
            ))}
            <Button
              onClick={onCreateRequest}
              className="bg-[#00aff5] hover:bg-[#0099d6] ml-2"
            >
              Adaugă cerere
            </Button>
          </div>

          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80%] sm:w-[385px]">
                <div className="flex flex-col gap-4 mt-6">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "default" : "ghost"}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full justify-start text-left relative ${
                        activeTab === item.id
                          ? "bg-[#00aff5] hover:bg-[#0099d6]"
                          : ""
                      }`}
                    >
                      {item.label}
                      {item.id === "offers" && item.count && item.count > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#00aff5] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {item.count}
                        </span>
                      )}
                    </Button>
                  ))}
                  <Button
                    onClick={() => {
                      onCreateRequest();
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-[#00aff5] hover:bg-[#0099d6]"
                  >
                    Adaugă cerere
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}