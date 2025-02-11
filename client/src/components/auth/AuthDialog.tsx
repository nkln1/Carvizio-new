
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AuthDialogProps {
  trigger: React.ReactNode;
}

export default function AuthDialog({ trigger }: AuthDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Autentificare</DialogTitle>
          <DialogDescription>
            Bine ai venit! Te rugăm să te autentifici pentru a continua.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button variant="outline" className="w-full">
            Continuă cu Google
          </Button>
          <Button variant="outline" className="w-full">
            Continuă cu Facebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
