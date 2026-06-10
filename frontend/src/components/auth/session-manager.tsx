import * as React from "react";
import { useAuth } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

export function SessionManager() {
  const { session, logout, refreshSession, status } = useAuth();
  const [isExpired, setIsExpired] = React.useState(false);

  React.useEffect(() => {
    if (!session || status !== "authenticated") return;

    const checkSession = async () => {
      const now = Date.now();
      const expiresAt = session.expiresAt;
      const diff = expiresAt - now;

      // If expired, attempt silent refresh
      if (diff <= 0 && !isExpired) {
        const success = await refreshSession();
        if (!success) {
          setIsExpired(true);
        }
      }
    };

    const timer = setInterval(checkSession, 5000); // Check every 5s is enough
    checkSession();

    return () => clearInterval(timer);
  }, [session, status, isExpired, refreshSession]);

  const handleLogout = () => {
    setIsExpired(false);
    logout();
  };

  return (
    <>
      {/* Session Expired Dialog - Only shown if refresh fails */}
      <AlertDialog open={isExpired}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">Session Expired</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Your session has timed out due to inactivity or token expiry. 
              Please sign in again to continue working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction
              onClick={handleLogout}
              className="h-9 w-full bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
