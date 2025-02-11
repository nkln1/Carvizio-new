
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Button variant="outline" className="w-full">
        Continuă cu Google
      </Button>
      <Button variant="outline" className="w-full">
        Continuă cu Facebook
      </Button>
    </div>
  );
}
