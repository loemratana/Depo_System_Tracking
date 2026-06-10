// hooks/useDeleteDepot.ts
import { useState } from "react";
import axios, { AxiosError } from "../../../api/axios-client";

export function useDeleteDepot() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteDepot = async (depotId: string | number): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const numericId = typeof depotId === "string" ? parseInt(depotId, 10) : depotId;
      if (isNaN(numericId)) throw new Error("Invalid depot ID");

      await axios.delete(`/depots/${numericId}`);
      return true;
    } catch (error) {
      const err = error as AxiosError;
      // 👇 Log the response data from the backend
      if (err.response) {
        console.error("Backend error response:", err.response.data);
      } else {
        console.error("Failed to delete depot:", error);
      }
      return false;
    } finally {
      setIsDeleting(false);
    }
  };
  return { deleteDepot, isDeleting };
}
