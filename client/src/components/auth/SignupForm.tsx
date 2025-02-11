
import { Button } from "@/components/ui/button";

export default function SignupForm() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Button variant="outline" className="w-full">
        Înregistrare cu Google
      </Button>
      <Button variant="outline" className="w-full">
        Înregistrare cu Facebook
      </Button>
    </div>
  );
}
