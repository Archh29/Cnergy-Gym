"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { CheckCircle, AlertCircle, Clock, Wifi } from "lucide-react"
import AdminDashboard from "./admin/page"

const App = () => {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" })
  const [lastScanTime, setLastScanTime] = useState(0)
  const [scanCount, setScanCount] = useState(0)
  const [isConnected, setIsConnected] = useState(true)

  // Logout function
  const handleLogout = () => {
    // Clear all storage
    sessionStorage.clear();
    localStorage.clear();
    
    // Call logout API
    fetch('/api/logout', {
      method: 'GET',
      credentials: 'include'
    })
    .then(() => {
      // Force redirect to login
      window.location.href = '/login';
    })
    .catch(() => {
      // Even if API fails, redirect to login
      window.location.href = '/login';
    });
  };

  // Global scanner state
  const globalScannerRef = useRef({
    buffer: "",
    lastKeyTime: 0,
    isProcessing: false,
    keyCount: 0,
    scanStartTime: 0,
    isListening: false,
  })

  // Show notification with membership info if available
  const showNotification = (message, type = "success", membership = null) => {
    let fullMessage = message

    if (membership) {
      fullMessage += `\nPlan: ${membership.plan_name}`
      if (membership.days_left >= 0) {
        fullMessage += ` | ${membership.days_left} day(s) left`
      } else {
        fullMessage += ` | Expired`
      }
    } else {
      fullMessage += `\nNo active membership`
    }

    setNotification({ show: true, message: fullMessage, type })
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 5000)
  }

  // Clean and normalize QR data
  const cleanQrData = (rawData) => {
    // Remove duplicate characters
    let cleaned = ""
    let lastChar = ""
    for (let i = 0; i < rawData.length; i++) {
      const char = rawData[i]
      if (char !== lastChar) {
        cleaned += char
        lastChar = char
      }
    }

    // Handle common character substitutions
    cleaned = cleaned.replace(/;/g, ":") // semicolon to colon
    cleaned = cleaned.replace(/_/g, "-") // underscore to dash
    cleaned = cleaned.replace(/\|/g, ":") // pipe to colon

    // Convert to uppercase for pattern matching
    const upperCleaned = cleaned.toUpperCase()

    // Try to extract the expected pattern
    const patterns = [/CNERGY[-]ATTENDANCE[:]\d+/i, /CNERGY.*ATTENDANCE.*[:]\d+/i, /ATTENDANCE[:]\d+/i]

    for (const pattern of patterns) {
      const match = upperCleaned.match(pattern)
      if (match) {
        const numberMatch = match[0].match(/\d+/)
        if (numberMatch) {
          return `CNERGY_ATTENDANCE:${numberMatch[0]}`
        }
      }
    }

    // If no pattern matches, try to find just numbers at the end
    const numberMatch = cleaned.match(/\d+/)
    if (numberMatch) {
      return `CNERGY_ATTENDANCE:${numberMatch[0]}`
    }

    // Last resort - return original
    return rawData
  }

  // Process QR scan globally
  const processGlobalQrScan = async (scannedData) => {
    const currentTime = Date.now()
    const cleanedData = cleanQrData(scannedData)

    // Prevent duplicate scans within 2 seconds
    if (currentTime - lastScanTime < 2000) {
      return
    }

    // Prevent processing if already processing
    if (globalScannerRef.current.isProcessing) {
      return
    }

    globalScannerRef.current.isProcessing = true
    setLastScanTime(currentTime)
    setScanCount((prev) => prev + 1)

    try {
      const response = await axios.post("https://api.cnergy.site/attendance.php", {
        action: "qr_scan",
        qr_data: cleanedData.trim(),
      })

      if (response.data.success) {
        const actionType = response.data.action
        if (actionType === "auto_checkout_and_checkin") {
          showNotification(response.data.message, "warning", response.data.membership)
        } else {
          showNotification(response.data.message, "success", response.data.membership)
        }

        // Trigger custom event for other components
        window.dispatchEvent(
          new CustomEvent("qr-scan-success", {
            detail: { data: cleanedData, response: response.data },
          }),
        )
      } else {
        showNotification(response.data.message || "Failed to process QR code", "error")
      }
      setIsConnected(true)
    } catch (err) {
      setIsConnected(false)
      showNotification("Network error - check server connection", "error")
    } finally {
      globalScannerRef.current.isProcessing = false
    }
  }

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      console.log('Checking authentication...');
      // Always verify with server - never trust client-side storage
      fetch('https://api.cnergy.site/session.php', {
        credentials: 'include'
      })
      .then(response => {
        console.log('Session response status:', response.status);
        if (response.status === 401) {
          // Session is invalid, clear everything and redirect
          sessionStorage.clear();
          console.log('Session invalid (401), clearing storage and redirecting');
          // Use window.location for more reliable redirect
          window.location.href = '/login';
          return;
        }
        return response.json();
      })
      .then(data => {
        if (!data) return; // Skip if we already handled 401 above
        
        console.log('Session data:', data);
        if (data.user_role === 'admin') {
          // Only set sessionStorage after server confirmation
          sessionStorage.setItem('user_role', 'admin');
          setIsAuthenticated(true);
          console.log('Admin authenticated successfully');
        } else {
          // Clear any potentially tampered sessionStorage
          sessionStorage.clear();
          console.log('Not admin, redirecting to login');
          window.location.href = '/login';
        }
      })
      .catch((error) => {
        console.error('Authentication error:', error);
        // Clear any potentially tampered sessionStorage
        sessionStorage.clear();
        window.location.href = '/login';
      })
      .finally(() => {
        setIsLoading(false);
      });
    };

    checkAuth();

    // Set up periodic re-validation every 30 seconds to prevent session hijacking
    const interval = setInterval(() => {
      fetch('https://api.cnergy.site/session.php', {
        credentials: 'include'
      })
      .then(response => {
        if (response.status === 401) {
          sessionStorage.clear();
          window.location.href = '/login';
          return;
        }
        return response.json();
      })
      .then(data => {
        if (data && data.user_role !== 'admin') {
          // Role changed or session expired
          sessionStorage.clear();
          window.location.href = '/login';
        }
      })
      .catch(() => {
        // Server error - redirect to login for security
        sessionStorage.clear();
        window.location.href = '/login';
      });
    }, 30000); // Check every 30 seconds

    // Add security check on page focus to catch tampering attempts
    const handleFocus = () => {
      fetch('https://api.cnergy.site/session.php', {
        credentials: 'include'
      })
      .then(response => {
        if (response.status === 401) {
          sessionStorage.clear();
          window.location.href = '/login';
          return;
        }
        return response.json();
      })
      .then(data => {
        if (data && data.user_role !== 'admin') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
      })
      .catch(() => {
        sessionStorage.clear();
        window.location.href = '/login';
      });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  // Enhanced Global QR Scanner
  useEffect(() => {
    // Reset scanner buffer
    const resetBuffer = () => {
      globalScannerRef.current.buffer = ""
      globalScannerRef.current.keyCount = 0
      globalScannerRef.current.scanStartTime = 0
    }

    // Keyboard event handler
    const handleKeyboardEvent = (event) => {
      const currentTime = Date.now()

      // Skip if in input fields
      const activeElement = document.activeElement
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true" ||
          activeElement.isContentEditable)
      ) {
        return
      }

      // Handle Enter key - end of scan
      if (event.key === "Enter") {
        event.preventDefault()
        event.stopPropagation()
        if (globalScannerRef.current.buffer.length > 3) {
          processGlobalQrScan(globalScannerRef.current.buffer)
        }
        resetBuffer()
        return
      }

      // Handle regular characters
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const timeSinceLastKey = currentTime - globalScannerRef.current.lastKeyTime

        // Detect rapid input (QR scanner characteristic)
        if (globalScannerRef.current.keyCount === 0 || timeSinceLastKey < 150) {
          if (globalScannerRef.current.keyCount === 0) {
            globalScannerRef.current.scanStartTime = currentTime
          }

          globalScannerRef.current.buffer += event.key
          globalScannerRef.current.keyCount++
          globalScannerRef.current.lastKeyTime = currentTime

          // Auto-process when buffer gets long enough
          if (globalScannerRef.current.buffer.length > 15) {
            setTimeout(() => {
              if (currentTime - globalScannerRef.current.lastKeyTime > 100) {
                processGlobalQrScan(globalScannerRef.current.buffer)
                resetBuffer()
              }
            }, 200)
          }
        } else {
          // Reset on slow typing (human input)
          resetBuffer()
        }
      }
    }

    // Attach event listeners
    const attachAllListeners = () => {
      document.addEventListener("keydown", handleKeyboardEvent, true)
      document.addEventListener("keypress", handleKeyboardEvent, true)
      window.addEventListener("keydown", handleKeyboardEvent, true)
      window.addEventListener("keypress", handleKeyboardEvent, true)

      if (document.body) {
        document.body.addEventListener("keydown", handleKeyboardEvent, true)
        document.body.addEventListener("keypress", handleKeyboardEvent, true)
      }

      globalScannerRef.current.isListening = true
    }

    // Ensure document focus
    const ensureFocus = () => {
      if (document.body) {
        document.body.focus()
      }
      document.documentElement.focus()
    }

    // Attach immediately
    attachAllListeners()
    ensureFocus()

    // Retry attachment for reliability
    const retryIntervals = [100, 500, 1000]
    const timeouts = retryIntervals.map((delay) =>
      setTimeout(() => {
        attachAllListeners()
        ensureFocus()
      }, delay),
    )

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyboardEvent, true)
      document.removeEventListener("keypress", handleKeyboardEvent, true)
      window.removeEventListener("keydown", handleKeyboardEvent, true)
      window.removeEventListener("keypress", handleKeyboardEvent, true)

      if (document.body) {
        document.body.removeEventListener("keydown", handleKeyboardEvent, true)
        document.body.removeEventListener("keypress", handleKeyboardEvent, true)
      }

      timeouts.forEach(clearTimeout)
      globalScannerRef.current.isListening = false
    }
  }, [])

  // Handle back button navigation
  useEffect(() => {
    const handleBack = () => {
      router.push("/admindashboard")
    }

    window.history.pushState(null, null, window.location.href)
    window.addEventListener("popstate", handleBack)

    return () => {
      window.removeEventListener("popstate", handleBack)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">Loading Admin Dashboard...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Force redirect if not authenticated
    useEffect(() => {
      sessionStorage.clear();
      window.location.href = '/login';
    }, []);
    
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">Redirecting to login...</div>
          <div className="text-sm text-gray-500 mt-2">If this takes too long, <a href="/login" className="text-orange-500 underline">click here</a></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logout Button - top right */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Clean Status Indicator - moved to bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-3 py-2 border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">QR Scanner Active</span>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-1">
            <Wifi className={`w-4 h-4 ${isConnected ? "text-green-500" : "text-red-500"}`} />
            <span className="text-xs text-gray-500">{scanCount}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Notification */}
      {notification.show && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div
            className={`
              max-w-sm rounded-lg shadow-lg border p-4 bg-white whitespace-pre-line
              ${
                notification.type === "error"
                  ? "border-red-200 bg-red-50"
                  : notification.type === "warning"
                  ? "border-orange-200 bg-orange-50"
                  : "border-green-200 bg-green-50"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {notification.type === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : notification.type === "warning" ? (
                  <Clock className="w-5 h-5 text-orange-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium whitespace-pre-line ${
                    notification.type === "error"
                      ? "text-red-800"
                      : notification.type === "warning"
                      ? "text-orange-800"
                      : "text-green-800"
                  }`}
                >
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <AdminDashboard />
    </div>
  )
}

export default App
