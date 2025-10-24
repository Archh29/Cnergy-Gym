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
  BarChart3,
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

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Reload data when filters change
  useEffect(() => {
    loadStaffActivities()
  }, [staffFilter, dateFilter, activityTypeFilter, customDate, useCustomDate, dateRange])

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
        params.append("date_filter", dateFilter)
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
      const response = await axios.get(`${STAFF_MONITORING_API_URL}?action=staff_performance&period=${dateFilter}`)
      setPerformance(response.data.performance || [])
    } catch (error) {
      console.error("Error loading staff performance:", error)
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
        const staff = response.data.staff.map(staff => ({
          id: staff.id,
          name: `${staff.fname || ''} ${staff.lname || ''}`.trim() || 'Unknown Staff',
          email: staff.email || 'No email',
          user_type: staff.user_type || 'staff'
        }))
        setStaffList(staff)
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
    switch (category) {
      case 'Coach Management':
        return "default"
      case 'Subscription Management':
        return "secondary"
      case 'Day Pass Access':
        return "outline"
      case 'Coach Assignment':
        return "destructive"
      case 'Sales':
        return "default"
      case 'Product Management':
      case 'Inventory Management':
        return "secondary"
      default:
        return "outline"
    }
  }

  const filteredActivities = activities.filter(activity => {
    if (!searchQuery) return true
    return (
      activity.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.fname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.lname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.activity_category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
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
          <p className="mt-4 text-lg">Loading staff monitoring data...</p>
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
              Staff Monitoring - Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                There was an error loading the staff monitoring data.
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Staff Monitoring Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-l font-semibold">Monitor staff activities and performance across all CNERGY Gym operations</p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_staff_members}</div>
            <p className="text-xs text-muted-foreground">
              {summary.total_staff_members} staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activities_today}</div>
            <p className="text-xs text-muted-foreground">
              {summary.activities_this_week} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activities_this_month}</div>
            <p className="text-xs text-muted-foreground">
              Total activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.most_active_count}</div>
            <p className="text-xs text-muted-foreground">
              {summary.most_active_staff_today}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">Staff Activities</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Staff Activities Log</CardTitle>
                  <Button onClick={loadStaffActivities} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search activities..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="staff-filter">Staff:</Label>
                      <Select value={staffFilter} onValueChange={setStaffFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {(staffList || []).filter(staff => staff.id && staff.name).map((staff) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="date-filter">Period:</Label>
                      <Select
                        value={useCustomDate ? "custom" : dateFilter}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setUseCustomDate(true)
                          } else {
                            setUseCustomDate(false)
                            setDateFilter(value)
                            setCustomDate(null)
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                          <SelectItem value="year">This Year</SelectItem>
                          <SelectItem value="custom">Custom Date</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Calendar Date Picker Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={useCustomDate ? "default" : "outline"}
                          className={cn(
                            "w-[220px] justify-start text-left font-medium h-10 border-2 transition-all duration-200",
                            useCustomDate
                              ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-md"
                              : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
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
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Clear Date Button */}
                    {useCustomDate && customDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomDate(null)
                          setUseCustomDate(false)
                          setDateFilter("all")
                        }}
                        className="h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200"
                      >
                        ✕ Clear Date
                      </Button>
                    )}

                    <div className="flex items-center gap-2">
                      <Label htmlFor="activity-filter">Type:</Label>
                      <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
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
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Timestamp</TableHead>
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
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {activity.fname?.[0]}{activity.lname?.[0]}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {activity.fname} {activity.lname}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {activity.user_type}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm">{activity.activity}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActivityBadgeVariant(activity.activity_category)}>
                            <div className="flex items-center gap-1">
                              {getActivityIcon(activity.activity_category)}
                              {activity.activity_category}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(activity.timestamp)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Staff Performance Analytics</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="performance-period">Period:</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Total Activities</TableHead>
                    <TableHead>Coach Management</TableHead>
                    <TableHead>Subscriptions</TableHead>
                    <TableHead>Guest Sessions</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No performance data available for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    performance.map((staff) => (
                      <TableRow key={staff.staff_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {staff.staff_name ? staff.staff_name.split(' ').map(n => n[0]).join('') : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{staff.staff_name || 'Unknown Staff'}</div>
                              <div className="text-sm text-muted-foreground">{staff.email || 'No email'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{staff.user_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-lg font-semibold">{staff.total_activities}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{staff.coach_management}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{staff.subscription_management}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{staff.guest_management}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{staff.sales_activities}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{staff.inventory_management}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {staff.last_activity ? formatDate(staff.last_activity) : 'Never'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StaffMonitoring
