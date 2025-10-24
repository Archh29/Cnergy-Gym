"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Search, Plus, Camera, CheckCircle, AlertCircle, RefreshCw, Clock, Users, UserCheck, Filter, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const AttendanceTracking = ({ userId }) => {
  const [manualOpen, setManualOpen] = useState(false)
  const [manualScanOpen, setManualScanOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [manualQrInput, setManualQrInput] = useState("")
  const [attendance, setAttendance] = useState([])
  const [members, setMembers] = useState([])
  const [lastScanTime, setLastScanTime] = useState(0)
  const [notification, setNotification] = useState({ show: false, message: "", type: "" })
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState("all") // "all", "members", "guests"
  const [selectedDate, setSelectedDate] = useState("") // Date filter

  // Show notification with different typesz
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 6000)
  }

  // Filter attendance based on type (date filtering is done server-side)
  const getFilteredAttendance = () => {
    let filtered = attendance.filter((entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Filter by user type
    if (filterType === "members") {
      filtered = filtered.filter(entry => entry.user_type === "member")
    } else if (filterType === "guests") {
      filtered = filtered.filter(entry => entry.user_type === "guest")
    }

    return filtered
  }

  // Load members and attendance data
  const fetchData = async (dateFilter = null) => {
    setLoading(true)
    try {
      const attendanceUrl = dateFilter
        ? `https://api.cnergy.site/attendance.php?action=attendance&date=${dateFilter}`
        : "https://api.cnergy.site/attendance.php?action=attendance"

      const [membersRes, attendanceRes] = await Promise.all([
        axios.get("https://api.cnergy.site/attendance.php?action=members"),
        axios.get(attendanceUrl),
      ])
      setMembers(membersRes.data)
      setAttendance(attendanceRes.data)
    } catch (err) {
      console.error("Failed to load data", err)
      showNotification("Failed to load data", "error")
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [])

  // Refetch data when date filter changes
  useEffect(() => {
    if (selectedDate) {
      fetchData(selectedDate)
    } else {
      fetchData()
    }
  }, [selectedDate])

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
        // Handle different action types
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
          showNotification(notificationMessage, "warning")
        } else if (actionType === "guest_checkin" || actionType === "guest_checkout") {
          showNotification(notificationMessage, "success")
        } else {
          showNotification(notificationMessage)
        }
        fetchData()
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
        }
        // Handle guest session specific errors
        else if (response.data.type === "guest_expired") {
          showNotification(response.data.message, "error")
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
          showNotification(response.data.message, "error")
        } else {
          showNotification(response.data.message || "Failed to record attendance", "error")
        }
      }
    } catch (err) {
      console.error("Failed to record attendance", err)
      showNotification("Failed to record attendance", "error")
    }
    setManualOpen(false)
  }

  // Handle manual QR input
  const handleManualQrScan = async () => {
    if (!manualQrInput.trim()) {
      showNotification("Please enter QR code data", "error")
      return
    }
    try {
      const response = await axios.post(`https://api.cnergy.site/attendance.php`, {
        action: 'qr_scan',
        qr_data: manualQrInput.trim(),
        staff_id: userId
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
          showNotification(notificationMessage, "warning")
        } else if (actionType === "guest_checkin" || actionType === "guest_checkout") {
          showNotification(notificationMessage, "success")
        } else {
          showNotification(notificationMessage)
        }
        fetchData()
        setManualQrInput("")
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
        }
        // Handle guest session specific errors
        else if (response.data.type === "guest_expired") {
          showNotification(response.data.message, "error")
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
          showNotification(response.data.message, "error")
        } else {
          showNotification(response.data.message || "Failed to process QR code", "error")
        }
      }
    } catch (err) {
      console.error("Failed to process QR scan", err)
      showNotification("Failed to process QR code", "error")
    }
    setManualScanOpen(false)
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
          {notification.type === "error" ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : notification.type === "warning" ? (
            <Clock className="h-4 w-4 text-orange-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
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

      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Attendance Tracking</CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={fetchData}
                disabled={loading}
                className="w-full sm:w-auto bg-transparent"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              {/* Manual QR Input */}
              <Dialog open={manualScanOpen} onOpenChange={setManualScanOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                    <Camera className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Manual QR</span>
                    <span className="sm:hidden">QR</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[400px] mx-auto">
                  <DialogHeader>
                    <DialogTitle>Manual QR Code Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the QR code data manually:
                    </p>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        • Member QR: CNERGY_ATTENDANCE:7
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • Guest QR: GUEST_C17E6DDEC09F
                      </p>
                    </div>
                    <Input
                      type="text"
                      placeholder="CNERGY_ATTENDANCE:7 or GUEST_..."
                      value={manualQrInput}
                      onChange={(e) => setManualQrInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleManualQrScan()
                        }
                      }}
                    />
                  </div>
                  <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setManualScanOpen(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button onClick={handleManualQrScan} className="w-full sm:w-auto">
                      Process QR Code
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Manual Member Entry */}
              <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Manual Entry</span>
                    <span className="sm:hidden">Manual</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[600px] mx-auto">
                  <DialogHeader>
                    <DialogTitle>Manual Attendance Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Search member..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {members
                        .filter((m) => `${m.fname} ${m.lname}`.toLowerCase().includes(searchQuery.toLowerCase()))
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search attendance records..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[160px]"
                placeholder="Select date"
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
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
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
          </div>

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
  )
}

export default AttendanceTracking