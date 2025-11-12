"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Camera, CheckCircle, AlertCircle, RefreshCw, Clock, Users, UserCheck, Filter, Calendar, BarChart3, Trash2, ClipboardList, Activity, ChevronLeft, ChevronRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

const AttendanceTracking = ({ userId }) => {
  const { toast } = useToast()
  const [manualOpen, setManualOpen] = useState(false)
  const [failedScansOpen, setFailedScansOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [manualSearchQuery, setManualSearchQuery] = useState("")
  const [attendance, setAttendance] = useState([])
  const [members, setMembers] = useState([])
  const [lastScanTime, setLastScanTime] = useState(0)
  const [notification, setNotification] = useState({ show: false, message: "", type: "", hideIcon: false })
  const [loading, setLoading] = useState(false)
  const [failedScans, setFailedScans] = useState([])
  const [filterType, setFilterType] = useState("all") // "all", "members", "guests"
  const [selectedMonth, setSelectedMonth] = useState("all-time") // Month filter (YYYY-MM format or "all-time")
  const [selectedDate, setSelectedDate] = useState("") // Day filter (YYYY-MM-DD format)
  const [quickFilter, setQuickFilter] = useState("today") // "today", "yesterday", "last-week", "last-month", "all-time"
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20) // Number of items per page

  // Helper function to format datetime to PH timezone
  const formatToPHTime = (dateTimeStr) => {
    if (!dateTimeStr || dateTimeStr.includes("Still in gym")) {
      return dateTimeStr || "Still in gym"
    }

    try {
      let date

      // Handle different datetime formats from the API
      // Format 1: ISO datetime string "2025-11-13 07:59:00" or "2025-11-13T07:59:00"
      if (dateTimeStr.match(/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/)) {
        // The database stores times in PH timezone (UTC+8)
        // When we get "2025-11-13 07:59:00", it's already in PH time
        // We need to parse it correctly - treat it as if it's in PH timezone
        const isoStr = dateTimeStr.replace(' ', 'T')

        // If no timezone specified, the API is returning PH time but without timezone info
        // We need to manually adjust: if it's stored as PH time, we add +08:00
        // OR we can use a library, but for now let's parse it as UTC and then adjust
        // Actually, better approach: parse the components and create date in PH timezone
        const match = dateTimeStr.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/)
        if (match) {
          const [, year, month, day, hour, minute, second] = match
          // Create date in UTC, then format it as PH time (which will show the same time)
          // Since the time is already in PH time, we just need to format it correctly
          date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`)
        } else {
          date = new Date(isoStr)
        }
      }
      // Format 2: Already formatted like "Nov 13, 2025 7:59 AM"
      else if (dateTimeStr.match(/^[A-Za-z]{3} \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M/)) {
        // Parse the formatted string
        date = new Date(dateTimeStr)
      }
      // Format 3: Try generic Date parsing
      else {
        date = new Date(dateTimeStr)
      }

      if (isNaN(date.getTime())) {
        // If parsing fails, return as is
        console.warn("Could not parse datetime:", dateTimeStr)
        return dateTimeStr
      }

      // Format to PH timezone (Asia/Manila)
      // This ensures the time is displayed correctly in PH timezone
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date)
    } catch (error) {
      console.error("Error formatting time:", dateTimeStr, error)
      return dateTimeStr
    }
  }

  // Helper function to parse date from various formats
  const parseDateFromEntry = (entry) => {
    // Try different date fields
    let dateStr = entry.date || entry.check_in || entry.timestamp || entry.created_at

    if (!dateStr) return null

    // Handle different date formats
    try {
      // If it's already in YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        return dateStr.substring(0, 10)
      }

      // If it's in "Oct 24, 2025" format
      if (dateStr.match(/^[A-Za-z]{3} \d{1,2}, \d{4}/)) {
        const date = new Date(dateStr)
        return date.toISOString().substring(0, 10)
      }

      // If it's in "Oct 24, 2025 11:17 PM" format
      if (dateStr.match(/^[A-Za-z]{3} \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M/)) {
        const date = new Date(dateStr)
        return date.toISOString().substring(0, 10)
      }

      // If it's a full datetime string
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().substring(0, 10)
      }

      return null
    } catch (error) {
      console.error("Error parsing date:", dateStr, error)
      return null
    }
  }

  // Helper function to get date range for quick filters
  const getQuickFilterDateRange = () => {
    const now = new Date()
    const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))

    switch (quickFilter) {
      case "today": {
        const today = phTime.toISOString().split('T')[0]
        return { start: today, end: today }
      }
      case "yesterday": {
        const yesterday = new Date(phTime)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        return { start: yesterdayStr, end: yesterdayStr }
      }
      case "last-week": {
        const lastWeekEnd = new Date(phTime)
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1) // Yesterday
        const lastWeekStart = new Date(lastWeekEnd)
        lastWeekStart.setDate(lastWeekStart.getDate() - 6) // 7 days ago
        return {
          start: lastWeekStart.toISOString().split('T')[0],
          end: lastWeekEnd.toISOString().split('T')[0]
        }
      }
      case "last-month": {
        const lastMonthEnd = new Date(phTime)
        lastMonthEnd.setDate(lastMonthEnd.getDate() - 1) // Yesterday
        const lastMonthStart = new Date(lastMonthEnd)
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
        lastMonthStart.setDate(1) // First day of last month
        return {
          start: lastMonthStart.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        }
      }
      case "all-time":
      default:
        return null
    }
  }

  // Filter attendance based on type (date filtering is done server-side)
  const getFilteredAttendance = () => {
    let filtered = attendance.filter((entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Apply quick filter first (if not "all-time" and no specific date/month filters)
    const hasSpecificFilters = selectedDate || (selectedMonth && selectedMonth !== "all-time")

    if (!hasSpecificFilters && quickFilter !== "all-time") {
      const dateRange = getQuickFilterDateRange()
      if (dateRange) {
        filtered = filtered.filter((entry) => {
          const entryDate = parseDateFromEntry(entry)
          if (!entryDate) return false
          return entryDate >= dateRange.start && entryDate <= dateRange.end
        })
      }
    }

    // Apply date filter (specific day) - takes priority over quick filter
    if (selectedDate) {
      filtered = filtered.filter((entry) => {
        const entryDate = parseDateFromEntry(entry)
        console.log("🔍 Debug - Day filter - Entry:", entry.name, "Parsed date:", entryDate, "Selected:", selectedDate)
        return entryDate === selectedDate
      })
    }
    // Apply month filter (entire month) - takes priority over quick filter
    else if (selectedMonth && selectedMonth !== "all-time") {
      filtered = filtered.filter((entry) => {
        const entryDate = parseDateFromEntry(entry)
        console.log("🔍 Debug - Month filter - Entry:", entry.name, "Parsed date:", entryDate, "Selected month:", selectedMonth)
        if (entryDate) {
          const entryMonth = entryDate.substring(0, 7) // Get YYYY-MM part
          console.log("🔍 Debug - Comparing months:", entryMonth, "vs", selectedMonth)
          return entryMonth === selectedMonth
        }
        return false
      })
    }

    // Filter by user type
    if (filterType === "premium") {
      filtered = filtered.filter(entry => {
        if (entry.user_type !== "member") return false
        // Check is_premium flag or plan_id
        if (entry.is_premium === true || entry.plan_id === 2) return true
        // Fallback: check plan_name
        const planName = (entry.plan_name || "").toLowerCase()
        return planName.includes("premium")
      })
    } else if (filterType === "standard") {
      filtered = filtered.filter(entry => {
        if (entry.user_type !== "member") return false
        // Check is_standard flag or plan_id
        if (entry.is_standard === true || entry.plan_id === 3) return true
        // Fallback: check plan_name
        const planName = (entry.plan_name || "").toLowerCase()
        return planName.includes("standard") && !planName.includes("premium")
      })
    } else if (filterType === "guests") {
      filtered = filtered.filter(entry => entry.user_type === "guest")
    }

    console.log("🔍 Debug - Final filtered count:", filtered.length)
    return filtered
  }

  // Load members and attendance data
  const fetchData = async () => {
    setLoading(true)
    try {
      const attendanceUrl = "https://api.cnergy.site/attendance.php?action=attendance"

      const [membersRes, attendanceRes] = await Promise.all([
        axios.get("https://api.cnergy.site/attendance.php?action=members"),
        axios.get(attendanceUrl),
      ])

      console.log("🔍 Debug - Raw attendance data:", attendanceRes.data)
      console.log("🔍 Debug - Sample entry:", attendanceRes.data[0])

      setMembers(membersRes.data)
      setAttendance(attendanceRes.data)
    } catch (err) {
      console.error("Failed to load data", err)
      showNotification("Failed to load data", "error", true)
    } finally {
      setLoading(false)
    }
  }

  const loadFailedScans = async () => {
    const stored = localStorage.getItem('failedQrScans')
    if (stored) {
      let scans = JSON.parse(stored)

      // Resolve member names for entries that only have "Member ID: X"
      const needsResolution = scans.filter(scan =>
        scan.memberName && scan.memberName.startsWith("Member ID: ")
      )

      if (needsResolution.length > 0) {
        try {
          const membersResponse = await axios.get("https://api.cnergy.site/attendance.php?action=members")
          const members = membersResponse.data || []

          scans = scans.map(scan => {
            if (scan.memberName && scan.memberName.startsWith("Member ID: ")) {
              const memberId = parseInt(scan.memberName.replace("Member ID: ", ""))
              const member = members.find(m => m.id === memberId)
              if (member) {
                const fullName = `${member.fname || ''} ${member.lname || ''}`.trim()
                if (fullName) {
                  // Also update the error message if it contains the member ID
                  let updatedMessage = scan.message
                  if (updatedMessage && updatedMessage.includes(`Member ID: ${memberId}`)) {
                    updatedMessage = updatedMessage.replace(`Member ID: ${memberId}`, fullName)
                  }
                  return { ...scan, memberName: fullName, message: updatedMessage }
                }
              }
            }
            return scan
          })

          // Update localStorage with resolved names
          localStorage.setItem('failedQrScans', JSON.stringify(scans))
        } catch (err) {
          console.error("Failed to resolve member names:", err)
        }
      }

      setFailedScans(scans)
    } else {
      setFailedScans([])
    }
  }

  const clearFailedScans = () => {
    localStorage.removeItem('failedQrScans')
    setFailedScans([])
  }

  const openFailedScansDialog = () => {
    loadFailedScans()
    setFailedScansOpen(true)
  }

  // Helper function to log denied attendance attempts
  const logDeniedAttempt = (memberName, errorType, errorMessage, entryMethod = "manual") => {
    const deniedAttempt = {
      timestamp: new Date().toISOString(),
      type: errorType || "unknown",
      message: errorMessage || "Access denied",
      memberName: memberName || "Unknown",
      entryMethod: entryMethod // "manual" or "qr"
    }

    // Get existing denied attempts from localStorage
    const existingFailures = JSON.parse(localStorage.getItem('failedQrScans') || '[]')
    existingFailures.unshift(deniedAttempt) // Add to beginning
    // Store all denied attempts (no limit)
    localStorage.setItem('failedQrScans', JSON.stringify(existingFailures))
  }

  // Helper function to show notifications
  const showNotification = (message, type = "success", hideIcon = false) => {
    setNotification({ show: true, message, type, hideIcon })
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "", hideIcon: false })
    }, 5000)
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [])

  // Refetch data when month or date filter changes
  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedDate])

  // Listen for global QR scan events and auto-refresh
  useEffect(() => {
    const handleQrScanSuccess = (event) => {
      console.log("🔄 QR scan detected, refreshing attendance data...")
      fetchData() // Auto-refresh when QR scan succeeds
    }

    // Listen for the custom event dispatched by the global scanner
    window.addEventListener("qr-scan-success", handleQrScanSuccess)

    return () => {
      window.removeEventListener("qr-scan-success", handleQrScanSuccess)
    }
  }, [])

  // Listen for global modal events for guest session notifications
  useEffect(() => {
    const handleGlobalModal = (event) => {
      const { type, message, guestName, expiredAt } = event.detail

      if (type === "guest_expired") {
        // Show global modal for expired guest sessions
        window.dispatchEvent(new CustomEvent("show-global-modal", {
          detail: {
            title: "Guest Session Expired",
            message: `${guestName}'s guest session has expired at ${expiredAt}. Please inform the guest to purchase a new session.`,
            type: "error",
            show: true
          }
        }))
      }
    }

    window.addEventListener("guest-session-expired", handleGlobalModal)
    return () => {
      window.removeEventListener("guest-session-expired", handleGlobalModal)
    }
  }, [])

  // Auto-refresh every 30 seconds to keep data current
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Handle manual attendance entry
  const handleManualEntry = async (member) => {
    try {
      const response = await axios.post(`https://api.cnergy.site/attendance.php`, {
        action: 'qr_scan',
        qr_data: `CNERGY_ATTENDANCE:${member.id}`,
        staff_id: userId
      })
      if (response.data.success) {
        // Show success toast for manual entry
        const memberName = `${member.fname} ${member.lname}`
        const actionType = response.data.action

        // Close manual entry dialog and clear search
        setManualOpen(false)
        setManualSearchQuery("")

        // Determine if it's check-in or check-out based on action type
        const isCheckOut = actionType === "auto_checkout" || actionType === "auto_checkout_and_checkin"

        // Show appropriate toast
        toast({
          title: isCheckOut ? "Checked Out Successfully" : "Checked In Successfully",
          description: isCheckOut
            ? `${memberName} has been successfully checked out.`
            : `${memberName} has been successfully checked in.`,
          className: "border-green-200 bg-green-50 text-green-900",
        })

        // Fetch fresh data - API now returns correct checkout times
        await fetchData()
      } else {
        // Get member name for logging
        const memberName = response.data.member_name || `${member.fname} ${member.lname}`
        const errorType = response.data.type || "unknown"
        let errorMessage = response.data.message || "Failed to record attendance"

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
        if (errorType === "no_plan" || errorType === "expired_plan" || errorType === "guest_expired" || errorType === "guest_error") {
          logDeniedAttempt(memberName, errorType, errorMessage, "manual")
        }

        // Handle plan validation errors with toast notifications
        if (response.data.type === "expired_plan") {
          toast({
            title: "Subscription Expired",
            description: `${memberName} - Subscription has expired. Please ask them to renew their subscription.`,
            variant: "destructive",
          })
        }
        else if (response.data.type === "no_plan") {
          toast({
            title: "No Active Subscription",
            description: `${memberName} - No active subscription found. Please ask them to purchase a subscription.`,
            variant: "destructive",
          })
        }
        // Handle cooldown errors
        else if (response.data.type === "cooldown") {
          toast({
            title: "Cooldown Period",
            description: response.data.message || "Please wait before trying again.",
            className: "border-orange-200 bg-orange-50 text-orange-900",
          })
        }
        // Handle attendance limit errors
        else if (response.data.type === "already_checked_in") {
          toast({
            title: "Already Checked In",
            description: response.data.message || "This member is already checked in.",
            className: "border-orange-200 bg-orange-50 text-orange-900",
          })
        }
        else if (response.data.type === "already_attended_today") {
          // Get checkout time from response data (prefer check_out_time or checkout_time field)
          let checkoutTime = response.data.check_out_time || response.data.checkout_time

          // If not in response, try to extract from message
          if (!checkoutTime) {
            const checkoutMatch = response.data.message?.match(/checked out at (.+?)(?:\)|$)/i)
            if (checkoutMatch) {
              checkoutTime = checkoutMatch[1].trim()
            }
          }

          // Format checkout time if we have it
          let description = "Attendance already completed for today."
          if (checkoutTime) {
            // If it's a datetime string, format it to PH time
            try {
              const date = new Date(checkoutTime)
              if (!isNaN(date.getTime())) {
                // Format to PH timezone (Asia/Manila)
                const phTime = new Intl.DateTimeFormat('en-US', {
                  timeZone: 'Asia/Manila',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }).format(date)
                description = `Attendance already completed today (checked out at ${phTime})`
              } else {
                // If it's already a formatted string, use it as is
                description = `Attendance already completed today (checked out at ${checkoutTime})`
              }
            } catch (e) {
              // If parsing fails, use the raw value
              description = `Attendance already completed today (checked out at ${checkoutTime})`
            }
          } else {
            description = response.data.message || "Attendance already completed for today."
          }

          toast({
            title: "Attendance Completed",
            description: description,
            className: "border-green-200 bg-green-50 text-green-900",
          })
        }
        // Handle session conflict errors
        else if (response.data.type === "session_conflict") {
          toast({
            title: "Session Conflict",
            description: response.data.message || "There is a conflict with the current session.",
            variant: "destructive",
          })
        }
        // Handle guest session specific errors
        else if (response.data.type === "guest_expired") {
          toast({
            title: "Guest Session Expired",
            description: response.data.message || "The guest session has expired.",
            variant: "destructive",
          })
          // Trigger global modal for expired guest sessions
          window.dispatchEvent(new CustomEvent("guest-session-expired", {
            detail: {
              type: "guest_expired",
              message: response.data.message,
              guestName: response.data.guest_name,
              expiredAt: response.data.expired_at
            }
          }))
        } else if (response.data.type === "guest_error") {
          toast({
            title: "Guest Session Error",
            description: response.data.message || "An error occurred with the guest session.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: response.data.message || "Failed to record attendance. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (err) {
      console.error("Failed to record attendance", err)
      toast({
        title: "Error",
        description: "Failed to record attendance. Please check your connection and try again.",
        variant: "destructive",
      })
    }
    setManualOpen(false)
  }

  // Get period label based on filters
  const getPeriodLabel = () => {
    // Check if specific date/month filters are applied (they take priority)
    const hasSpecificFilters = selectedDate || (selectedMonth && selectedMonth !== "all-time")

    // If specific filters are applied, use those
    if (selectedDate) {
      const date = new Date(selectedDate)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    if (selectedMonth && selectedMonth !== "all-time") {
      const monthDate = new Date(selectedMonth + "-01")
      return monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    // Otherwise, use quick filter label
    switch (quickFilter) {
      case "today":
        return "Today"
      case "yesterday":
        return "Yesterday"
      case "last-week":
        return "Last Week"
      case "last-month":
        return "Last Month"
      case "all-time":
      default:
        return "All Time"
    }
  }

  // Get today's attendance (unfiltered by date)
  const getTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0]
    return attendance.filter(entry => {
      const entryDate = parseDateFromEntry(entry)
      return entryDate === today
    })
  }

  // Calculate analytics from attendance data
  const calculateAnalytics = () => {
    const filtered = getFilteredAttendance()

    // For total, use filtered data (which already respects quick filter and specific filters)
    const total = filtered.length

    // Premium members: members with is_premium flag or plan_name/plan_id indicating premium
    const premium = filtered.filter(e => {
      if (e.user_type !== "member") return false
      // Check is_premium flag first (from API)
      if (e.is_premium === true) return true
      // Fallback: check plan_id (2 = premium) or plan_name
      if (e.plan_id === 2) return true
      const planName = (e.plan_name || "").toLowerCase()
      return planName.includes("premium")
    }).length

    // Standard users: members with is_standard flag or plan_name/plan_id indicating standard
    const standard = filtered.filter(e => {
      if (e.user_type !== "member") return false
      // Check is_standard flag first (from API)
      if (e.is_standard === true) return true
      // Fallback: check plan_id (3 = standard) or plan_name
      if (e.plan_id === 3) return true
      const planName = (e.plan_name || "").toLowerCase()
      return planName.includes("standard") && !planName.includes("premium")
    }).length

    // Day Pass users: guests
    const dayPass = filtered.filter(e => e.user_type === "guest").length

    const active = filtered.filter(e => !e.check_out || e.check_out.includes("Still in gym")).length

    // Calculate peak hour
    const hourCounts = {}
    filtered.forEach(entry => {
      const timeStr = entry.check_in || entry.timestamp || entry.created_at
      if (timeStr) {
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
        if (timeMatch) {
          let hour24 = parseInt(timeMatch[1])
          const ampm = timeMatch[3].toUpperCase()
          if (ampm === 'PM' && hour24 !== 12) hour24 += 12
          if (ampm === 'AM' && hour24 === 12) hour24 = 0
          const hour = hour24.toString().padStart(2, '0')
          hourCounts[hour] = (hourCounts[hour] || 0) + 1
        }
      }
    })
    const peakHour = Object.keys(hourCounts).length > 0
      ? (() => {
        const peakHour24 = parseInt(Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b))
        let hour12 = peakHour24
        let ampm = "AM"
        if (peakHour24 === 0) hour12 = 12
        else if (peakHour24 >= 12) {
          ampm = "PM"
          if (peakHour24 > 12) hour12 = peakHour24 - 12
        }
        return `${hour12}:00 ${ampm}`
      })()
      : "N/A"

    return { total, premium, standard, dayPass, active, peakHour }
  }

  const analytics = calculateAnalytics()

  // Pagination logic
  const filteredAttendance = getFilteredAttendance()
  const totalPages = Math.max(1, Math.ceil(filteredAttendance.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAttendance = filteredAttendance.slice(startIndex, endIndex)

  // Debug logging
  useEffect(() => {
    console.log("📊 Pagination Debug:", {
      totalEntries: attendance.length,
      filteredEntries: filteredAttendance.length,
      itemsPerPage,
      totalPages,
      currentPage,
      startIndex,
      endIndex,
      showingEntries: paginatedAttendance.length,
      quickFilter,
      filterType,
      selectedMonth,
      selectedDate
    })
  }, [filteredAttendance.length, currentPage, itemsPerPage, quickFilter, filterType, selectedMonth, selectedDate])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterType, selectedMonth, selectedDate, quickFilter])

  return (
    <div className="w-full max-w-[99.5%] mx-auto p-4 space-y-4">
      {/* Notification */}
      {notification.show && (
        <Alert
          className={`
            ${notification.type === "error"
              ? "border-red-500 bg-red-50"
              : notification.type === "warning"
                ? "border-orange-500 bg-orange-50"
                : "border-green-500 bg-green-50"
            }
          `}
        >
          {!notification.hideIcon && (
            notification.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : notification.type === "warning" ? (
              <Clock className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )
          )}
          <AlertDescription
            className={
              notification.type === "error"
                ? "text-red-800"
                : notification.type === "warning"
                  ? "text-orange-800"
                  : "text-green-800"
            }
          >
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card className="border-0 shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/60 px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-md">
                <ClipboardList className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-1">
                  Attendance Logs
                  <Badge variant="outline" className="ml-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-300 font-semibold shadow-sm">
                    {analytics.active} active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-600 font-medium">Monitor gym attendance and track check-ins</CardDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchData} variant="outline" size="sm" className="shadow-md hover:shadow-lg hover:bg-slate-50 transition-all border-slate-300" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                <DialogTrigger asChild>
                  <button
                    style={{
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: 'none'
                    }}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold h-9 px-4 shadow-lg hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#111827'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#000000'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Manual Entry
                  </button>
                </DialogTrigger>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={openFailedScansDialog}
                className="shadow-md hover:shadow-lg hover:bg-slate-50 transition-all border-slate-300"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Denied Log
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-slate-50/30">
          {/* Analytics Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total ({getPeriodLabel()})</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.total}</div>
                <p className="text-xs text-slate-500 mt-1">Attendance records</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Premium</CardTitle>
                <UserCheck className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.premium}</div>
                <p className="text-xs text-slate-500 mt-1">Premium member check-ins</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Standard</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.standard}</div>
                <p className="text-xs text-slate-500 mt-1">Standard user check-ins</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Day Pass</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.dayPass}</div>
                <p className="text-xs text-slate-500 mt-1">Day pass check-ins</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.active}</div>
                <p className="text-xs text-slate-500 mt-1">Currently in gym</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Peak Hour</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.peakHour}</div>
                <p className="text-xs text-slate-500 mt-1">Most active time</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Row */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
            <div className="flex items-center gap-3 flex-nowrap overflow-x-auto">
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search members, emails, or names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-56 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                />
              </div>
              <Label htmlFor="user-type-filter" className="flex-shrink-0 whitespace-nowrap">Type:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 flex-shrink-0" id="user-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="guests">Day Pass</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="quick-filter" className="flex-shrink-0 whitespace-nowrap">Quick Filter:</Label>
              <Select value={quickFilter} onValueChange={(value) => {
                setQuickFilter(value)
                // Clear specific filters when quick filter changes
                setSelectedDate("")
                setSelectedMonth("all-time")
              }}>
                <SelectTrigger className="w-36 flex-shrink-0" id="quick-filter">
                  <SelectValue placeholder="Today" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="month-filter" className="flex-shrink-0 whitespace-nowrap">Month:</Label>
              <Select value={selectedMonth} onValueChange={(value) => {
                setSelectedMonth(value)
                setSelectedDate("")
                setQuickFilter("all-time") // Reset quick filter when using specific filters
              }}>
                <SelectTrigger className="w-40 flex-shrink-0" id="month-filter">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-time">All Months</SelectItem>
                  <SelectItem value="2025-01">January 2025</SelectItem>
                  <SelectItem value="2025-02">February 2025</SelectItem>
                  <SelectItem value="2025-03">March 2025</SelectItem>
                  <SelectItem value="2025-04">April 2025</SelectItem>
                  <SelectItem value="2025-05">May 2025</SelectItem>
                  <SelectItem value="2025-06">June 2025</SelectItem>
                  <SelectItem value="2025-07">July 2025</SelectItem>
                  <SelectItem value="2025-08">August 2025</SelectItem>
                  <SelectItem value="2025-09">September 2025</SelectItem>
                  <SelectItem value="2025-10">October 2025</SelectItem>
                  <SelectItem value="2025-11">November 2025</SelectItem>
                  <SelectItem value="2025-12">December 2025</SelectItem>
                  <SelectItem value="2024-01">January 2024</SelectItem>
                  <SelectItem value="2024-02">February 2024</SelectItem>
                  <SelectItem value="2024-03">March 2024</SelectItem>
                  <SelectItem value="2024-04">April 2024</SelectItem>
                  <SelectItem value="2024-05">May 2024</SelectItem>
                  <SelectItem value="2024-06">June 2024</SelectItem>
                  <SelectItem value="2024-07">July 2024</SelectItem>
                  <SelectItem value="2024-08">August 2024</SelectItem>
                  <SelectItem value="2024-09">September 2024</SelectItem>
                  <SelectItem value="2024-10">October 2024</SelectItem>
                  <SelectItem value="2024-11">November 2024</SelectItem>
                  <SelectItem value="2024-12">December 2024</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="day-filter" className="flex-shrink-0 whitespace-nowrap">Day:</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setSelectedMonth("all-time")
                  setQuickFilter("all-time") // Reset quick filter when using specific filters
                }}
                className="w-36 flex-shrink-0 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                id="day-filter"
              />
            </div>
          </div>

          {/* Attendance Table */}
          <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 z-10">
                  <TableRow className="border-b-2 border-slate-200">
                    <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                    <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Type</TableHead>
                    <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Check In</TableHead>
                    <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Check Out</TableHead>
                    <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Duration</TableHead>
                    <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {loading ? "Loading attendance records..." : "No attendance records found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAttendance.map((entry, index) => (
                      <TableRow key={`${entry.user_type}-${entry.id}-${index}`} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
                        <TableCell className="font-medium text-slate-900">{entry.name}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${entry.user_type === "guest"
                              ? "bg-blue-100 text-blue-800"
                              : (() => {
                                // Check is_premium/is_standard flags first
                                if (entry.is_premium === true || entry.plan_id === 2) {
                                  return "bg-yellow-100 text-yellow-800"
                                } else if (entry.is_standard === true || entry.plan_id === 3) {
                                  return "bg-gray-100 text-gray-800"
                                }
                                // Fallback: check plan_name
                                const planName = (entry.plan_name || "").toLowerCase()
                                if (planName.includes("premium")) {
                                  return "bg-yellow-100 text-yellow-800"
                                } else if (planName.includes("standard")) {
                                  return "bg-gray-100 text-gray-800"
                                }
                                // Default to standard if we can't determine (shouldn't happen, but safety)
                                return "bg-gray-100 text-gray-800"
                              })()
                              }`}
                          >
                            {entry.user_type === "guest"
                              ? "Day Pass"
                              : (() => {
                                // Check is_premium/is_standard flags first
                                if (entry.is_premium === true || entry.plan_id === 2) {
                                  return "Premium"
                                } else if (entry.is_standard === true || entry.plan_id === 3) {
                                  return "Standard"
                                }
                                // Fallback: check plan_name
                                const planName = (entry.plan_name || "").toLowerCase()
                                if (planName.includes("premium")) {
                                  return "Premium"
                                } else if (planName.includes("standard")) {
                                  return "Standard"
                                }
                                // Default to standard if we can't determine (shouldn't happen, but safety)
                                return "Standard"
                              })()
                            }
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{formatToPHTime(entry.check_in)}</TableCell>
                        <TableCell className="text-sm text-slate-600">{formatToPHTime(entry.check_out) || "Still in gym"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{entry.duration || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${entry.check_out && !entry.check_out.includes("Still in gym")
                              ? "bg-gray-100 text-gray-800"
                              : "bg-green-100 text-green-800"
                              }`}
                          >
                            {entry.check_out && !entry.check_out.includes("Still in gym") ? "Completed" : "Active"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            {filteredAttendance.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white">
                <div className="text-sm text-slate-500">
                  {filteredAttendance.length} {filteredAttendance.length === 1 ? 'entry' : 'entries'} total
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Member Entry Dialog */}
      <Dialog open={manualOpen} onOpenChange={(open) => {
        setManualOpen(open)
        if (!open) {
          setManualSearchQuery("")
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[800px] mx-auto [&>button]:hidden">
          <DialogHeader className="border-b pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
                <UserCheck className="h-5 w-5 text-slate-700" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">Manual Attendance Entry</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 mt-2">
              Search and select a member to record their attendance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                className="pl-10 border-slate-300 focus:border-slate-400 focus:ring-slate-400"
              />
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                {members
                  .filter((m) => `${m.fname} ${m.lname}`.toLowerCase().includes(manualSearchQuery.toLowerCase()))
                  .length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No members found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {members
                      .filter((m) => `${m.fname} ${m.lname}`.toLowerCase().includes(manualSearchQuery.toLowerCase()))
                      .map((member) => (
                        <Button
                          key={member.id}
                          variant="ghost"
                          className="w-full justify-start hover:bg-slate-50 rounded-none py-8 px-6 my-3.5"
                          onClick={() => handleManualEntry(member)}
                        >
                          <div className="flex items-center gap-4 w-full text-left">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-slate-700 font-semibold text-base">
                                {member.fname?.[0]?.toUpperCase()}{member.lname?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 truncate text-base">
                                {member.fname} {member.lname}
                              </div>
                              <div className="text-sm text-slate-500 truncate mt-1">{member.email}</div>
                            </div>
                            <Plus className="h-5 w-5 text-slate-400 flex-shrink-0" />
                          </div>
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setManualOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failed QR Scans Dialog */}
      <Dialog open={failedScansOpen} onOpenChange={setFailedScansOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader className="border-b pb-4 mb-4">
            {(() => {
              // Filter to show only subscription-related denials (no_plan, expired_plan)
              // Exclude: already_attended_today, already_checked_in, cooldown, etc.
              const subscriptionDenials = failedScans.filter(scan =>
                scan.type === "no_plan" ||
                scan.type === "expired_plan" ||
                scan.type === "guest_expired" ||
                scan.type === "guest_error"
              )

              return (
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg">
                      <AlertCircle className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">Attendance Denied Log</div>
                      <div className="text-sm font-normal text-gray-500 mt-1">
                        Records of denied access due to no active subscription
                      </div>
                    </div>
                  </div>
                  {subscriptionDenials.length > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 mr-12">
                      <span className="text-sm font-bold text-red-600">
                        {subscriptionDenials.length} {subscriptionDenials.length === 1 ? 'Denial' : 'Denials'}
                      </span>
                    </div>
                  )}
                </DialogTitle>
              )
            })()}
          </DialogHeader>

          {(() => {
            // Filter to show only subscription-related denials (no_plan, expired_plan)
            // Exclude: already_attended_today, already_checked_in, cooldown, etc.
            const subscriptionDenials = failedScans.filter(scan =>
              scan.type === "no_plan" ||
              scan.type === "expired_plan" ||
              scan.type === "guest_expired" ||
              scan.type === "guest_error"
            )

            return subscriptionDenials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  No subscription-related denials recorded.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                  <div className="overflow-y-auto max-h-[55vh]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 z-10">
                        <TableRow className="border-b-2 border-slate-200">
                          <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Timestamp</TableHead>
                          <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                          <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Entry Method</TableHead>
                          <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Error Type</TableHead>
                          <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptionDenials.map((scan, index) => (
                          <TableRow key={index} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                            <TableCell className="font-mono text-sm text-slate-600">
                              {new Date(scan.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-900">
                              {scan.memberName}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {scan.entryMethod === "manual" ? "Manual Entry" : (scan.entryMethod === "qr" || !scan.entryMethod) ? "QR Scan" : "QR Scan"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="destructive"
                                className="bg-red-500 hover:bg-red-600 text-white shadow-sm"
                              >
                                {scan.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-700 max-w-md">
                              {(() => {
                                // Format error message consistently
                                let formattedMessage = scan.message || ""

                                // Remove X emoji and other emojis
                                formattedMessage = formattedMessage.replace(/❌|✅|⚠️|🔴|🟢|🟡/g, "").trim()

                                // Standardize error messages based on type
                                if (scan.type === "no_plan") {
                                  const name = scan.memberName || "Unknown"
                                  formattedMessage = `${name} - No active subscription`
                                } else if (scan.type === "expired_plan") {
                                  const name = scan.memberName || "Unknown"
                                  // Extract expiration date if present
                                  const dateMatch = formattedMessage.match(/(\w+\s+\d{1,2},\s+\d{4})/i)
                                  if (dateMatch) {
                                    formattedMessage = `${name} - Subscription expired on ${dateMatch[1]}`
                                  } else {
                                    formattedMessage = `${name} - Subscription has expired`
                                  }
                                } else if (scan.type === "guest_expired") {
                                  const name = scan.memberName || "Unknown"
                                  formattedMessage = `${name} - Guest session has expired`
                                } else if (scan.type === "guest_error") {
                                  const name = scan.memberName || "Unknown"
                                  formattedMessage = `${name} - Guest session error`
                                }

                                // Clean up any remaining inconsistencies
                                formattedMessage = formattedMessage
                                  .replace(/No active gym access plan found/g, "No active subscription")
                                  .replace(/no active monthly subscription/g, "no active subscription")
                                  .replace(/Gym access expired/g, "Subscription expired")
                                  .replace(/\s+/g, " ") // Remove extra spaces
                                  .trim()

                                return formattedMessage
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default AttendanceTracking
