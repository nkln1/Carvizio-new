import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { WorkingHour } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface WorkingHoursEditorProps {
  serviceId: number;
  workingHours: WorkingHour[];
  onClose: () => void;
}

export default function WorkingHoursEditor({ serviceId, workingHours, onClose }: WorkingHoursEditorProps) {
  const [hours, setHours] = useState<WorkingHour[]>(workingHours);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (updatedHours: WorkingHour[]) => {
      const response = await apiRequest('PUT', `/api/service/working-hours/${serviceId}`, {
        workingHours: updatedHours
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

  const handleSave = () => {
    updateWorkingHoursMutation.mutate(hours);
  };

  return (
    <div className="space-y-4">
      {hours.map((hour, index) => (
        <div key={index} className="flex items-center gap-4">
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