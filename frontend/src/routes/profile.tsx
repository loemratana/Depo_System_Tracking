import { createFileRoute } from "@tanstack/react-router";
import { UserProfilePage } from "@/features/UserProfile";

export const Route = createFileRoute("/profile")({
  component: UserProfilePage,
  meta: () => [
    {
      title: "User Profile | Admin Dashboard",
    },
  ],
});
