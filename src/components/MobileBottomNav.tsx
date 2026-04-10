import { Download, Send, History, User, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserTab = "dashboard" | "download" | "requests" | "history" | "profile";

const tabs: { id: UserTab; label: string; icon: typeof Download }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "download", label: "Download", icon: Download },
  { id: "requests", label: "Requests", icon: Send },
  { id: "history", label: "History", icon: History },
  { id: "profile", label: "Profile", icon: User },
];

interface MobileBottomNavProps {
  active: UserTab;
  onChange: (tab: UserTab) => void;
}

export default function MobileBottomNav({ active, onChange }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom md:hidden">
      <div className="flex h-16 items-stretch">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
