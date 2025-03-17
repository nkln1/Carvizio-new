import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkingHour } from "@shared/schema";

interface WorkingHoursEditorProps {
  serviceId: number;
  workingHours: WorkingHour[];
  onClose: () => void;
}

const defaultHours: Partial<WorkingHour>[] = [
  { dayOfWeek: "1", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "2", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "3", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "4", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "5", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "6", openTime: "09:00", closeTime: "17:00", isClosed: true },
  { dayOfWeek: "0", openTime: "09:00", closeTime: "17:00", isClosed: true }
];

const getDayName = (dayOfWeek: string): string => {
  const days = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
  return days[parseInt(dayOfWeek)];
};

const reorderDays = (hours: Partial<WorkingHour>[]): Partial<WorkingHour>[] => {
  const order = ["1", "2", "3", "4", "5", "6", "0"];
  return order.map(day => hours.find(h => h.dayOfWeek === day)!);
};

export default function WorkingHoursEditor({ serviceId, workingHours, onClose }: WorkingHoursEditorProps) {
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
      for (const hour of hoursToUpdate) {
        const response = await apiRequest('PUT', `/api/service/working-hours/${hour.dayOfWeek}`, {
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isClosed: hour.isClosed
        });
        if (!response.ok) {
          throw new Error('Failed to update working hours');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-profile'] });
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
            />
            {!hour.isClosed && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hour.openTime}
                  onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)}
                  className="w-24"
                />
                <span>-</span>
                <Input
                  type="time"
                  value={hour.closeTime}
                  onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                  className="w-24"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4 border-t pt-4">
        <Button variant="outline" onClick={onClose}>Anulează</Button>
        <Button onClick={handleSave}>Salvează</Button>
      </div>
    </div>
  );
}
