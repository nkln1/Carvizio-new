import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkingHour } from "@shared/schema";
import { Loader2 } from "lucide-react"; // Adăugat pentru indicator de încărcare

interface WorkingHoursEditorProps {
  serviceId: number;
  workingHours: WorkingHour[];
  onClose: () => void;
  username?: string; // Adăugat pentru a sincroniza cu cheia query-ului
}

const defaultHours: Partial<WorkingHour>[] = [
  { dayOfWeek: "1", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "2", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "3", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "4", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "5", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "6", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "0", openTime: "09:00", closeTime: "17:00", isClosed: true }
];

const getDayName = (dayOfWeek: string): string => {
  const days = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
  return days[parseInt(dayOfWeek) - 1] || "Duminică";
};

const reorderDays = (hours: Partial<WorkingHour>[]): Partial<WorkingHour>[] => {
  const order = ["1", "2", "3", "4", "5", "6", "0"];
  return order.map(day => hours.find(h => h.dayOfWeek === day)!);
};

export default function WorkingHoursEditor({ serviceId, workingHours, onClose, username }: WorkingHoursEditorProps) {
  const [hours, setHours] = useState<Partial<WorkingHour>[]>(() => {
    const initialHours = [...defaultHours];
    workingHours.forEach(customHour => {
      const index = initialHours.findIndex(h => h.dayOfWeek === customHour.dayOfWeek);
      if (index !== -1) {
        initialHours[index] = { ...customHour };
      }
    });
    return reorderDays(initialHours);
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (hoursToUpdate: Partial<WorkingHour>[]) => {
      // Utilizăm Promise.all pentru a face toate cererile în paralel
      const updatePromises = hoursToUpdate.map(hour => 
        apiRequest('PUT', `/api/service/working-hours/${hour.dayOfWeek}`, {
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isClosed: hour.isClosed
        })
      );

      const results = await Promise.all(updatePromises);

      // Verificăm dacă oricare dintre cereri a eșuat
      const failedUpdates = results.filter(response => !response.ok);
      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} working hour(s)`);
      }
    },
    onSuccess: () => {
      // Invalidează ambele posibile chei de query pentru a ne asigura că datele sunt reîncărcate
      queryClient.invalidateQueries({ queryKey: ['service-profile'] });
      if (username) {
        queryClient.invalidateQueries({ queryKey: ['/api/service-profile', username] });
      }

      toast({
        title: 'Succes',
        description: 'Program actualizat cu succes',
      });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: 'Eroare',
        description: 'Nu s-a putut actualiza programul',
      });
    }
  });

  const handleTimeChange = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleClosedChange = (index: number, checked: boolean) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], isClosed: checked };
    setHours(newHours);
  };

  const handleSave = () => {
    updateWorkingHoursMutation.mutate(hours);
  };

  const isLoading = updateWorkingHoursMutation.isPending;

  return (
    <div className="space-y-3 border rounded-lg p-4">
      <h3 className="font-semibold mb-3">Program de Lucru</h3>
      <div className="divide-y">
        {hours.map((hour, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <span className="font-medium w-20">{getDayName(hour.dayOfWeek!)}</span>
            <Switch
              checked={hour.isClosed}
              onCheckedChange={(checked) => handleClosedChange(index, checked)}
              disabled={isLoading}
            />
            {!hour.isClosed && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hour.openTime}
                  onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)}
                  className="w-24"
                  disabled={isLoading}
                />
                <span>-</span>
                <Input
                  type="time"
                  value={hour.closeTime}
                  onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                  className="w-24"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4 border-t pt-4">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>Anulează</Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se salvează...
            </>
          ) : 'Salvează'}
        </Button>
      </div>
    </div>
  );
}