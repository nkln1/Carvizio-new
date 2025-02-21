import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { queryClient } from "@/lib/queryClient";
import type { CarType } from "@shared/schema";

export function useCarManagement() {
  const { toast } = useToast();
  const [selectedCar, setSelectedCar] = useState<CarType | undefined>();

  const handleCarSubmit = async (
    carData: Omit<CarType, "id" | "userId" | "createdAt">,
  ) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/cars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(carData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save car");
      }

      const newCar = await response.json();

      toast({
        title: "Success",
        description: "Car added successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      return newCar;
    } catch (error) {
      console.error("Error saving car:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save car",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateCar = async (
    carData: Omit<CarType, "id" | "userId" | "createdAt">,
  ) => {
    try {
      if (!selectedCar) return;

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`/api/cars/${selectedCar.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(carData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update car");
      }

      toast({
        title: "Success",
        description: "Car updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      setSelectedCar(undefined);
    } catch (error) {
      console.error("Error updating car:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update car",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteCar = async (carId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`/api/cars/${carId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete car");
      }

      toast({
        title: "Success",
        description: "Car deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
    } catch (error) {
      console.error("Error deleting car:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete car",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    selectedCar,
    setSelectedCar,
    handleCarSubmit,
    handleUpdateCar,
    handleDeleteCar,
  };
}
