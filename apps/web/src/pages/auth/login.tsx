import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";

// Validation schema using Zod
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = async (data: LoginForm) => {
    // Extra validation check - should not happen due to form validation
    if (!data.email || !data.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(data.email, data.password);
      toast.success("Welcome back!");
    } catch (error: any) {
      console.error("Login error:", error);
      // Handle different error types
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Invalid email or password");
      } else if (error.response?.data?.error?.message) {
        toast.error(error.response.data.error.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wrap handleSubmit to ensure preventDefault is called
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(onSubmit)(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 flex items-center justify-center rounded-full bg-primary-600 shadow-md">
              <svg
                className="h-8 w-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-gray-900">
              Sign in to Greenex
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Environmental consulting made simple
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleFormSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Email address
                </label>
                <input
                  {...register("email")}
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  className={`block w-full rounded-lg border px-3 py-2 text-gray-900 
                             focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all shadow-sm
                             ${
                               errors.email
                                 ? "border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50"
                                 : "border-slate-300 focus:ring-primary-500 focus:border-primary-500"
                             }`}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <div className="mt-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-red-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">
                      {errors.email.message}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Password
                </label>
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="current-password"
                  className={`block w-full rounded-lg border px-3 py-2 text-gray-900 
                             focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all shadow-sm
                             ${
                               errors.password
                                 ? "border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50"
                                 : "border-slate-300 focus:ring-primary-500 focus:border-primary-500"
                             }`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <div className="mt-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-red-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">
                      {errors.password.message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg
                         bg-primary-600 text-white font-medium text-sm
                         hover:bg-primary-700 active:bg-primary-800
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600
                         transition-all shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  login("admin@greenex.com", "admin123")
                    .then(() => console.log("Success!"))
                    .catch((err) => console.error(err));
                }}
                className="w-full py-2 px-4 bg-orange-500 text-white rounded-lg 
                           hover:bg-orange-600 active:bg-orange-700 
                           transition-colors shadow-sm text-sm"
              >
                Debug: Test Login Directly
              </button>

              <Link
                to="/auth/register"
                className="block text-center mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium transition"
              >
                Don't have an account? Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
