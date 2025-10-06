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
import {
  Users,
  Activity,
  TrendingUp,
  Clock,
  UserCheck,
  ShoppingCart,
  Package,
  UserPlus,
  Calendar,
  Search,
  Filter,
  BarChart3,
  Eye,
  RefreshCw,
} from "lucide-react"

// API Configuration
const API_BASE_URL = "https://api.cnergy.site/staff_monitoring.php"
const FALLBACK_API_URL = "https://api.cnergy.site/sales.php"

const StaffMonitoring = () => {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Filter states
  const [staffFilter, setStaffFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("today")
  const [activityTypeFilter, setActivityTypeFilter] = useState("all")
  
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
  }, [staffFilter, dateFilter, activityTypeFilter])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStaffActivities(),
        loadStaffPerformance(),
        loadStaffSummary(),
        loadStaffList()
      ])
    } catch (error) {
      console.error("Error loading initial data:", error)
      alert("Error loading data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  const loadStaffActivities = async () => {
    try {
      const params = new URLSearchParams()
      if (staffFilter !== "all") params.append("staff_id", staffFilter)
      if (dateFilter !== "all") params.append("date_filter", dateFilter)
      if (activityTypeFilter !== "all") params.append("activity_type", activityTypeFilter)
      params.append("limit", "100")
      
      const response = await axios.get(`${API_BASE_URL}?action=staff_activities&${params.toString()}`)
      setActivities(response.data.activities || [])
    } catch (error) {
      console.error("Error loading staff activities:", error)
      // Fallback: Load from existing activity log data
      await loadFallbackActivities()
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
            lname: "User",
            email: "admin@cnergy.com",
            user_type: "admin",
            activity_category: "Member Management"
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
            lname: "User",
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
            activity_category: "Guest Management"
          },
          {
            id: 6,
            user_id: 1,
            activity: "Stock updated for Protein Powder: add 25 units",
            timestamp: new Date(Date.now() - 18000000).toISOString(),
            fname: "Admin",
            lname: "User",
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
      const response = await axios.get(`${API_BASE_URL}?action=staff_performance&period=${dateFilter}`)
      setPerformance(response.data.performance || [])
    } catch (error) {
      console.error("Error loading staff performance:", error)
      // Fallback: Create mock performance data
      setPerformance([
        {
          staff_id: 1,
          staff_name: "Staff Member",
          email: "staff@cnergy.com",
          user_type: "staff",
          total_activities: 15,
          coach_management: 2,
          subscription_management: 3,
          guest_management: 4,
          coach_assignments: 1,
          sales_activities: 3,
          inventory_management: 2,
          member_management: 5,
          last_activity: new Date().toISOString()
        }
      ])
    }
  }

  const loadStaffSummary = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=staff_summary`)
      setSummary(response.data.summary || summary)
    } catch (error) {
      console.error("Error loading staff summary:", error)
      // Fallback: Create mock summary data
      setSummary({
        total_staff: 5,
        total_admins: 1,
        total_staff_members: 4,
        activities_today: 8,
        activities_this_week: 25,
        activities_this_month: 120,
        most_active_staff_today: "Staff Member",
        most_active_count: 5
      })
    }
  }

  const loadStaffList = async () => {
    try {
      // Get staff list directly from user table
      const response = await axios.get(`${API_BASE_URL}?action=staff_list`)
      
      if (response.data.staff) {
        const staff = response.data.staff.map(staff => ({
          id: staff.id,
          name: `${staff.fname} ${staff.lname}`,
          email: staff.email,
          user_type: staff.user_type
        }))
        setStaffList(staff)
      } else {
        throw new Error("No staff data received")
      }
    } catch (error) {
      console.error("Error loading staff list:", error)
      // Fallback: Create mock staff list
      setStaffList([
        {
          id: 1,
          name: "Admin User",
          email: "admin@cnergy.com",
          user_type: "admin"
        },
        {
          id: 2,
          name: "Staff Member",
          email: "staff@cnergy.com",
          user_type: "staff"
        }
      ])
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
      case 'Guest Management':
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
      case 'Guest Management':
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
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Demo Mode:</strong> Staff monitoring API is not yet deployed to the live server. Currently showing demo data. To enable real-time staff monitoring, deploy the staff_monitoring.php file to your server.
            </p>
          </div>
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
            <div className="text-2xl font-bold">{summary.total_staff}</div>
            <p className="text-xs text-muted-foreground">
              {summary.total_admins} admins, {summary.total_staff_members} staff
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="staff-filter">Staff:</Label>
                      <Select value={staffFilter} onValueChange={setStaffFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {staffList.filter(staff => staff.id && staff.name).map((staff) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor="date-filter">Period:</Label>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                          <SelectItem value="year">This Year</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor="activity-filter">Type:</Label>
                      <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="Coach">Coach Management</SelectItem>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="Guest">Guest Session</SelectItem>
                          <SelectItem value="sale">Sales</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
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
                                {staff.staff_name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{staff.staff_name}</div>
                              <div className="text-sm text-muted-foreground">{staff.email}</div>
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
