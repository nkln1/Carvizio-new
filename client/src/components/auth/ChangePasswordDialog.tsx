import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { validatePassword } from "@/lib/passwordValidation";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Eroare",
        description: "Parolele nu corespund",
        variant: "destructive",
      });
      return;
    }

    // Validăm cerințele pentru parole
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Eroare",
        description: passwordValidation.errors[0] || "Parola nu respectă cerințele de securitate",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("User not found");

      // First re-authenticate
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Then change password
      await updatePassword(user, newPassword);

      toast({
        title: "Succes",
        description: "Parola a fost schimbată cu succes",
      });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error changing password:", error);
      let errorMessage = "A apărut o eroare la schimbarea parolei.";

      if (error.code === "auth/wrong-password") {
        errorMessage = "Parola curentă este incorectă.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Prea multe încercări. Vă rugăm să încercați mai târziu.";
      }

      toast({
        title: "Eroare",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schimbă Parola</DialogTitle>
          <DialogDescription>
            Pentru a schimba parola, vă rugăm să introduceți parola curentă și noua parolă.
            Parola nouă trebuie să conțină cel puțin 8 caractere, o literă mare, o literă mică și o cifră.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Parola Curentă</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Introduceți parola curentă"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Parolă Nouă</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Introduceți parola nouă"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmă Parola</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmați parola nouă"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Anulează
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se procesează...
                </>
              ) : (
                "Salvează"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}