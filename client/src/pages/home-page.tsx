import { UserInfo } from "@/components/auth/user-info";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your automotive service dashboard
        </p>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <UserInfo />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and services</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Quick actions will be added here */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}