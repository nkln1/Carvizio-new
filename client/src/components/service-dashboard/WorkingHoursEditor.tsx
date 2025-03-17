
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
  { dayOfWeek: "1", openTime: "09:00", closeTime: "17:00", isClosed: false }, // Luni
  { dayOfWeek: "2", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "3", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "4", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "5", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "6", openTime: "09:00", closeTime: "17:00", isClosed: true },
  { dayOfWeek: "0", openTime: "09:00", closeTime: "17:00", isClosed: true }  // Duminica
];

const getDayName = (dayOfWeek: string): string => {
  const days = [
    "Duminică",
    "Luni",
    "Marți",
    "Miercuri",
    "Joi",
    "Vineri",
    "Sâmbătă"
  ];
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
        title: 'Success',
        description: 'Program actualizat cu succes',
      });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: 'Error',
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
    <div className="space-y-4 border rounded-lg p-4">
      <h3 className="font-semibold mb-4">Program de Lucru</h3>
      <div className="space-y-3">
        {hours.map((hour, index) => (
          <div key={index} className="grid grid-cols-[150px_100px_1fr] gap-4 items-center p-2 hover:bg-gray-50 rounded">
            <span className="font-medium">{getDayName(hour.dayOfWeek!)}</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={hour.isClosed}
                onCheckedChange={(checked) => handleClosedChange(index, checked)}
              />
              <span className="text-sm text-gray-600">Închis</span>
            </div>
            {!hour.isClosed && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hour.openTime}
                  onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)}
                  className="w-32"
                />
                <span>-</span>
                <Input
                  type="time"
                  value={hour.closeTime}
                  onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)}
                  className="w-32"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Anulează</Button>
        <Button onClick={handleSave}>Salvează</Button>
      </div>
    </div>
  );
}
