"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const API_URL = "http://localhost:8080/KJN/chatting/app/auth";

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError("Email is required to send OTP");
      return;
    }

    try {
      setError("");
      await axios.post(`${API_URL}/send/signup-Otp`, { email });
      setIsOtpSent(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (err) {
      console.error("OTP sending error:", err);
      setError("Failed to send OTP. Please try again.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits allowed

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move focus to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !username.trim() ||
      !email.trim() ||
      otp.some((digit) => digit === "")
    ) {
      setError("All fields are required and OTP must be filled");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("otp", otp.join(""));
      

      await axios.post(`${API_URL}/signup`, formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      router.push("/login?registered=true");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

 

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          OTP sent successfully!
        </div>
      )}

      <div className="max-w-md w-full space-y-8">
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {!isOtpSent && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                >
                  Send OTP
                </button>
              )}
            </div>

            {isOtpSent && (
              <div className="flex justify-between mt-4 gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className="w-12 h-12 text-center text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {isOtpSent && (
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {isLoading ? "Creating account..." : "Sign up"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
