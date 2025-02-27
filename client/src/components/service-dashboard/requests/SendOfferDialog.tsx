const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);

      // Convert dates to ISO format for API
      const formattedDates = selectedDates.map(date => date.toISOString());

      const response = await fetch('/api/service/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          requestId: request.id,
          title,
          details,
          availableDates: formattedDates,
          price: parseInt(price),
          notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send offer');
      }

      const offer = await response.json();

      toast({
        title: "Ofertă trimisă cu succes!",
        description: "Clientul va fi notificat despre oferta ta.",
      });

      setTitle('');
      setDetails('');
      setSelectedDates([]);
      setPrice('');
      setNotes('');
      onClose();

      // Refresh offers list and available requests
      queryClient.invalidateQueries({ queryKey: ['/api/service/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/service/requests'] });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eroare la trimiterea ofertei",
        description: error.message || "A apărut o eroare neașteptată.",
      });
    } finally {
      setSubmitting(false);
    }
  };