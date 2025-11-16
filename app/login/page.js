"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import ReCAPTCHA from "react-google-recaptcha";
import axios from "axios";

const API_BASE = "https://api.cnergy.site/"; // match your frontend origin

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [captchaResponse, setCaptchaResponse] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const [captchaLoaded, setCaptchaLoaded] = useState(false);

  const router = useRouter();

  // Helper function to set cookies for middleware compatibility
  const setCookie = useCallback((name, value, days = 1) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }, []);

  useEffect(() => {
    // Check if user is already logged in via sessionStorage
    const storedRole = sessionStorage.getItem('user_role');
    if (storedRole === 'admin' || storedRole === 'staff') {
      // Ensure cookie is also set for middleware
      setCookie('user_role', storedRole);
      router.replace(`/${storedRole}dashboard`);
    }
  }, [router, setCookie]);

  // Handle reCAPTCHA load errors gracefully
  useEffect(() => {
    const handleRecaptchaError = () => {
      console.warn('reCAPTCHA failed to load. Proceeding without CAPTCHA verification.');
      setCaptchaError(true);
      setCaptchaLoaded(true);
      // Allow login without CAPTCHA if it fails to load (for development/local environments)
      setCaptchaValid(true);
    };

    // Set a timeout to detect if reCAPTCHA doesn't load within 10 seconds
    const timeout = setTimeout(() => {
      if (!captchaLoaded && !captchaError) {
        handleRecaptchaError();
      }
    }, 10000);

    // Listen for reCAPTCHA script errors and suppress console spam
    const scriptErrorHandler = (event) => {
      if (event.target && event.target.src && event.target.src.includes('recaptcha')) {
        // Prevent the error from propagating and causing console spam
        event.preventDefault();
        event.stopPropagation();
        handleRecaptchaError();
        return true; // Suppress the error
      }
    };

    // Global error handler to catch and suppress reCAPTCHA connection errors
    const globalErrorHandler = (event) => {
      if (event.message && event.message.includes('recaptcha')) {
        event.preventDefault();
        event.stopPropagation();
        if (!captchaError) {
          handleRecaptchaError();
        }
        return true;
      }
    };

    window.addEventListener('error', scriptErrorHandler, true);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.toString().includes('recaptcha')) {
        event.preventDefault();
        if (!captchaError) {
          handleRecaptchaError();
        }
      }
    });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('error', scriptErrorHandler, true);
    };
  }, [captchaLoaded, captchaError]);

  const handleCaptchaChange = (response) => {
    setCaptchaResponse(response);
    setCaptchaValid(!!response);
    setCaptchaLoaded(true);
  };

  const handleCaptchaError = () => {
    console.warn('reCAPTCHA error occurred. Proceeding without CAPTCHA verification.');
    setCaptchaError(true);
    setCaptchaLoaded(true);
    // Allow login without CAPTCHA if it fails
    setCaptchaValid(true);
  };

  const handleCaptchaExpired = () => {
    setCaptchaValid(false);
    setCaptchaResponse(null);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and Password are required.");
      setLoading(false);
      return;
    }

    // Only require CAPTCHA if it's loaded and not in error state
    if (!captchaError && !captchaResponse) {
      setError("Please complete the CAPTCHA.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/login.php`,
        { email, password },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.redirect) {
        // Set user role in sessionStorage for the main page
        const userRole = response.data.user_role || response.data.redirect.split('/')[1].replace('dashboard', '');
        // Only allow admin and staff roles
        if (userRole === 'admin' || userRole === 'staff') {
          sessionStorage.setItem('user_role', userRole);
          
          // Set cookie for middleware compatibility
          setCookie('user_role', userRole);
          
          // Store user ID if provided in response
          if (response.data.user_id) {
            sessionStorage.setItem('user_id', response.data.user_id);
            console.log('Stored user_id from login response:', response.data.user_id);
          } else {
            console.warn('Login response did not include user_id. Will try to retrieve from session.php after redirect.');
          }
        } else {
          setError('Invalid user role. Only admin and staff are allowed.');
          setLoading(false);
          return;
        }
        
        // Force a page reload to ensure proper state synchronization
        window.location.href = response.data.redirect;
      } else {
        setError(response.data.error || "Invalid email or password.");
      }
    } catch {
      setError("Error logging in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://api.cnergy.site/bbg.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 bg-gray-900/90 p-10 rounded-3xl shadow-2xl border border-gray-700 backdrop-blur-lg">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-white">
              <span className="text-orange-500">C</span>NERGY GYM
            </h1>
            <p className="mt-2 text-lg font-medium tracking-wider text-gray-300">
              Monitoring, Progress, and Sales Tracking Dashboard for CNERGY GYM
            </p>
          </div>
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 border border-red-600 p-3 rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <FaUser className="absolute left-3 top-3 text-orange-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pl-10 text-white"
              />
            </div>
            <div className="relative">
              <FaLock className="absolute left-3 top-3 text-orange-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pl-10 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="form-checkbox h-4 w-4 text-orange-500"
                />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className="text-orange-400 hover:text-orange-300">
                Forgot Password?
              </a>
            </div>
            {!captchaError ? (
              <div className="flex justify-center">
                <ReCAPTCHA
                  sitekey="6LdRiNMqAAAAALOse29KCWAoHGDop9DQMPgeMoUo"
                  onChange={handleCaptchaChange}
                  onErrored={handleCaptchaError}
                  onExpired={handleCaptchaExpired}
                  theme="dark"
                />
              </div>
            ) : (
              <div className="text-center text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-600/50 p-3 rounded-lg">
                <p>⚠️ CAPTCHA verification unavailable. Login will proceed without CAPTCHA.</p>
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-orange-500 text-white disabled:bg-orange-400"
              disabled={loading || !captchaValid}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}