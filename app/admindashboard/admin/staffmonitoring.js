"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Users,
  Activity,
  TrendingUp,
  Clock,
  UserCheck,
  ShoppingCart,
  Package,
  UserPlus,
  Calendar as CalendarIcon,
  Search,
  Filter,
  FileText,
  Eye,
  RefreshCw,
} from "lucide-react"

// API Configuration
const API_BASE_URL = "https://api.cnergy.site/addstaff.php"
const STAFF_MONITORING_API_URL = "https://api.cnergy.site/staff_monitoring.php"

const StaffMonitoring = () => {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter states
  const [staffFilter, setStaffFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [activityTypeFilter, setActivityTypeFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")

  // Custom date picker states
  const [customDate, setCustomDate] = useState(null)
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [dateRange, setDateRange] = useState({ from: null, to: null })

  // Data states
  const [activities, setActivities] = useState([])
  const [performance, setPerformance] = useState([])
  const [summary, setSummary] = useState({
    total_staff: 0,
    total_admins: 0,
    total_staff_members: 0,
    activities_today: 0,
    activities_this_week: 0,
    activities_this_month: 0,
    most_active_staff_today: "No activities today",
    most_active_count: 0
  })
  const [staffList, setStaffList] = useState([])

  // Modal states for viewing user activities
  const [userActivitiesModalOpen, setUserActivitiesModalOpen] = useState(false)
  const [selectedUserActivities, setSelectedUserActivities] = useState([])
  const [selectedUserName, setSelectedUserName] = useState("")
  const [loadingUserActivities, setLoadingUserActivities] = useState(false)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload data when filters change
  useEffect(() => {
    loadStaffActivities()
  }, [staffFilter, dateFilter, activityTypeFilter, customDate, useCustomDate, dateRange, monthFilter, yearFilter])

  // Reload performance data when filters change
  useEffect(() => {
    loadStaffPerformance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, monthFilter, yearFilter])

  const loadInitialData = async () => {
    setLoading(true)
    setHasError(false)
    try {
      await Promise.all([
        loadStaffActivities(),
        loadStaffPerformance(),
        loadStaffSummary(),
        loadStaffList()
      ])
    } catch (error) {
      console.error("Error loading initial data:", error)
      setHasError(true)
      // Set empty states as fallback
      setActivities([])
      setPerformance([])
      setSummary({
        total_staff: 0,
        total_admins: 0,
        total_staff_members: 0,
        activities_today: 0,
        activities_week: 0,
        activities_month: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStaffActivities = async () => {
    try {
      // Use the dedicated staff monitoring API
      const params = new URLSearchParams()
      if (staffFilter !== "all") params.append("staff_id", staffFilter)

      // Handle date filtering - custom date takes priority
      if (useCustomDate && customDate) {
        params.append("date_filter", "custom")
        params.append("custom_date", format(customDate, "yyyy-MM-dd"))
      } else if (useCustomDate && dateRange.from && dateRange.to) {
        params.append("date_filter", "range")
        params.append("date_from", format(dateRange.from, "yyyy-MM-dd"))
        params.append("date_to", format(dateRange.to, "yyyy-MM-dd"))
      } else if (dateFilter !== "all") {
        // Date filter takes priority over month/year filters when explicitly set
        params.append("date_filter", dateFilter)
      } else if (monthFilter !== "all" || yearFilter !== "all") {
        // Month and year filters
        if (monthFilter !== "all") {
          params.append("month", monthFilter)
        }
        if (yearFilter !== "all") {
          params.append("year", yearFilter)
        }
      }

      if (activityTypeFilter !== "all") params.append("category", activityTypeFilter)
      params.append("limit", "100")

      console.log("Fetching activities from:", `${STAFF_MONITORING_API_URL}?action=staff_activities&${params.toString()}`)
      console.log("Current filters:", { staffFilter, dateFilter, activityTypeFilter, customDate, useCustomDate, dateRange })

      const response = await axios.get(`${STAFF_MONITORING_API_URL}?action=staff_activities&${params.toString()}`)

      console.log("API Response:", response.data)
      console.log("Activities count:", response.data.activities ? response.data.activities.length : 0)
      console.log("Debug info:", response.data.debug)

      if (response.data.activities) {
        setActivities(response.data.activities)
        console.log("Activities set successfully:", response.data.activities.length)
      } else {
        console.log("No activities in response")
        setActivities([])
      }
    } catch (error) {
      console.error("Error loading staff activities:", error)
      console.error("Error details:", error.response?.data || error.message)
      setActivities([])
      // Show error in UI if needed
      if (error.response?.data?.error) {
        console.error("API Error:", error.response.data.error)
      }
    }
  }

  const loadFallbackActivities = async () => {
    try {
      // Get activity log data from existing APIs
      const response = await axios.get(`${FALLBACK_API_URL}?action=activity-log&limit=100`)
      if (response.data.activities) {
        setActivities(response.data.activities)
      } else {
        // Create comprehensive mock data for demonstration
        setActivities([
          {
            id: 1,
            user_id: 1,
            activity: "Member account approved: John Doe (ID: 123)",
            timestamp: new Date().toISOString(),
            fname: "Admin",
            lname: "",
            email: "admin@cnergy.com",
            user_type: "admin",
            activity_category: "User Management"
          },
          {
            id: 2,
            user_id: 2,
            activity: "New sale recorded: Protein Shake - ₱150.00",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            fname: "Staff",
            lname: "Member",
            email: "staff@cnergy.com",
            user_type: "staff",
            activity_category: "Sales"
          },
          {
            id: 3,
            user_id: 2,
            activity: "POS Sale completed: Creatine + Pre-workout - Total: ₱200.00, Payment: cash, Receipt: RCP20241201001",
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            fname: "Staff",
            lname: "Member",
            email: "staff@cnergy.com",
            user_type: "staff",
            activity_category: "Sales"
          },
          {
            id: 4,
            user_id: 1,
            activity: "New product added: Cnergy Shirt - Price: ₱300, Stock: 50, Category: Merch/Apparel",
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            fname: "Admin",
            lname: "",
            email: "admin@cnergy.com",
            user_type: "admin",
            activity_category: "Product Management"
          },
          {
            id: 5,
            user_id: 2,
            activity: "Guest session created: Guest Name: Mike Johnson, Type: Day Pass, Amount: ₱100",
            timestamp: new Date(Date.now() - 14400000).toISOString(),
            fname: "Staff",
            lname: "Member",
            email: "staff@cnergy.com",
            user_type: "staff",
            activity_category: "Day Pass Access"
          },
          {
            id: 6,
            user_id: 1,
            activity: "Stock updated for Protein Powder: add 25 units",
            timestamp: new Date(Date.now() - 18000000).toISOString(),
            fname: "Admin",
            lname: "",
            email: "admin@cnergy.com",
            user_type: "admin",
            activity_category: "Inventory Management"
          }
        ])
      }
    } catch (error) {
      console.error("Error loading fallback activities:", error)
      setActivities([])
    }
  }

  const loadStaffPerformance = async () => {
    try {
      // Use the dedicated staff monitoring API
      // Follow the SAME pattern as loadStaffActivities
      const params = new URLSearchParams()

      // Handle date filtering - custom date takes priority (same as Activity Logs)
      if (useCustomDate && customDate) {
        params.append("date_filter", "custom")
        params.append("custom_date", format(customDate, "yyyy-MM-dd"))
      } else if (useCustomDate && dateRange.from && dateRange.to) {
        params.append("date_filter", "range")
        params.append("date_from", format(dateRange.from, "yyyy-MM-dd"))
        params.append("date_to", format(dateRange.to, "yyyy-MM-dd"))
      } else if (dateFilter !== "all") {
        // Date filter takes priority over month/year filters when explicitly set (same as Activity Logs)
        params.append("date_filter", dateFilter)
      } else if (monthFilter !== "all" || yearFilter !== "all") {
        // Month and year filters (same as Activity Logs)
        if (monthFilter !== "all") {
          params.append("month", monthFilter)
        }
        if (yearFilter !== "all") {
          params.append("year", yearFilter)
        }
      }
      // If dateFilter is "all" and month/year are "all", don't send any date params (shows all time - same as Activity Logs)

      const apiUrl = `${STAFF_MONITORING_API_URL}?action=staff_performance${params.toString() ? '&' + params.toString() : ''}`
      console.log("🔍🔍🔍 PERFORMANCE LOAD - Filters:", { dateFilter, monthFilter, yearFilter, useCustomDate, customDate, dateRange })
      console.log("🔍🔍🔍 PERFORMANCE LOAD - API URL:", apiUrl)
      console.log("🔍🔍🔍 PERFORMANCE LOAD - URL params string:", params.toString())

      const response = await axios.get(apiUrl)
      console.log("✅✅✅ PERFORMANCE DATA - Full response:", response.data)
      console.log("✅✅✅ PERFORMANCE DATA - Users received:", response.data.performance?.length || 0)
      console.log("✅✅✅ PERFORMANCE DATA - Debug info:", response.data.debug)
      console.log("✅✅✅ PERFORMANCE DATA - SQL Query:", response.data.sql_query)
      console.log("✅✅✅ PERFORMANCE DATA - Total activities from backend:", response.data.total_activities)
      if (response.data.performance && response.data.performance.length > 0) {
        console.log("✅✅✅ PERFORMANCE DATA - First user:", response.data.performance[0])
        const frontendTotal = response.data.performance.reduce((sum, user) => sum + (parseInt(user.total_activities) || 0), 0)
        console.log("✅✅✅ PERFORMANCE DATA - Total activities across all users (calculated):", frontendTotal)
        console.log("✅✅✅ PERFORMANCE DATA - All users:", response.data.performance.map(u => ({ name: u.staff_name, activities: u.total_activities })))
      } else {
        console.warn("⚠️⚠️⚠️ PERFORMANCE DATA - No users returned!")
      }
      setPerformance(response.data.performance || [])
    } catch (error) {
      console.error("❌ Error loading staff performance:", error)
      setPerformance([])
    }
  }

  const loadStaffSummary = async () => {
    try {
      // Use the dedicated staff monitoring API for summary
      const response = await axios.get(`${STAFF_MONITORING_API_URL}?action=staff_summary`)
      if (response.data.summary) {
        setSummary(response.data.summary)
      } else {
        // Fallback to default values
        setSummary({
          total_staff: 0,
          total_admins: 0,
          total_staff_members: 0,
          activities_today: 0,
          activities_this_week: 0,
          activities_this_month: 0,
          most_active_staff_today: "N/A",
          most_active_count: 0
        })
      }
    } catch (error) {
      console.error("Error loading staff summary:", error)
      // Set default empty summary
      setSummary({
        total_staff: 0,
        total_admins: 0,
        total_staff_members: 0,
        activities_today: 0,
        activities_this_week: 0,
        activities_this_month: 0,
        most_active_staff_today: "N/A",
        most_active_count: 0
      })
    }
  }

  const loadStaffList = async () => {
    try {
      // Get staff list from staff monitoring API
      const response = await axios.get(`${STAFF_MONITORING_API_URL}?action=staff_list`)

      if (response.data && response.data.staff && Array.isArray(response.data.staff)) {
        // Include all users (both admins and staff) - filter out any null/undefined entries
        const staff = response.data.staff
          .filter(staff => staff && staff.id && (staff.fname || staff.lname))
          .map(staff => ({
          id: staff.id,
            name: `${staff.fname || ''} ${staff.lname || ''}`.trim() || 'Unknown User',
          email: staff.email || 'No email',
            user_type: staff.user_type || 'user',
            fname: staff.fname || '',
            lname: staff.lname || ''
          }))
        // Sort: admins first, then staff, then by name
        staff.sort((a, b) => {
          if (a.user_type === 'admin' && b.user_type !== 'admin') return -1
          if (a.user_type !== 'admin' && b.user_type === 'admin') return 1
          return a.name.localeCompare(b.name)
        })
        setStaffList(staff)
        console.log("Staff list loaded:", staff.length, "users (including admins)")
      } else {
        setStaffList([])
      }
    } catch (error) {
      console.error("Error loading staff list:", error)
      // Set empty array instead of mock data
      setStaffList([])
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Format activity messages to be more concise and readable
  const formatActivityMessage = (activityText) => {
    if (!activityText) return ""

    // Fix currency symbol encoding (replace ? with ₱)
    let formatted = activityText.replace(/\?/g, "₱")

    // Remove all double dots/bullets (••) and replace with single separator
    formatted = formatted.replace(/•+/g, " • ")

    // Fix "Approve" to "Approved" (past tense)
    formatted = formatted.replace(/\bApprove\s+Subscription/gi, "Approved Subscription")
    formatted = formatted.replace(/\bApprove\s+/gi, "Approved ")

    // Remove redundant prefixes
    formatted = formatted.replace(/^Update Stock:\s*/i, "")
    formatted = formatted.replace(/Stock updated for\s+/i, "")
    formatted = formatted.replace(/^Process POS Sale:\s*/i, "")
    formatted = formatted.replace(/POS Sale completed:\s*/i, "")
    formatted = formatted.replace(/^Approve Subscription with\s*/i, "Approved Subscription: ")
    formatted = formatted.replace(/Subscription approved with payment:\s*/i, "Approved Subscription: ")
    formatted = formatted.replace(/^Add Product:\s*/i, "")
    formatted = formatted.replace(/New product added:\s*/i, "")
    formatted = formatted.replace(/^Update Member Status:\s*/i, "")
    formatted = formatted.replace(/Member account\s+/i, "")
    formatted = formatted.replace(/^Create Manual Subscription:\s*/i, "Created Manual Subscription: ")

    // Preserve duration information in subscription messages (e.g., "(3 months)")
    // Don't remove or modify text in parentheses that contains "month" or "months"

    // Handle inventory/stock messages
    formatted = formatted.replace(/:\s*(restocked|added|removed|remove|add)\s+/i, (match, action) => {
      if (action === 'restocked' || action === 'added') {
        return " - Added "
      }
      return ` - ${action.charAt(0).toUpperCase() + action.slice(1)} `
    })
    formatted = formatted.replace(/\s+units?$/i, " units")

    // Format POS Sale messages with better spacing
    formatted = formatted.replace(/Total:\s*₱?([\d,]+\.?\d*)/gi, "Total: ₱$1")
    formatted = formatted.replace(/Payment:\s*(cash|card|online)/gi, "Payment: $1")
    formatted = formatted.replace(/Receipt:\s*([A-Z0-9]+)/gi, "Receipt: $1")
    formatted = formatted.replace(/Change:\s*₱?([\d,]+\.?\d*)/gi, "Change: ₱$1")

    // Format subscription messages with better structure
    // Handle "Payment: [type] for [member] • Admin" pattern
    formatted = formatted.replace(/Payment:\s*([^•]+?)\s+for\s+([^•]+?)\s*•\s*(Admin|Staff)/gi, "Payment: $1 for $2 by $3")
    formatted = formatted.replace(/for\s+([^•]+?)\s*•\s*(Admin|Staff)\s*-/gi, "for $1 by $2 -")
    formatted = formatted.replace(/for\s+([^•]+?)\s+(Admin|Staff)\s*-/gi, "for $1 by $2 -")
    formatted = formatted.replace(/Amount:\s*₱?([\d,]+\.?\d*)/gi, "Amount: ₱$1")
    formatted = formatted.replace(/Received:\s*₱?([\d,]+\.?\d*)/gi, "Received: ₱$1")

    // Format product messages
    formatted = formatted.replace(/Price:\s*₱?([\d,]+\.?\d*)/gi, "Price: ₱$1")
    formatted = formatted.replace(/Stock:\s*(\d+)/gi, "Stock: $1")
    formatted = formatted.replace(/Category:\s*([^•]+)/gi, "Category: $1")

    // Format member messages
    formatted = formatted.replace(/:\s*([^(]+)\s*\(ID:/i, " - $1 (ID:")

    // Clean up separators - use consistent spacing
    formatted = formatted.replace(/\s*•\s*•\s*/g, " • ") // Remove double bullets
    formatted = formatted.replace(/\s*•\s*/g, " • ") // Normalize single bullets
    formatted = formatted.replace(/,\s*•/g, " •") // Fix comma-bullet combinations
    formatted = formatted.replace(/•\s*•/g, " • ") // Remove consecutive bullets

    // Capitalize first letter
    if (formatted.length > 0) {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }

    // Clean up extra spaces but preserve intentional spacing
    formatted = formatted.replace(/\s+/g, " ").trim()

    // Final cleanup - remove any remaining double separators
    formatted = formatted.replace(/\s*•\s*•\s*/g, " • ")

    return formatted
  }

  const getActivityIcon = (category) => {
    switch (category) {
      case 'Coach Management':
        return <UserCheck className="h-4 w-4" />
      case 'Subscription Management':
        return <Package className="h-4 w-4" />
      case 'Day Pass Access':
        return <UserPlus className="h-4 w-4" />
      case 'Coach Assignment':
        return <Users className="h-4 w-4" />
      case 'Sales':
        return <ShoppingCart className="h-4 w-4" />
      case 'Product Management':
      case 'Inventory Management':
        return <Package className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActivityBadgeVariant = (category) => {
    // Return consistent variant for all categories - using outline for unified look
        return "outline"
  }

  const filteredActivities = activities.filter(activity => {
    // Staff filter
    if (staffFilter !== "all") {
      if (!activity.user_id || activity.user_id.toString() !== staffFilter) {
        // Also check if it's "System User" case
        if (staffFilter !== "system" && activity.user_id !== null) {
          return false
        }
      }
    }

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase().trim()
      const fullName = `${activity.fname || ''} ${activity.lname || ''}`.trim().toLowerCase()

      // Check if searching for "System User" specifically
      const isSystemUserSearch = searchLower === "system user" || searchLower.includes("system user")
      const isSystemUser = (activity.fname === "System" && activity.lname === "User") ||
        (activity.fname === "System" && !activity.lname) ||
        (!activity.fname && activity.lname === "User") ||
        (!activity.fname && !activity.lname && activity.user_id === null)

      const matchesSearch =
        activity.activity.toLowerCase().includes(searchLower) ||
        activity.fname?.toLowerCase().includes(searchLower) ||
        activity.lname?.toLowerCase().includes(searchLower) ||
        activity.activity_category?.toLowerCase().includes(searchLower) ||
        fullName.includes(searchLower) ||
        (isSystemUserSearch && isSystemUser)

      if (!matchesSearch) return false
    }

    // Date filter (frontend filtering as backup)
    if (dateFilter !== "all" && !useCustomDate) {
      const activityDate = new Date(activity.timestamp)
      if (isNaN(activityDate.getTime())) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      switch (dateFilter) {
        case "today":
          const activityDay = new Date(activityDate)
          activityDay.setHours(0, 0, 0, 0)
          if (activityDay.getTime() !== today.getTime()) return false
          break
        case "week":
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay())
          if (activityDate < weekStart) return false
          break
        case "month":
          if (activityDate.getMonth() !== today.getMonth() || activityDate.getFullYear() !== today.getFullYear()) return false
          break
        case "year":
          if (activityDate.getFullYear() !== today.getFullYear()) return false
          break
      }
    }

    // Month and year filters (frontend filtering as backup)
    if (monthFilter !== "all" || yearFilter !== "all") {
      const activityDate = new Date(activity.timestamp)
      if (isNaN(activityDate.getTime())) return false

      if (monthFilter !== "all") {
        const activityMonth = activityDate.getMonth() + 1
        if (activityMonth.toString() !== monthFilter) return false
      }

      if (yearFilter !== "all") {
        const activityYear = activityDate.getFullYear().toString()
        if (activityYear !== yearFilter) return false
      }
    }

    // Custom date filter
    if (useCustomDate && customDate) {
      const activityDate = new Date(activity.timestamp)
      if (isNaN(activityDate.getTime())) return false

      const customDateStr = format(customDate, "yyyy-MM-dd")
      const activityDateStr = format(activityDate, "yyyy-MM-dd")
      if (activityDateStr !== customDateStr) return false
    }

    return true
  })

  console.log("Activities state:", activities.length)
  console.log("Filtered activities:", filteredActivities.length)
  console.log("Search query:", searchQuery)
  console.log("Current filters:", { staffFilter, dateFilter, activityTypeFilter })
  console.log("First activity:", activities[0])
  console.log("All activities sample:", activities.slice(0, 3))

  // Add error state
  const [hasError, setHasError] = useState(false)

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading activity logs...</p>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Activity className="h-5 w-5" />
              Activity Logs - Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                There was an error loading the activity logs.
              </p>
              <Button onClick={() => {
                setHasError(false)
                loadInitialData()
              }}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gray-900 shadow-sm">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Activity Logs</CardTitle>
              <p className="text-sm text-gray-600 font-medium">View all system activities and logs across CNERGY GYM</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Today's Activities</CardTitle>
            <div className="p-2 rounded-lg bg-gray-100">
              <Activity className="h-5 w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{summary.activities_today}</div>
            <p className="text-xs text-gray-600 font-medium">
              {summary.activities_this_week} this week
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">This Month</CardTitle>
            <div className="p-2 rounded-lg bg-gray-100">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{summary.activities_this_month}</div>
            <p className="text-xs text-gray-600 font-medium">
              Total activities
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Most Active Today</CardTitle>
            <div className="p-2 rounded-lg bg-gray-100">
              <TrendingUp className="h-5 w-5 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{summary.most_active_count}</div>
            <p className="text-xs text-gray-600 font-medium mb-3">
              {summary.most_active_staff_today}
            </p>
            {summary.most_active_staff_today !== "No activities today" && summary.most_active_staff_today !== "N/A" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                onClick={async (e) => {
                  e.stopPropagation()
                  const mostActiveName = summary.most_active_staff_today

                  setSelectedUserName(mostActiveName)
                  setLoadingUserActivities(true)
                  setUserActivitiesModalOpen(true)

                  try {
                    // Fetch activities for today
                    const params = new URLSearchParams()
                    params.append("date_filter", "today")
                    params.append("limit", "1000")

                    // Handle "System User" case
                    if (mostActiveName === "System User" || mostActiveName.includes("System")) {
                      // For System User, we need to filter activities where user_id is null
                      // or fname is "System" and lname is "User"
                      const response = await axios.get(`${STAFF_MONITORING_API_URL}?action=staff_activities&${params.toString()}`)

                      if (response.data.activities) {
                        const systemUserActivities = response.data.activities.filter(activity => {
                          return (activity.fname === "System" && activity.lname === "User") ||
                            (activity.fname === "System" && !activity.lname) ||
                            (!activity.fname && activity.lname === "User") ||
                            (!activity.fname && !activity.lname && activity.user_id === null)
                        })
                        setSelectedUserActivities(systemUserActivities)
                      } else {
                        setSelectedUserActivities([])
                      }
                    } else {
                      // Find the user ID from staffList
                      const mostActiveStaff = staffList.find(staff => {
                        const name = staff.name || ''
                        return name === mostActiveName
                      })

                      if (mostActiveStaff && mostActiveStaff.id) {
                        params.append("staff_id", mostActiveStaff.id.toString())
                      }

                      const response = await axios.get(`${STAFF_MONITORING_API_URL}?action=staff_activities&${params.toString()}`)

                      if (response.data.activities) {
                        // If we couldn't find the user ID, filter by name
                        if (!mostActiveStaff || !mostActiveStaff.id) {
                          const filtered = response.data.activities.filter(activity => {
                            const fullName = `${activity.fname || ''} ${activity.lname || ''}`.trim()
                            return fullName === mostActiveName
                          })
                          setSelectedUserActivities(filtered)
                        } else {
                          setSelectedUserActivities(response.data.activities)
                        }
                      } else {
                        setSelectedUserActivities([])
                      }
                    }
                  } catch (error) {
                    console.error("Error loading user activities:", error)
                    setSelectedUserActivities([])
                  } finally {
                    setLoadingUserActivities(false)
                  }
                }}
              >
                View Activities
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">Activity Logs</TabsTrigger>
          <TabsTrigger value="performance">Activity Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="bg-white border-b-2 border-gray-200 pb-6">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-1">Activity Logs</CardTitle>
                    <p className="text-sm text-gray-600 font-medium">View and filter all system activities across CNERGY GYM</p>
                  </div>
                  <Button onClick={loadStaffActivities} variant="outline" size="sm" className="font-medium border-gray-300 hover:bg-gray-50">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="search"
                    placeholder="Search activities, staff names, or categories..."
                    className="pl-10 h-11 text-base border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 rounded-lg"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Staff Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="staff-filter" className="text-sm font-semibold text-gray-700">User</Label>
                      <Select value={staffFilter} onValueChange={setStaffFilter}>
                      <SelectTrigger className="w-full h-10 border-2 border-gray-300 rounded-lg">
                        <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                          {(staffList || []).filter(staff => staff.id && staff.name).map((staff) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  {/* Activity Type Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="activity-filter" className="text-sm font-semibold text-gray-700">Activity Type</Label>
                    <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                      <SelectTrigger className="w-full h-10 border-2 border-gray-300 rounded-lg">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Coach Management">Coach Management</SelectItem>
                        <SelectItem value="Subscription Management">Subscription Management</SelectItem>
                        <SelectItem value="Day Pass Access">Day Pass Access</SelectItem>
                        <SelectItem value="Coach Assignment">Coach Assignment</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Product Management">Product Management</SelectItem>
                        <SelectItem value="Inventory Management">Inventory Management</SelectItem>
                        <SelectItem value="Member Management">Member Management</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Month Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="month-filter" className="text-sm font-semibold text-gray-700">Month</Label>
                      <Select
                      value={monthFilter}
                        onValueChange={(value) => {
                        setMonthFilter(value)
                        if (value !== "all") {
                            setUseCustomDate(false)
                          setDateFilter("all")
                          }
                        }}
                      >
                      <SelectTrigger className="w-full h-10 border-2 border-gray-300 rounded-lg">
                        <SelectValue placeholder="All Months" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  {/* Year Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="year-filter" className="text-sm font-semibold text-gray-700">Year</Label>
                    <Select
                      value={yearFilter}
                      onValueChange={(value) => {
                        setYearFilter(value)
                        if (value !== "all") {
                          setUseCustomDate(false)
                          setDateFilter("all")
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-10 border-2 border-gray-300 rounded-lg">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2021">2021</SelectItem>
                        <SelectItem value="2020">2020</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quick Period Filters and Custom Date */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200">
                  <Label className="text-sm font-semibold text-gray-700">Quick Filters:</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={dateFilter === "today" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("today")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-8 text-xs font-medium"
                    >
                      Today
                    </Button>
                    <Button
                      variant={dateFilter === "week" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("week")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-8 text-xs font-medium"
                    >
                      This Week
                    </Button>
                    <Button
                      variant={dateFilter === "month" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("month")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-8 text-xs font-medium"
                    >
                      This Month
                    </Button>
                    <Button
                      variant={dateFilter === "year" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("year")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-8 text-xs font-medium"
                    >
                      This Year
                    </Button>
                    <Button
                      variant={dateFilter === "all" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("all")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-8 text-xs font-medium"
                    >
                      All Time
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Calendar Date Picker Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={useCustomDate ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-8 text-xs font-medium border-2 transition-all duration-200",
                            useCustomDate
                              ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-md"
                              : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {customDate ? format(customDate, "MMM dd, yyyy") : "Pick Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={customDate}
                          onSelect={(date) => {
                            setCustomDate(date)
                            setUseCustomDate(!!date)
                            if (date) {
                              setDateFilter("custom")
                              setMonthFilter("all")
                              setYearFilter("all")
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Clear Date Button */}
                    {(useCustomDate && customDate) || monthFilter !== "all" || yearFilter !== "all" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomDate(null)
                          setUseCustomDate(false)
                          setDateFilter("all")
                          setMonthFilter("all")
                          setYearFilter("all")
                        }}
                        className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200"
                      >
                        ✕ Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50 border-b-2 border-gray-200">
                      <TableHead className="font-semibold text-gray-900">User</TableHead>
                      <TableHead className="font-semibold text-gray-900">Activity</TableHead>
                      <TableHead className="font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="font-semibold text-gray-900">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No activities found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity) => (
                        <TableRow key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-300">
                                <span className="text-sm font-semibold text-gray-700">
                                  {activity.fname?.[0] || 'S'}{activity.lname?.[0] || 'U'}
                              </span>
                            </div>
                            <div>
                                <div className="font-semibold text-gray-900">
                                {activity.fname} {activity.lname}
                              </div>
                                <div className="text-xs text-gray-500 font-medium">
                                {activity.user_type}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                          <TableCell className="max-w-lg py-4">
                            <div className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-wrap break-words space-y-1">
                              {formatActivityMessage(activity.activity)}
                            </div>
                        </TableCell>
                          <TableCell className="py-4">
                            <Badge
                              variant="outline"
                              className="font-medium bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                              {getActivityIcon(activity.activity_category)}
                                <span>{activity.activity_category}</span>
                            </div>
                          </Badge>
                        </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">{formatDate(activity.timestamp)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="border border-gray-200 shadow-lg bg-white">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-200 pb-6">
              <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gray-900 shadow-sm">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 mb-1">Activity Summary</CardTitle>
                      <p className="text-sm text-gray-600 font-medium">Track activities</p>
                    </div>
                  </div>
                  <Button onClick={loadStaffPerformance} variant="outline" size="sm" className="font-medium border-gray-300 hover:bg-gray-50 shadow-sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Month Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="performance-month-filter" className="text-sm font-semibold text-gray-700">Month</Label>
                    <Select
                      value={monthFilter}
                      onValueChange={(value) => {
                        setMonthFilter(value)
                        if (value !== "all") {
                          setUseCustomDate(false)
                          setDateFilter("all")
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-11 border-2 border-gray-300 rounded-lg shadow-sm hover:border-gray-400 transition-colors">
                        <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>

                  {/* Year Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="performance-year-filter" className="text-sm font-semibold text-gray-700">Year</Label>
                    <Select
                      value={yearFilter}
                      onValueChange={(value) => {
                        setYearFilter(value)
                        if (value !== "all") {
                          setUseCustomDate(false)
                          setDateFilter("all")
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-11 border-2 border-gray-300 rounded-lg shadow-sm hover:border-gray-400 transition-colors">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2021">2021</SelectItem>
                        <SelectItem value="2020">2020</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quick Period Filters */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
                  <Label className="text-sm font-semibold text-gray-700">Quick Filters:</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={dateFilter === "today" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("today")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-9 text-xs font-medium shadow-sm hover:shadow transition-all"
                    >
                      Today
                    </Button>
                    <Button
                      variant={dateFilter === "week" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("week")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-9 text-xs font-medium shadow-sm hover:shadow transition-all"
                    >
                      This Week
                    </Button>
                    <Button
                      variant={dateFilter === "month" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("month")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-9 text-xs font-medium shadow-sm hover:shadow transition-all"
                    >
                      This Month
                    </Button>
                    <Button
                      variant={dateFilter === "year" && monthFilter === "all" && yearFilter === "all" && !useCustomDate ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("year")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-9 text-xs font-medium shadow-sm hover:shadow transition-all"
                    >
                      This Year
                    </Button>
                  </div>

                  {(monthFilter !== "all" || yearFilter !== "all") ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateFilter("all")
                        setMonthFilter("all")
                        setYearFilter("all")
                        setUseCustomDate(false)
                        setCustomDate(null)
                      }}
                      className="h-9 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200 ml-auto shadow-sm"
                    >
                      ✕ Clear
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 hover:bg-gray-100 border-b-2 border-gray-300">
                      <TableHead className="font-semibold text-gray-900 py-4">User</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4">Role</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4 text-center">Total Activities</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4 text-center">Coach Management</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4 text-center">Subscriptions</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4 text-center">Guest Sessions</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4 text-center">Sales</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4 text-center">Inventory</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-4">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 rounded-full bg-gray-100">
                              <Activity className="h-10 w-10 text-gray-400" />
                            </div>
                            <p className="text-base font-semibold text-gray-700">No activity data available</p>
                            <p className="text-sm text-gray-500">Try adjusting your filters or select a different time period</p>
                          </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                      performance.map((staff, index) => (
                        <TableRow
                          key={staff.staff_id}
                          className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                        >
                          <TableCell className="py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-gray-400 shadow-sm">
                                <span className="text-sm font-bold text-gray-800">
                                  {staff.staff_name ? staff.staff_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'N/A'}
                              </span>
                            </div>
                            <div>
                                <div className="font-bold text-gray-900 text-base">{staff.staff_name || 'Unknown User'}</div>
                                <div className="text-xs text-gray-500 font-medium mt-0.5">{staff.email || 'No email'}</div>
                            </div>
                          </div>
                        </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="outline" className="font-semibold bg-gray-50 text-gray-700 border-gray-300 px-3 py-1">
                              {staff.user_type || 'N/A'}
                            </Badge>
                        </TableCell>
                          <TableCell className="py-5 text-center">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 border border-gray-300">
                              <span className="text-lg font-bold text-gray-900">{staff.total_activities || 0}</span>
                            </div>
                        </TableCell>
                          <TableCell className="py-5 text-center">
                            <div className="text-sm font-semibold text-gray-700">{staff.coach_management || 0}</div>
                        </TableCell>
                          <TableCell className="py-5 text-center">
                            <div className="text-sm font-semibold text-gray-700">{staff.subscription_management || 0}</div>
                        </TableCell>
                          <TableCell className="py-5 text-center">
                            <div className="text-sm font-semibold text-gray-700">{staff.guest_management || 0}</div>
                        </TableCell>
                          <TableCell className="py-5 text-center">
                            <div className="text-sm font-semibold text-gray-700">{staff.sales_activities || 0}</div>
                        </TableCell>
                          <TableCell className="py-5 text-center">
                            <div className="text-sm font-semibold text-gray-700">{staff.inventory_management || 0}</div>
                        </TableCell>
                          <TableCell className="py-5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">{staff.last_activity ? formatDate(staff.last_activity) : 'N/A'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Activities Modal */}
      <Dialog open={userActivitiesModalOpen} onOpenChange={setUserActivitiesModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] border-0 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Today's Activities - {selectedUserName}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              View all activities performed by {selectedUserName} today
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] -mx-6 px-6">
            {loadingUserActivities ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                  <RefreshCw className="h-6 w-6 text-gray-600 animate-spin" />
                </div>
                <p className="text-sm text-gray-600 font-medium">Loading activities...</p>
              </div>
            ) : selectedUserActivities.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
                  <Activity className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Activities Found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {selectedUserName} has no activities recorded for today.
                </p>
              </div>
            ) : (
              <div className="py-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50 border-b-2 border-gray-200">
                      <TableHead className="font-semibold text-gray-900">Activity</TableHead>
                      <TableHead className="font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="font-semibold text-gray-900">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedUserActivities.map((activity) => (
                      <TableRow key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="max-w-lg py-4">
                          <div className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-wrap break-words">
                            {formatActivityMessage(activity.activity)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className="font-medium bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              {getActivityIcon(activity.activity_category)}
                              <span>{activity.activity_category}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-medium">{formatDate(activity.timestamp)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 pt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setUserActivitiesModalOpen(false)}
              className="font-medium border-gray-300 hover:bg-gray-50"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StaffMonitoring
