
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
  { dayOfWeek: "0", openTime: "09:00", closeTime: "17:00", isClosed: true },
  { dayOfWeek: "1", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "2", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "3", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "4", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "5", openTime: "09:00", closeTime: "17:00", isClosed: false },
  { dayOfWeek: "6", openTime: "09:00", closeTime: "17:00", isClosed: true }
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

export default function WorkingHoursEditor({ serviceId, workingHours, onClose }: WorkingHoursEditorProps) {
  const [hours, setHours] = useState<Partial<WorkingHour>[]>(() => {
    // Initialize with custom hours or defaults
    const initialHours = [...defaultHours];
    workingHours.forEach(customHour => {
      const index = parseInt(customHour.dayOfWeek);
      initialHours[index] = { ...customHour };
    });
    return initialHours;
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (dayData: Partial<WorkingHour>) => {
      const response = await apiRequest('PUT', `/api/service/working-hours/${dayData.dayOfWeek}`, {
        openTime: dayData.openTime,
        closeTime: dayData.closeTime,
        isClosed: dayData.isClosed
      });
      if (!response.ok) {
        throw new Error('Failed to update working hours');
      }
      return response.json();
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

  const handleSave = async () => {
    try {
      // Update each day
      for (const hour of hours) {
        await updateWorkingHoursMutation.mutateAsync(hour);
      }
    } catch (error) {
      console.error('Error saving working hours:', error);
    }
  };

  return (
    <div className="space-y-4">
      {hours.map((hour, index) => (
        <div key={index} className="flex items-center gap-4">
          <span className="w-24 font-medium">{getDayName(index.toString())}</span>
          <div className="flex items-center gap-2">
            <Switch
              checked={hour.isClosed}
              onCheckedChange={(checked) => handleClosedChange(index, checked)}
            />
            <span>Închis</span>
          </div>
          {!hour.isClosed && (
            <>
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
            </>
          )}
        </div>
      ))}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>Anulează</Button>
        <Button onClick={handleSave}>Salvează</Button>
      </div>
    </div>
  );
}
