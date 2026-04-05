import { useAuth } from "@/hooks/useAuth";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import LandingPage from "./LandingPage";

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  if (role === "admin") return <AdminDashboard />;
  return <UserDashboard />;
}
