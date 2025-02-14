import { UserInfo } from "@/components/auth/user-info";

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      <div className="grid gap-6">
        <UserInfo />
        {/* Other dashboard components */}
      </div>
    </div>
  );
}
