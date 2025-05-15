"use client";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      toast.error("Please log in to access this page");
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (!userData?.id) {
        toast.error("Invalid user data. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      // Validate JWT token
      const decoded = jwtDecode<{ exp: number }>(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }
    } catch (e) {
      toast.error("Invalid authentication token. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  return children;
};

export default ProtectedRoute;
