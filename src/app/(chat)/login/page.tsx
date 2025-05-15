"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const router = useRouter();

  const API_URL = "http://localhost:8080/KJN/chatting/app/auth";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await axios.post(`${API_URL}/send/signup-Otp`, { email });
      setIsOtpSent(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

const handleOtpSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const otpCode = otp.join("");
  if (otpCode.length !== 6) {
    setError("Please enter a valid 6-digit OTP");
    return;
  }

  try {
    setIsLoading(true);
    setError("");

    const payload = {
      email,
      otp: otpCode,
    };

    const response = await axios.post(`${API_URL}/signin`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const { token, user } = response.data;
    // Ensure user has required fields
    if (!user?.id || !user?.username || !user?.email) {
      throw new Error("Invalid user data received from server");
    }

    localStorage.setItem("token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        image: user.image
          ? {
              id: user.image.id,
              downloadUrl: `http://localhost:8080/KJN/chatting/app/users/image/download/${user.image.id}`,
            }
          : undefined,
      })
    );
    router.push("/message");
  } catch (err: any) {
    console.error("Login error:", err); // Log full error for debugging
    if (err.response) {
      setError(err.response.data?.message || "Invalid OTP. Please try again.");
    } else if (err.request) {
      setError("Network error. Please check your connection or server status.");
    } else {
      setError("An unexpected error occurred. Please try again.");
    }
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 relative">
        {showNotification && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
            OTP sent to your email
          </div>
        )}
        <div className="flex flex-col items-center">
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            WELCOME TO JK-NANA CHATTING APP
          </h1>
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              <Image
                src="/announcement.png"
                alt="Announce"
                width={100}
                height={100}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/registration"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Create one now
            </Link>
          </p>
        </div>
        <form
          className="mt-8 space-y-6"
          onSubmit={isOtpSent ? handleOtpSubmit : handleSendOtp}
        >
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                disabled={isOtpSent}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
              />
            </div>
            {isOtpSent && (
              <div className="flex justify-between mt-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className="w-12 h-12 text-center text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                ))}
              </div>
            )}
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading
                ? isOtpSent
                  ? "Verifying..."
                  : "Sending OTP..."
                : isOtpSent
                ? "Sign in"
                : "Send OTP"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}