"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import {
    Users,
    UserCheck,
    Calendar as CalendarIcon,
    TrendingUp,
    Clock,
    Filter,
    BarChart3,
    Activity,
    RefreshCw
} from "lucide-react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { cn } from "@/lib/utils"

const AttendanceDashboard = ({ selectedDate, filterType, periodFilter, selectedMonth }) => {
    const [analytics, setAnalytics] = useState({
        totalAttendance: 0,
        membersToday: 0,
        dayPassToday: 0,
        totalMembers: 0,
        totalDayPass: 0,
        peakHour: "N/A",
        averageDaily: 0,
        weeklyTrend: 0,
        monthlyTrend: 0
    })

    const [attendanceData, setAttendanceData] = useState([])
    const [loading, setLoading] = useState(false)
    const [monthFilter, setMonthFilter] = useState("all")
    const [yearFilter, setYearFilter] = useState("all")
    const [customDate, setCustomDate] = useState(null)
    const [useCustomDate, setUseCustomDate] = useState(false)

    // Use external filters if provided, otherwise use internal state
    const effectiveSelectedDate = selectedDate || ""
    const effectiveFilterType = filterType || "all"
    const effectivePeriodFilter = periodFilter || "all"
    const effectiveSelectedMonth = selectedMonth || ""

    // Calculate analytics from attendance data
    const calculateAnalytics = (data) => {
        const totalAttendance = data.length
        const membersToday = data.filter(entry => entry.user_type === "member").length
        const dayPassToday = data.filter(entry => entry.user_type === "guest").length

        // Calculate peak hour
        const hourCounts = {}
        data.forEach(entry => {
            if (entry.time) {
                const hour = entry.time.split(':')[0]
                hourCounts[hour] = (hourCounts[hour] || 0) + 1
            }
        })

        const peakHour = Object.keys(hourCounts).length > 0
            ? Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b) + ":00"
            : "N/A"

        // Calculate trends (simplified - would need historical data for accurate trends)
        const weeklyTrend = 0 // Placeholder - would need last week's data
        const monthlyTrend = 0 // Placeholder - would need last month's data
        const averageDaily = totalAttendance // Simplified for current period

        return {
            totalAttendance,
            membersToday,
            dayPassToday,
            totalMembers: membersToday, // Simplified
            totalDayPass: dayPassToday, // Simplified
            peakHour,
            averageDaily,
            weeklyTrend,
            monthlyTrend
        }
    }

    // Load attendance data
    const loadAttendanceData = async () => {
        setLoading(true)
        try {
            let attendanceUrl = "https://api.cnergy.site/attendance.php?action=attendance"

            // Handle period filtering
            if (effectivePeriodFilter === "today") {
                const today = new Date().toISOString().split('T')[0]
                attendanceUrl += `&date=${today}`
            } else if (effectivePeriodFilter === "yesterday") {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                const yesterdayStr = yesterday.toISOString().split('T')[0]
                attendanceUrl += `&date=${yesterdayStr}`
            } else if (effectivePeriodFilter === "custom_month" && effectiveSelectedMonth) {
                // For custom month, we'll fetch all data and filter on the frontend
                // since the API might not support month filtering
            } else if (effectiveSelectedDate) {
                attendanceUrl += `&date=${effectiveSelectedDate}`
            }

            const response = await axios.get(attendanceUrl)
            const data = response.data || []

            // Apply user type filter
            let filteredData = data
            if (effectiveFilterType && effectiveFilterType !== "all") {
                filteredData = data.filter(entry => {
                    if (effectiveFilterType === "members") {
                        return entry.user_type === "member"
                    } else if (effectiveFilterType === "guests") {
                        return entry.user_type === "guest"
                    }
                    return true
                })
            }

            // Apply month filter for custom month selection
            if (effectivePeriodFilter === "custom_month" && effectiveSelectedMonth) {
                filteredData = filteredData.filter(entry => {
                    const entryDate = entry.date || entry.check_in?.split(' ')[0] || entry.timestamp?.split(' ')[0]
                    if (entryDate) {
                        const entryMonth = entryDate.substring(0, 7) // Get YYYY-MM part
                        return entryMonth === effectiveSelectedMonth
                    }
                    return false
                })
            }

            setAttendanceData(filteredData)

            // Calculate analytics from filtered data
            const calculatedAnalytics = calculateAnalytics(filteredData)
            setAnalytics(calculatedAnalytics)

        } catch (error) {
            console.error("Error loading attendance data:", error)
            setAttendanceData([])
            setAnalytics({
                totalAttendance: 0,
                membersToday: 0,
                dayPassToday: 0,
                totalMembers: 0,
                totalDayPass: 0,
                peakHour: "N/A",
                averageDaily: 0,
                weeklyTrend: 0,
                monthlyTrend: 0
            })
        } finally {
            setLoading(false)
        }
    }

    // Load data when filters change
    useEffect(() => {
        loadAttendanceData()
    }, [effectiveSelectedDate, effectiveFilterType, effectivePeriodFilter, effectiveSelectedMonth])

    // Get current period display text
    const getPeriodDisplay = () => {
        if (effectiveSelectedDate) {
            return format(new Date(effectiveSelectedDate), "MMM dd, yyyy")
        }

        if (effectivePeriodFilter === "custom_month" && effectiveSelectedMonth) {
            const monthDate = new Date(effectiveSelectedMonth + "-01")
            return format(monthDate, "MMMM yyyy")
        }

        switch (effectivePeriodFilter) {
            case "today":
                return "Today"
            case "yesterday":
                return "Yesterday"
            case "all":
                return "All Time"
            default:
                return "All Time"
        }
    }

    // Get trend indicator
    const getTrendIcon = (trend) => {
        if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
        if (trend < 0) return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
        return <Activity className="h-4 w-4 text-gray-500" />
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance Dashboard</h1>
                    <p className="text-muted-foreground">
                        Monitor gym attendance and analytics
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        loadAttendanceData()
                    }}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Analytics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Total Attendance */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalAttendance}</div>
                        <p className="text-xs text-muted-foreground">
                            {getPeriodDisplay()}
                        </p>
                    </CardContent>
                </Card>

                {/* Members Today */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Members</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.membersToday}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalMembers} total members
                        </p>
                    </CardContent>
                </Card>

                {/* Day Pass */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Day Pass</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.dayPassToday}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalDayPass} total day passes
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Analytics */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Average Daily */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.averageDaily}</div>
                        <p className="text-xs text-muted-foreground">
                            Daily average attendance
                        </p>
                    </CardContent>
                </Card>

                {/* Peak Hour */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.peakHour}</div>
                        <p className="text-xs text-muted-foreground">
                            Most active time
                        </p>
                    </CardContent>
                </Card>
            </div>

        </div>
    )
}

export default AttendanceDashboard
