import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Trash2, MessageSquare } from "lucide-react";
import type { Request } from "@/types/dashboard";

interface RequestCardProps {
  request: Request;
  onView: (request: Request) => void;
  onCancel: (requestId: number) => void;
  onMessage?: (request: Request) => void;
  isViewed?: boolean;
}

export function RequestCard({
  request,
  onView,
  onCancel,
  onMessage,
  isViewed,
}: RequestCardProps) {
  return (
    <Card className="hover:bg-gray-50 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{request.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {request.cities?.join(", ")}, {request.county}
              </p>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-sm ${
                request.status === "Active"
                  ? "bg-yellow-100 text-yellow-800"
                  : request.status === "Rezolvat"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {request.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Data preferată:</span>
              <p>{format(new Date(request.preferredDate), "dd.MM.yyyy")}</p>
            </div>
            <div>
              <span className="text-gray-600">Data trimiterii:</span>
              <p>{format(new Date(request.createdAt), "dd.MM.yyyy")}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(request)}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              Detalii
            </Button>
            {onMessage && request.status !== "Anulat" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMessage(request)}
                className="text-green-500 hover:text-green-700 hover:bg-green-50 flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                Mesaj
              </Button>
            )}
            {request.status !== "Anulat" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(request.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Anulează
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}