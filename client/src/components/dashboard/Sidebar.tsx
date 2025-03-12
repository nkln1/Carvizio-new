import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  MessageSquare,
  User,
  Settings,
  Clock
} from "lucide-react";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const location = useLocation();
  const { data: unreadConversationsCount = 0 } = useUnreadMessagesCount();

  return (
    <nav className="flex flex-col items-center space-y-4 p-4">
      <Link
        to="/"
        className={cn(
          "flex items-center space-x-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/10",
          location.pathname === "/" && "bg-accent/10"
        )}
      >
        <Home className="h-4 w-4" />
        <span>Acasă</span>
      </Link>
      <Link
        to="/files"
        className={cn(
          "flex items-center space-x-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/10",
          location.pathname === "/files" && "bg-accent/10"
        )}
      >
        <FileText className="h-4 w-4" />
        <span>Fișiere</span>
      </Link>
      <Link
        to="/messages"
        className={cn(
          "flex items-center space-x-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/10",
          location.pathname === "/messages" && "bg-accent/10"
        )}
      >
        <div className="flex items-center">
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Mesaje</span>
            {unreadConversationsCount > 0 && (
              <Badge 
                variant="default" 
                className="ml-2 bg-[#00aff5]"
              >
                {unreadConversationsCount}
              </Badge>
            )}
          </div>
      </Link>
      <Link
        to="/profile"
        className={cn(
          "flex items-center space-x-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/10",
          location.pathname === "/profile" && "bg-accent/10"
        )}
      >
        <User className="h-4 w-4" />
        <span>Profil</span>
      </Link>
      <Link
        to="/settings"
        className={cn(
          "flex items-center space-x-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/10",
          location.pathname === "/settings" && "bg-accent/10"
        )}
      >
        <Settings className="h-4 w-4" />
        <span>Setări</span>
      </Link>
      <Link
        to="/calendar"
        className={cn(
          "flex items-center space-x-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/10",
          location.pathname === "/calendar" && "bg-accent/10"
        )}
      >
        <Clock className="h-4 w-4" />
        <span>Calendar</span>
      </Link>
    </nav>
  );
}