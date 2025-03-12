// Acest fragment va fi adăugat în fișierul existent
// Când se selectează o conversație, vom adăuga logica pentru a invalida contorul de mesaje
// Acest cod poate exista deja în formă similară

// În funcția de selectare a conversației, asigurați-vă că este adăugată invalidarea:
// queryClient.invalidateQueries({ queryKey: ["unreadConversationsCount"] });