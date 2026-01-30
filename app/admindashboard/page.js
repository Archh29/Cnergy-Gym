"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { CheckCircle, AlertCircle, Clock, Wifi, Eye } from "lucide-react"
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
  const [notification, setNotification] = useState({ show: false, message: "", type: "", memberPhoto: null, userId: null })
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

  // Normalize system_photo_url for serve_image (matches viewmembers logic)
  const normalizeSystemPhotoUrl = (url) => {
    if (!url || typeof url !== "string") return null
    if (url.includes("serve_image.php")) return url
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    if (url.startsWith("uploads/") || url.startsWith("uploads%2F")) {
      const normalizedPath = url.replace(/\//g, "%2F")
      return `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
    }
    return `https://api.cnergy.site/serve_image.php?path=${encodeURIComponent(url)}`
  }

  // Show notification with membership info and member photo if available
  const showNotification = (message, type = "success", membership = null, memberPhoto = null, userId = null) => {
    // Don't add plan info here if message already contains plan info to avoid duplicates
    // Check for any existing plan info (case-insensitive, check for "Plan:" pattern)
    const hasPlanInfo = /\bplan\s*:/i.test(message)
    let fullMessage = message
    if (membership && !hasPlanInfo) {
      let timeText = "Expired"

      // Check if this is a gym session plan (expires at 9 PM on expiration date)
      const isGymSession = /gym\s+session|day\s+pass|walk[- ]?in/i.test(membership.plan_name || '')

      // Always calculate from end_date for accuracy, especially when days_remaining is 0 but hours remain
      const endDateStr = membership.end_date || membership.expires_on
      if (endDateStr) {
        try {
          const now = new Date()
          let endDate = null

          // For gym sessions, always set expiration to 9 PM on the expiration date
          if (isGymSession) {
            // Try to parse from end_date first (MySQL datetime format)
            if (membership.end_date) {
              const parsedEndDate = new Date(membership.end_date)
              if (!isNaN(parsedEndDate.getTime())) {
                // Extract just the date part and set to 9 PM
                const dateOnly = new Date(parsedEndDate.getFullYear(), parsedEndDate.getMonth(), parsedEndDate.getDate())
                dateOnly.setHours(21, 0, 0, 0) // 9 PM on expiration date
                endDate = dateOnly
              }
            }

            // If end_date parsing failed, try expires_on (formatted string like "Jan 26, 2026")
            if (!endDate && membership.expires_on) {
              const parsedExpiresOn = new Date(membership.expires_on)
              if (!isNaN(parsedExpiresOn.getTime())) {
                // Extract just the date part and set to 9 PM
                const dateOnly = new Date(parsedExpiresOn.getFullYear(), parsedExpiresOn.getMonth(), parsedExpiresOn.getDate())
                dateOnly.setHours(21, 0, 0, 0) // 9 PM on expiration date
                endDate = dateOnly
              }
            }
          } else {
            // For non-gym sessions, parse normally
            endDate = new Date(endDateStr)
            if (isNaN(endDate.getTime()) && membership.expires_on) {
              endDate = new Date(membership.expires_on)
            }
          }

          if (endDate && !isNaN(endDate.getTime())) {
            const diffMs = endDate.getTime() - now.getTime()

            if (diffMs > 0) {
              const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))
              const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
              const minutesRemaining = Math.floor(diffMs / (1000 * 60))

              if (daysRemaining >= 1) {
                timeText = `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
              } else if (isGymSession && hoursRemaining < 1 && minutesRemaining > 0) {
                // For gym sessions, show minutes when less than 1 hour
                timeText = `${minutesRemaining} ${minutesRemaining === 1 ? "minute" : "minutes"} left`
              } else if (hoursRemaining > 0) {
                timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
              } else if (minutesRemaining > 0) {
                timeText = `${minutesRemaining} ${minutesRemaining === 1 ? "minute" : "minutes"} left`
              } else {
                timeText = "Expired"
              }
            } else {
              timeText = "Expired"
            }
          } else {
            console.error("Invalid date format:", endDateStr, membership.expires_on)
            // Fallback to days_remaining if date parsing fails
            const daysRemaining = typeof (membership.days_remaining ?? membership.days_left) === "number" ? (membership.days_remaining ?? membership.days_left) : null
            if (daysRemaining !== null && daysRemaining >= 0) {
              if (daysRemaining >= 1) {
                timeText = `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
              } else if (isGymSession && membership.expires_on) {
                // For gym sessions with 0 days, try to parse expires_on and calculate hours until 9 PM on that date
                const expiresDate = new Date(membership.expires_on)
                if (!isNaN(expiresDate.getTime())) {
                  const expiration9PM = new Date(expiresDate.getFullYear(), expiresDate.getMonth(), expiresDate.getDate())
                  expiration9PM.setHours(21, 0, 0, 0)
                  const now = new Date()
                  const diffMs = expiration9PM.getTime() - now.getTime()
                  if (diffMs > 0) {
                    const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
                    const minutesRemaining = Math.floor(diffMs / (1000 * 60))
                    if (hoursRemaining > 0) {
                      timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
                    } else if (minutesRemaining > 0) {
                      timeText = `${minutesRemaining} ${minutesRemaining === 1 ? "minute" : "minutes"} left`
                    } else {
                      timeText = "Expired"
                    }
                  } else {
                    timeText = "Expired"
                  }
                } else {
                  timeText = "Expired"
                }
              } else {
                timeText = "Expired"
              }
            } else {
              timeText = "Expired"
            }
          }
        } catch (e) {
          console.error("Error parsing end_date:", e, endDateStr)
          // Fallback to days_remaining if available
          const daysRemaining = typeof (membership.days_remaining ?? membership.days_left) === "number" ? (membership.days_remaining ?? membership.days_left) : null
          if (daysRemaining !== null && daysRemaining >= 0) {
            if (daysRemaining >= 1) {
              timeText = `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
            } else if (isGymSession) {
              // For gym sessions with 0 days, calculate hours until 9 PM today
              const today9PM = new Date()
              today9PM.setHours(21, 0, 0, 0)
              const now = new Date()
              const diffMs = today9PM.getTime() - now.getTime()
              if (diffMs > 0) {
                const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
                if (hoursRemaining > 0) {
                  timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
                } else {
                  timeText = "Expired"
                }
              } else {
                timeText = "Expired"
              }
            } else {
              timeText = "Expired"
            }
          }
        }
      } else {
        // Fallback to days_remaining if end_date not available
        const daysRemaining = typeof (membership.days_remaining ?? membership.days_left) === "number" ? (membership.days_remaining ?? membership.days_left) : null
        if (daysRemaining !== null && daysRemaining >= 0) {
          if (daysRemaining >= 1) {
            timeText = `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
          } else if (isGymSession) {
            // For gym sessions with 0 days, calculate hours until 9 PM today
            const today9PM = new Date()
            today9PM.setHours(21, 0, 0, 0)
            const now = new Date()
            const diffMs = today9PM.getTime() - now.getTime()
            if (diffMs > 0) {
              const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
              if (hoursRemaining > 0) {
                timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
              } else {
                timeText = "Expired"
              }
            } else {
              timeText = "Expired"
            }
          } else {
            timeText = "Expired"
          }
        }
      }
      // Add plan info without any emojis
      fullMessage += `\nPlan: ${membership.plan_name}  ·  ${timeText}`
    }

    // Remove ALL emojis from entire message and remove duplicate plan lines
    // First, remove all emojis (including clipboard emoji U+1F4CB)
    fullMessage = fullMessage.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')

    // Now remove duplicate plan lines (normalize separators first)
    const lines = fullMessage.split('\n')
    let planLineFound = false
    fullMessage = lines.filter(line => {
      const trimmedLine = line.trim()
      if (/\bplan\s*:/i.test(trimmedLine)) {
        if (planLineFound) {
          return false // Skip duplicate plan lines
        }
        planLineFound = true
        // Normalize separators to consistent format
        return trimmedLine.replace(/\s*[|•·]\s*/g, ' · ').trim()
      }
      return trimmedLine
    }).join('\n').trim()

    setNotification({ show: true, message: fullMessage, type, memberPhoto, userId })
    // Use 15050ms to ensure animation completes (15s animation + 50ms buffer)
    setTimeout(() => setNotification({ show: false, message: "", type: "", memberPhoto: null, userId: null }), 15050)
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

        // For checkout actions, don't add plan info - session is complete
        const isCheckoutAction = actionType === "auto_checkout" || actionType === "checkout"

        // Add plan info to notification if available (single line, no duplicate)
        // Skip plan info for checkout actions - session is done
        // Check for any existing plan info in message (case-insensitive, check for "Plan:" pattern)
        const hasPlanInfo = /\bplan\s*:/i.test(notificationMessage)
        if (response.data.plan_info && !hasPlanInfo && !isCheckoutAction) {
          const p = response.data.plan_info
          let timeText = "Expired"

          // Check if this is a gym session plan (expires at 9 PM on expiration date)
          const isGymSession = /gym\s+session|day\s+pass|walk[- ]?in/i.test(p.plan_name || '')

          // Always calculate from end_date for accuracy, especially when days_remaining is 0 but hours remain
          const endDateStr = p.end_date || p.expires_on
          if (endDateStr) {
            try {
              const now = new Date()
              let endDate = null

              // For gym sessions, always set expiration to 9 PM on the expiration date
              if (isGymSession) {
                // Try to parse from end_date first (MySQL datetime format)
                if (p.end_date) {
                  const parsedEndDate = new Date(p.end_date)
                  if (!isNaN(parsedEndDate.getTime())) {
                    // Extract just the date part and set to 9 PM
                    const dateOnly = new Date(parsedEndDate.getFullYear(), parsedEndDate.getMonth(), parsedEndDate.getDate())
                    dateOnly.setHours(21, 0, 0, 0) // 9 PM on expiration date
                    endDate = dateOnly
                  }
                }

                // If end_date parsing failed, try expires_on (formatted string like "Jan 26, 2026")
                if (!endDate && p.expires_on) {
                  const parsedExpiresOn = new Date(p.expires_on)
                  if (!isNaN(parsedExpiresOn.getTime())) {
                    // Extract just the date part and set to 9 PM
                    const dateOnly = new Date(parsedExpiresOn.getFullYear(), parsedExpiresOn.getMonth(), parsedExpiresOn.getDate())
                    dateOnly.setHours(21, 0, 0, 0) // 9 PM on expiration date
                    endDate = dateOnly
                  }
                }
              } else {
                // For non-gym sessions, parse normally
                endDate = new Date(endDateStr)
                if (isNaN(endDate.getTime()) && p.expires_on) {
                  endDate = new Date(p.expires_on)
                }
              }

              if (!isNaN(endDate.getTime())) {
                const diffMs = endDate.getTime() - now.getTime()

                console.log("DEBUG: plan_name:", p.plan_name, "isGymSession:", isGymSession)
                console.log("DEBUG: end_date string:", endDateStr, "expires_on:", p.expires_on)
                console.log("DEBUG: parsed endDate:", endDate, "now:", now)
                console.log("DEBUG: diffMs:", diffMs, "diffMs > 0:", diffMs > 0)

                if (diffMs > 0) {
                  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
                  const minutesRemaining = Math.floor(diffMs / (1000 * 60))

                  console.log("DEBUG: daysRemaining:", daysRemaining, "hoursRemaining:", hoursRemaining, "minutesRemaining:", minutesRemaining)

                  if (daysRemaining >= 1) {
                    timeText = `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
                  } else if (isGymSession && hoursRemaining < 1 && minutesRemaining > 0) {
                    // For gym sessions, show minutes when less than 1 hour
                    timeText = `${minutesRemaining} ${minutesRemaining === 1 ? "minute" : "minutes"} left`
                  } else if (hoursRemaining > 0) {
                    timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
                  } else if (minutesRemaining > 0) {
                    timeText = `${minutesRemaining} ${minutesRemaining === 1 ? "minute" : "minutes"} left`
                  } else {
                    timeText = "Expired"
                  }
                } else {
                  console.log("DEBUG: diffMs <= 0, setting to Expired")
                  timeText = "Expired"
                }
              } else {
                console.error("Invalid date format:", endDateStr, p.expires_on)
                // Fallback to days_remaining if date parsing fails
                if (p.days_remaining !== undefined && p.days_remaining >= 0) {
                  if (p.days_remaining >= 1) {
                    timeText = `${p.days_remaining} ${p.days_remaining === 1 ? "day" : "days"} left`
                  } else if (isGymSession) {
                    // For gym sessions with 0 days, calculate hours until 9 PM today
                    const today9PM = new Date()
                    today9PM.setHours(21, 0, 0, 0)
                    const now = new Date()
                    const diffMs = today9PM.getTime() - now.getTime()
                    if (diffMs > 0) {
                      const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
                      const minutesRemaining = Math.floor(diffMs / (1000 * 60))
                      if (hoursRemaining > 0) {
                        timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
                      } else if (minutesRemaining > 0) {
                        timeText = `${minutesRemaining} ${minutesRemaining === 1 ? "minute" : "minutes"} left`
                      } else {
                        timeText = "Expired"
                      }
                    } else {
                      timeText = "Expired"
                    }
                  } else {
                    timeText = "Expired"
                  }
                } else {
                  timeText = "Expired"
                }
              }
            } catch (e) {
              console.error("Error parsing end_date:", e, endDateStr)
              // Fallback to days_remaining if date parsing fails
              if (p.days_remaining !== undefined && p.days_remaining >= 0) {
                if (p.days_remaining >= 1) {
                  timeText = `${p.days_remaining} ${p.days_remaining === 1 ? "day" : "days"} left`
                } else if (isGymSession) {
                  // For gym sessions with 0 days, calculate hours until 9 PM today
                  const today9PM = new Date()
                  today9PM.setHours(21, 0, 0, 0)
                  const now = new Date()
                  const diffMs = today9PM.getTime() - now.getTime()
                  if (diffMs > 0) {
                    const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
                    if (hoursRemaining > 0) {
                      timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
                    } else {
                      timeText = "Expired"
                    }
                  } else {
                    timeText = "Expired"
                  }
                } else {
                  timeText = "Expired"
                }
              } else {
                timeText = "Expired"
              }
            }
          } else {
            // No end_date available, use days_remaining
            if (p.days_remaining !== undefined && p.days_remaining >= 0) {
              if (p.days_remaining >= 1) {
                timeText = `${p.days_remaining} ${p.days_remaining === 1 ? "day" : "days"} left`
              } else if (isGymSession) {
                // For gym sessions with 0 days, calculate hours until 9 PM today
                const today9PM = new Date()
                today9PM.setHours(21, 0, 0, 0)
                const now = new Date()
                const diffMs = today9PM.getTime() - now.getTime()
                if (diffMs > 0) {
                  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
                  if (hoursRemaining > 0) {
                    timeText = `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"} left`
                  } else {
                    timeText = "Expired"
                  }
                } else {
                  timeText = "Expired"
                }
              } else {
                timeText = "Expired"
              }
            }
          }
          // Add plan info without any emojis - improve wording
          // For gym sessions, show better formatting
          if (isGymSession) {
            if (timeText === "Expired") {
              notificationMessage += `\nPlan: ${p.plan_name}  ·  Session expired`
            } else {
              notificationMessage += `\nPlan: ${p.plan_name}  ·  ${timeText} remaining  ·  Expires ${p.expires_on} at 9 PM`
            }
          } else {
            if (timeText === "Expired") {
              notificationMessage += `\nPlan: ${p.plan_name}  ·  Expired`
            } else {
              notificationMessage += `\nPlan: ${p.plan_name}  ·  ${timeText}  ·  Expires ${p.expires_on}`
            }
          }
        }

        // Remove ALL emojis from entire message and remove duplicate plan lines
        // First, remove all emojis (including clipboard emoji U+1F4CB)
        notificationMessage = notificationMessage.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')

        // Now remove duplicate plan lines (normalize separators first)
        const lines = notificationMessage.split('\n')
        let planLineFound = false
        notificationMessage = lines.filter(line => {
          const trimmedLine = line.trim()
          if (/\bplan\s*:/i.test(trimmedLine)) {
            if (planLineFound) {
              return false // Skip duplicate plan lines
            }
            planLineFound = true
            // Normalize separators to consistent format
            return trimmedLine.replace(/\s*[|•·]\s*/g, ' · ').trim()
          }
          return trimmedLine
        }).join('\n').trim()

        const normalizedPhoto = normalizeSystemPhotoUrl(response.data.system_photo_url)
        const uid = response.data.user_id != null ? response.data.user_id : null

        // Show notification based on action type
        if (actionType === "auto_checkout" || actionType === "checkout") {
          // For checkout, just show the message without plan info (already skipped above)
          showNotification(notificationMessage, "info", null, normalizedPhoto, uid)
        } else if (actionType === "auto_checkout_and_checkin") {
          showNotification(notificationMessage, "info", null, normalizedPhoto, uid)
        } else {
          showNotification(notificationMessage, "success", null, normalizedPhoto, uid)
        }

        // Trigger custom event for other components
        window.dispatchEvent(
          new CustomEvent("qr-scan-success", {
            detail: { data: cleanedData, response: response.data },
          }),
        )
      } else {
        // Extract member name from response or fetch from API
        let memberName = "Unknown"
        let memberId = null

        // First, check for user_name in response (backend returns this)
        if (response.data && response.data.user_name) {
          memberName = response.data.user_name
        } else if (response.data && response.data.member_name) {
          // Fallback to member_name if it exists
          memberName = response.data.member_name
        } else {
          // Try to extract member ID from QR data
          if (cleanedData) {
            if (cleanedData.includes(':')) {
              // Try to extract from QR data format: CNERGY_ATTENDANCE:ID
              const parts = cleanedData.split(':')
              if (parts.length > 1) {
                memberId = parts[1].trim()
              }
            } else if (/^\d+$/.test(cleanedData.trim())) {
              // QR data is just a numeric ID
              memberId = cleanedData.trim()
            }
          }

          // If we only have member ID, fetch the member name from API
          if (memberId) {
            try {
              const membersResponse = await axios.get("https://api.cnergy.site/attendance.php?action=members")
              const members = membersResponse.data || []
              const member = members.find(m => m.id === parseInt(memberId))
              if (member) {
                memberName = `${member.fname || ''} ${member.lname || ''}`.trim()
                // If still empty after trimming, fallback to Member ID
                if (!memberName) {
                  memberName = `Member ID: ${memberId}`
                }
              } else {
                memberName = `Member ID: ${memberId}`
              }
            } catch (err) {
              console.error("Failed to fetch member name:", err)
              memberName = `Member ID: ${memberId}`
            }
          }
        }

        let errorMessage = (response.data && response.data.message) ? response.data.message : "Failed to process QR code"
        const errorType = (response.data && response.data.type) ? response.data.type : "unknown"

        // Format error message consistently based on type
        if (errorType === "no_plan") {
          errorMessage = `${memberName} - No active subscription`
        } else if (errorType === "expired_plan") {
          // Extract expiration date from message if available
          const dateMatch = (response.data.message || "").match(/(\w+\s+\d{1,2},\s+\d{4})/i)
          if (dateMatch) {
            errorMessage = `${memberName} - Subscription expired on ${dateMatch[1]}`
          } else {
            errorMessage = `${memberName} - Subscription has expired`
          }
        } else if (errorType === "guest_expired") {
          errorMessage = `${memberName} - Guest session has expired`
        } else if (errorType === "guest_error") {
          errorMessage = `${memberName} - Guest session error`
        }

        // Only log subscription-related denials (no_plan, expired_plan, guest errors)
        // Don't log: already_attended_today, already_checked_in, cooldown, etc.
        // Note: Backend automatically logs denied attempts to database, no need for localStorage
        if (errorType === "no_plan" || errorType === "expired_plan" || errorType === "guest_expired" || errorType === "guest_error") {
          console.log("✅ Denied attendance logged to database by backend:", { memberName, errorType, entryMethod: "qr" })
        }

        // Get member photo URL for error toasts (only system_photo_url)
        const normalizedPhoto = normalizeSystemPhotoUrl(response.data.system_photo_url)

        const uid = response.data.user_id != null ? response.data.user_id : null
        // Handle plan validation errors with better messages
        if (response.data.type === "expired_plan") {
          const name = memberName !== "Unknown" ? memberName : "This member"
          const msg = `${name} — Subscription expired. Ask them to renew.`
          showNotification(msg, "error", null, normalizedPhoto, uid)
        }
        else if (response.data.type === "no_plan") {
          const name = memberName !== "Unknown" ? memberName : "This member"
          showNotification(`Ask ${name} to purchase a gym access subscription plan.`, "error", null, normalizedPhoto, uid)
        }
        // Handle cooldown errors
        else if (response.data.type === "cooldown") {
          showNotification(response.data.message, "warning", null, normalizedPhoto, uid)
        }
        // Handle attendance limit errors (show member image when available)
        else if (response.data.type === "already_checked_in") {
          showNotification(response.data.message, "warning", null, normalizedPhoto, uid)
        }
        else if (response.data.type === "already_attended_today") {
          showNotification(response.data.message, "info", null, normalizedPhoto, uid)
        }
        // Handle session conflict errors
        else if (response.data.type === "session_conflict") {
          showNotification(response.data.message, "error", null, normalizedPhoto, uid)
        } else {
          showNotification(response.data.message || "Failed to process QR code", "error", null, normalizedPhoto, uid)
        }
      }
      setIsConnected(true)
    } catch (err) {
      setIsConnected(false)
      // Don't log network errors to denied attendance log - only subscription-related denials
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
      if (!event || typeof event.key !== "string") {
        return
      }
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

      {/* Modern Enhanced Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-lg z-[9999] animate-in slide-in-from-top-2 fade-in-0 duration-300" style={{ isolation: "isolate" }}>
          <div
            className={
              notification.type === "error"
                ? "relative rounded-2xl overflow-hidden bg-red-50/95 border border-red-200/60 shadow-lg shadow-red-900/5"
                : notification.type === "warning"
                  ? "relative rounded-2xl overflow-hidden bg-amber-50/95 border border-amber-200/60 shadow-lg shadow-amber-900/5"
                  : "relative rounded-2xl overflow-hidden bg-emerald-50/95 border border-emerald-200/60 shadow-lg shadow-emerald-900/5"
            }
          >
            <div className="relative flex flex-col">
              <div className="flex items-start gap-4 p-5">
                {notification.memberPhoto ? (
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-white/80 shadow-sm ring-1 ring-black/5">
                    <img src={notification.memberPhoto} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; const n = e.target.nextElementSibling; if (n) n.style.display = "flex" }} />
                    <div className="w-full h-full flex items-center justify-center hidden bg-gray-100">
                      {notification.type === "error" ? <AlertCircle className="w-6 h-6 text-red-500" /> : notification.type === "warning" ? <Clock className="w-6 h-6 text-amber-600" /> : <CheckCircle className="w-6 h-6 text-emerald-600" />}
                    </div>
                  </div>
                ) : (
                  <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl ${notification.type === "error" ? "bg-red-100/80" : notification.type === "warning" ? "bg-amber-100/80" : "bg-emerald-100/80"}`}>
                    {notification.type === "error" ? <AlertCircle className="w-6 h-6 text-red-500" /> : notification.type === "warning" ? <Clock className="w-6 h-6 text-amber-600" /> : <CheckCircle className="w-6 h-6 text-emerald-600" />}
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-[15px] font-medium leading-snug whitespace-pre-line break-words ${notification.type === "error" ? "text-red-900/90" : notification.type === "warning" ? "text-amber-900/90" : "text-emerald-900/90"}`} dangerouslySetInnerHTML={{ __html: notification.message.replace(/₱/g, "&#8369;") }} />
                </div>
              </div>

              {notification.userId != null && (
                <div className="px-5 pb-4 pt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const uid = notification.userId
                      if (uid == null || uid === "") return
                      try {
                        sessionStorage.setItem("openSubscriptionDetailsUserId", String(uid))
                        window.dispatchEvent(new CustomEvent("open-subscription-details-for-user", { detail: { userId: uid } }))
                      } finally {
                        setNotification({ show: false, message: "", type: "", memberPhoto: null, userId: null })
                      }
                    }}
                    className={`
                      w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98]
                      ${notification.type === "error"
                        ? "bg-red-100/80 border border-red-200/70 text-red-800 hover:bg-red-200/80"
                        : notification.type === "warning"
                          ? "bg-amber-100/80 border border-amber-200/70 text-amber-800 hover:bg-amber-200/80"
                          : "bg-emerald-100/80 border border-emerald-200/70 text-emerald-800 hover:bg-emerald-200/80"
                      }
                    `}
                  >
                    <Eye className="w-4 h-4 shrink-0 opacity-80" />
                    View details
                  </button>
                </div>
              )}
            </div>

            <div className="h-1 bg-black/5 overflow-hidden">
              <div
                className={`h-full ${notification.type === "error" ? "bg-red-400/70" : notification.type === "warning" ? "bg-amber-400/70" : "bg-emerald-400/70"}`}
                style={{ width: "100%", animation: "toast-shrink 15s linear forwards", animationFillMode: "forwards" }}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes toast-shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>

      {/* Main Content */}
      <ErrorBoundary>
        <AdminDashboardClient />
      </ErrorBoundary>
    </div>
  )
}

export default App