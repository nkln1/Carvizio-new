import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function TestEmailButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleTestEmail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-email');
      const result = await response.json();
      
      console.log('Test email response:', result);
      
      if (result.success) {
        toast({
          title: 'Email trimis cu succes',
          description: 'Verificați consola pentru detalii complete.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Eroare la trimiterea email-ului',
          description: result.error || 'Verificați consola pentru detalii.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Eroare la testarea email-ului:', error);
      toast({
        title: 'Eroare la testarea email-ului',
        description: String(error),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleTestEmail} 
      disabled={isLoading}
      variant="outline"
      className="my-4">
      {isLoading ? 'Se trimite...' : 'Testează Serviciul de Email'}
    </Button>
  );
}