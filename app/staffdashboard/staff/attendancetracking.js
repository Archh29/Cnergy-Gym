"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Camera, CheckCircle, AlertCircle, RefreshCw, Clock, Users, UserCheck, Filter, Calendar, BarChart3, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AttendanceDashboard from "./attendancedashboard"

const AttendanceTracking = ({ userId }) => {
  const [manualOpen, setManualOpen] = useState(false)
  const [failedScansOpen, setFailedScansOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [successModalData, setSuccessModalData] = useState({ memberName: "", message: "", planInfo: null })
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

  // Filter attendance based on type (date filtering is done server-side)
  const getFilteredAttendance = () => {
    let filtered = attendance.filter((entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Apply date filter (specific day)
    if (selectedDate) {
      filtered = filtered.filter((entry) => {
        const entryDate = parseDateFromEntry(entry)
        console.log("🔍 Debug - Day filter - Entry:", entry.name, "Parsed date:", entryDate, "Selected:", selectedDate)
        return entryDate === selectedDate
      })
    }
    // Apply month filter (entire month)
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
    if (filterType === "members") {
      filtered = filtered.filter(entry => entry.user_type === "member")
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
        // Show success modal for manual entry
        const memberName = `${member.fname} ${member.lname}`

        // Close manual entry dialog and clear search
        setManualOpen(false)
        setManualSearchQuery("")

        // Set success modal data and open it after a brief delay
        setSuccessModalData({
          memberName: memberName,
          message: response.data.message || "",
          planInfo: response.data.plan_info || null
        })

        // Small delay to ensure manual dialog closes first
        setTimeout(() => {
          setSuccessModalOpen(true)
        }, 100)

        fetchData()
      } else {
        // Get member name for logging
        const memberName = response.data.member_name || `${member.fname} ${member.lname}`
        const errorType = response.data.type || "unknown"
        let errorMessage = response.data.message || "Failed to record attendance"

        // Format error message for no_plan type
        if (errorType === "no_plan") {
          errorMessage = `${memberName} - No active subscription`
        }

        // Only log subscription-related denials (no_plan, expired_plan, guest errors)
        // Don't log: already_attended_today, already_checked_in, cooldown, etc.
        if (errorType === "no_plan" || errorType === "expired_plan" || errorType === "guest_expired" || errorType === "guest_error") {
          logDeniedAttempt(memberName, errorType, errorMessage, "manual")
        }

        // Handle plan validation errors with better messages
        if (response.data.type === "expired_plan") {
          const errorMessage = `${memberName}❌ This gym goer's monthly subscription has expired. Please ask the gym goer to renew their subscription.`
          showNotification(errorMessage, "error", true)
        }
        else if (response.data.type === "no_plan") {
          const errorMessage = `${memberName}❌ This gym goer currently has no active monthly subscription. Please ask the gym goer to purchase a subscription.`
          showNotification(errorMessage, "error", true)
        }
        // Handle cooldown errors
        else if (response.data.type === "cooldown") {
          showNotification(response.data.message, "warning", true)
        }
        // Handle attendance limit errors
        else if (response.data.type === "already_checked_in") {
          showNotification(response.data.message, "warning", true)
        }
        else if (response.data.type === "already_attended_today") {
          showNotification(response.data.message, "info", true)
        }
        // Handle session conflict errors
        else if (response.data.type === "session_conflict") {
          showNotification(response.data.message, "error", true)
        }
        // Handle guest session specific errors
        else if (response.data.type === "guest_expired") {
          showNotification(response.data.message, "error", true)
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
          showNotification(response.data.message, "error", true)
        } else {
          showNotification(response.data.message || "Failed to record attendance", "error", true)
        }
      }
    } catch (err) {
      console.error("Failed to record attendance", err)
      showNotification("Failed to record attendance", "error", true)
    }
    setManualOpen(false)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* Notification with different styles for different types */}
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

      {/* Dashboard Section */}
      <AttendanceDashboard userId={userId} selectedMonth={selectedMonth} selectedDate={selectedDate} filterType={filterType} />

      {/* Live Tracking Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Filters */}
        <div className="lg:w-80 flex-shrink-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Manual Entry
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search attendance records..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Month Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Month</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedMonth} onValueChange={(value) => {
                    setSelectedMonth(value)
                    setSelectedDate("") // Clear day when month changes
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-time">All Time</SelectItem>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMonth("all-time")}
                    className="px-2"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Day Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Or Select Specific Day</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      setSelectedMonth("all-time") // Clear month when day changes
                    }}
                    className="flex-1"
                    placeholder="Select day"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate("")}
                    className="px-2"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* User Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">User Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        All Users
                      </div>
                    </SelectItem>
                    <SelectItem value="members">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Members Only
                      </div>
                    </SelectItem>
                    <SelectItem value="guests">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Day Pass Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Manual Member Entry Dialog */}
              <Dialog open={manualOpen} onOpenChange={(open) => {
                setManualOpen(open)
                if (!open) {
                  setManualSearchQuery("")
                }
              }}>
                <DialogContent className="w-[95vw] max-w-[600px] mx-auto">
                  <DialogHeader>
                    <DialogTitle>Manual Attendance Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Search member..."
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {members
                        .filter((m) => `${m.fname} ${m.lname}`.toLowerCase().includes(manualSearchQuery.toLowerCase()))
                        .map((member) => (
                          <Button
                            key={member.id}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => handleManualEntry(member)}
                          >
                            <div className="text-left">
                              <div className="font-medium">
                                {member.fname} {member.lname}
                              </div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => setManualOpen(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Attendance Table */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl sm:text-2xl">Attendance Tracking</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openFailedScansDialog}
                  className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Attendance Denied Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile-friendly table wrapper with fixed height and scroll */}
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[100px]">Type</TableHead>
                        <TableHead className="min-w-[140px]">Check In</TableHead>
                        <TableHead className="min-w-[140px]">Check Out</TableHead>
                        <TableHead className="min-w-[80px]">Duration</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAttendance().map((entry) => (
                        <TableRow key={`${entry.user_type}-${entry.id}`}>
                          <TableCell className="font-medium">{entry.name}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${entry.user_type === "guest"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                                }`}
                            >
                              {entry.user_type === "guest" ? "Day Pass" : "Member"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{entry.check_in}</TableCell>
                          <TableCell className="text-sm">{entry.check_out || "Still in gym"}</TableCell>
                          <TableCell className="text-sm">{entry.duration || "-"}</TableCell>
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
                      ))}
                      {getFilteredAttendance().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            {loading ? "Loading attendance records..." : "No attendance records found"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Failed QR Scans Dialog */}
      <Dialog open={failedScansOpen} onOpenChange={setFailedScansOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                <AlertCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-gray-900">Attendance Denied Log</div>
                <div className="text-sm font-normal text-gray-500 mt-1">
                  Records of denied access due to no active subscription
                </div>
              </div>
            </DialogTitle>
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
                <div className="mb-4 flex items-center gap-3">
                  <div className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200">
                    <span className="text-sm font-semibold text-red-600">
                      {subscriptionDenials.length} {subscriptionDenials.length === 1 ? 'Denial' : 'Denials'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    No active subscription
                  </span>
                </div>

                <div className="overflow-y-auto max-h-[55vh] rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="font-bold text-gray-700">Timestamp</TableHead>
                        <TableHead className="font-bold text-gray-700">Name</TableHead>
                        <TableHead className="font-bold text-gray-700">Entry Method</TableHead>
                        <TableHead className="font-bold text-gray-700">Error Type</TableHead>
                        <TableHead className="font-bold text-gray-700">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptionDenials.map((scan, index) => (
                        <TableRow key={index} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                          <TableCell className="font-mono text-sm text-gray-600">
                            {new Date(scan.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">
                            {scan.memberName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={scan.entryMethod === "manual" ? "default" : "secondary"}
                              className={scan.entryMethod === "manual" ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm" : "bg-gray-500 hover:bg-gray-600 text-white shadow-sm"}
                            >
                              {scan.entryMethod === "manual" ? "Manual Entry" : (scan.entryMethod === "qr" || !scan.entryMethod) ? "QR Scan" : "QR Scan"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="destructive"
                              className="bg-red-500 hover:bg-red-600 text-white shadow-sm"
                            >
                              {scan.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-700 max-w-md">
                            {scan.message && scan.message.includes("No active gym access plan found")
                              ? scan.message.replace(/No active gym access plan found/g, "No active subscription")
                              : scan.message && scan.message.includes("no active monthly subscription")
                                ? scan.message.replace(/no active monthly subscription/g, "no active subscription")
                                : scan.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )
          })()}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setFailedScansOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal for Manual Attendance Entry */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Successfully Attended</DialogTitle>
          </DialogHeader>
          <div className="bg-gradient-to-br from-green-500 to-green-600 px-8 py-6 text-center">
            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Successfully Attended</h3>
          </div>
          <div className="px-8 py-6 text-center space-y-4">
            <div className="text-xl font-semibold text-gray-800">{successModalData.memberName}</div>
            <div className="text-sm text-gray-500">Attendance has been recorded successfully</div>
            <Button
              onClick={() => setSuccessModalOpen(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white mt-6"
              size="lg"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AttendanceTracking
