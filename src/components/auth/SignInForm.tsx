import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";

const API_BASE = "https://v2.jkt48connect.com/api/jkt48connect";
const API_KEY = "JKTCONNECT";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ login: "", password: "" });
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const loginData = JSON.parse(sessionStorage.getItem("userLogin") || "null");
      if (loginData && loginData.isLoggedIn && loginData.token) {
        navigate("/");
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    }
  }, [navigate]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.login.trim()) {
      showToast("Email or username is required", "error");
      return;
    }
    if (!formData.password) {
      showToast("Password is required", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login?apikey=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          login: formData.login.toLowerCase().trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        const loginData = {
          isLoggedIn: true,
          token: data.data.session?.access_token,
          sessionId: data.data.session?.id,
          expiresAt: data.data.session?.expires_at,
          user: data.data.user,
          loginAt: new Date().toISOString(),
        };

        if (isChecked) {
          localStorage.setItem("userLogin", JSON.stringify(loginData));
          localStorage.setItem("authToken", data.data.session?.access_token);
        } else {
          sessionStorage.setItem("userLogin", JSON.stringify(loginData));
          sessionStorage.setItem("authToken", data.data.session?.access_token);
        }

        showToast("Sign in successful! Redirecting...", "success");
        setTimeout(() => navigate("/"), 1500);
      } else {
        const attemptsMsg =
          data.attempts_remaining !== undefined
            ? ` (${data.attempts_remaining} attempts remaining)`
            : "";
        showToast((data.message || "Sign in failed. Please try again.") + attemptsMsg, "error");
      }
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        showToast("Unable to connect to server. Check your internet connection.", "error");
      } else {
        showToast("An error occurred: " + error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-success-50 text-success-700 border border-success-200"
              : "bg-error-50 text-error-700 border border-error-200"
          }`}
        >
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your username or email and password to sign in!
            </p>
          </div>

          <div>
            <form onSubmit={handleLogin}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Username or Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    name="login"
                    value={formData.login}
                    onChange={handleInputChange}
                    placeholder="username / email@example.com"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div>
                  <Button className="w-full" size="sm" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
