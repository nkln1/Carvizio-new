import { Button } from "@/components/ui/button";
import { Menu, Car, ShoppingBag, MessageCircle, User, PlusCircle } from "lucide-react";

interface NavigationItemsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  onCreateRequest: () => void;
  newOffersCount: number;
  unreadMessagesCount?: number;
  isMobile?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export function NavigationItems({
  activeTab,
  setActiveTab,
  isMenuOpen,
  setIsMenuOpen,
  onCreateRequest,
  newOffersCount,
  unreadMessagesCount = 0,
  isMobile = false,
}: NavigationItemsProps) {
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (isMobile) {
      setIsMenuOpen(false);
    }
  };

  const navigationItems: NavigationItem[] = [
    { id: "requests", label: "Cereri", icon: <ShoppingBag className="h-4 w-4 mr-2" /> },
    {
      id: "offers",
      label: "Oferte primite",
      count: newOffersCount,
      icon: <PlusCircle className="h-4 w-4 mr-2" />
    },
    { id: "car", label: "Mașini", icon: <Car className="h-4 w-4 mr-2" /> },
    { 
      id: "messages", 
      label: "Mesaje",
      count: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      icon: <MessageCircle className="h-4 w-4 mr-2" />
    },
    { id: "profile", label: "Cont", icon: <User className="h-4 w-4 mr-2" /> },
  ];

  // Only show the main navigation on desktop, or when in mobile mode
  if (!isMobile) {
    return (
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-semibold text-[#00aff5] truncate">
                Client Dashboard
              </h1>
            </div>

            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => handleTabChange(item.id)}
                  className={`${
                    activeTab === item.id
                      ? "bg-[#00aff5] hover:bg-[#0099d6]"
                      : ""
                  } relative py-1 h-auto min-h-9 px-2 lg:px-3`}
                >
                  <div className="flex items-center">
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden">{item.icon}</span>
                  </div>
                  {item.count && item.count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.count}
                    </span>
                  )}
                </Button>
              ))}
              <Button
                onClick={onCreateRequest}
                className="bg-[#00aff5] hover:bg-[#0099d6] ml-1 sm:ml-2 py-1 h-auto min-h-9 px-2 lg:px-3 text-xs sm:text-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">Adaugă cerere</span>
                <span className="sm:hidden">+ Cerere</span>
              </Button>
            </div>

            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}
                className="h-10 w-10" aria-label="Deschide meniul">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Mobile menu items
  return (
    <div className="flex flex-col gap-3 py-2">
      {navigationItems.map((item) => (
        <Button
          key={item.id}
          variant={activeTab === item.id ? "default" : "ghost"}
          onClick={() => handleTabChange(item.id)}
          className={`w-full justify-start text-left relative ${
            activeTab === item.id
              ? "bg-[#00aff5] hover:bg-[#0099d6]"
              : ""
          } py-3`}
        >
          <div className="flex items-center">
            {item.icon}
            {item.label}
          </div>
          {item.count && item.count > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
        className="w-full bg-[#00aff5] hover:bg-[#0099d6] py-3 mt-2"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Adaugă cerere
      </Button>
    </div>
  );
}