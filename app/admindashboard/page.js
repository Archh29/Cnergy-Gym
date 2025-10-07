"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { CheckCircle, AlertCircle, Clock, Wifi } from "lucide-react"
import AdminDashboardClient from "./admin/client-wrapper"

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Admin Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">The admin dashboard encountered an error.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const router = useRouter()
  const [notification, setNotification] = useState({ show: false, message: "", type: "" })
  const [lastScanTime, setLastScanTime] = useState(0)
  const [scanCount, setScanCount] = useState(0)
  const [isConnected, setIsConnected] = useState(true)

  // Logout function removed - handled by sidebar

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
    }
    // Remove the automatic "No active membership" addition since backend now handles this

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
      // Get userId from session storage for global QR scanner
      const currentUserId = sessionStorage.getItem("user_id")
      
      const response = await axios.post("https://api.cnergy.site/attendance.php", {
        action: "qr_scan",
        qr_data: cleanedData.trim(),
        staff_id: currentUserId,
      })

          if (response.data.success) {
            const actionType = response.data.action
            let notificationMessage = response.data.message

            // Add plan info to notification if available
            if (response.data.plan_info) {
              const planInfo = response.data.plan_info
              notificationMessage += `\n📋 Plan: ${planInfo.plan_name} | Expires: ${planInfo.expires_on} | Days left: ${planInfo.days_remaining}`
            }

            if (actionType === "auto_checkout") {
              showNotification(notificationMessage, "info")
            } else if (actionType === "auto_checkout_and_checkin") {
              showNotification(notificationMessage, "info")
            } else {
              showNotification(notificationMessage, "success")
            }

        // Trigger custom event for other components
        window.dispatchEvent(
          new CustomEvent("qr-scan-success", {
            detail: { data: cleanedData, response: response.data },
          }),
        )
          } else {
            // Handle plan validation errors
            if (response.data.type === "expired_plan" || response.data.type === "no_plan") {
              showNotification(response.data.message, "error")
            }
            // Handle cooldown errors
            else if (response.data.type === "cooldown") {
              showNotification(response.data.message, "warning")
            }
            // Handle attendance limit errors
            else if (response.data.type === "already_checked_in") {
              showNotification(response.data.message, "warning")
            }
            else if (response.data.type === "already_attended_today") {
              showNotification(response.data.message, "info")
            }
            // Handle session conflict errors
            else if (response.data.type === "session_conflict") {
              showNotification(response.data.message, "error")
            } else {
              showNotification(response.data.message || "Failed to process QR code", "error")
            }
          }
      setIsConnected(true)
    } catch (err) {
      setIsConnected(false)
      showNotification("Network error - check server connection", "error")
    } finally {
      globalScannerRef.current.isProcessing = false
    }
  }

  // No authentication logic here - handled by main page

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

  // No authentication checks - main page handles this

  return (
    <div className="min-h-screen bg-gray-50">

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
      <ErrorBoundary>
        <AdminDashboardClient />
      </ErrorBoundary>
    </div>
  )
}

export default App