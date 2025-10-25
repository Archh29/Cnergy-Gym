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

const AttendanceDashboard = ({ selectedDate, filterType }) => {
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
    const [periodFilter, setPeriodFilter] = useState("today")
    const [monthFilter, setMonthFilter] = useState("all")
    const [yearFilter, setYearFilter] = useState("all")
    const [customDate, setCustomDate] = useState(null)
    const [useCustomDate, setUseCustomDate] = useState(false)

    // Use external filters if provided, otherwise use internal state
    const effectiveSelectedDate = selectedDate || ""
    const effectiveFilterType = filterType || "all"

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

            // Add date filter if using custom date
            if (useCustomDate && customDate) {
                attendanceUrl += `&date=${format(customDate, "yyyy-MM-dd")}`
            } else if (effectiveSelectedDate) {
                attendanceUrl += `&date=${effectiveSelectedDate}`
            }

            const response = await axios.get(attendanceUrl)
            const data = response.data || []

            // Filter data based on period, month, and year
            let filteredData = data

            if (!useCustomDate) {
                const today = new Date()

                switch (periodFilter) {
                    case "today":
                        filteredData = data.filter(entry => {
                            // Handle different date formats
                            let entryDate
                            if (entry.date) {
                                entryDate = new Date(entry.date)
                            } else if (entry.check_in) {
                                // Extract date from check_in timestamp
                                entryDate = new Date(entry.check_in.split(' ')[0])
                            } else if (entry.timestamp) {
                                entryDate = new Date(entry.timestamp)
                            } else {
                                return false
                            }
                            return entryDate.toDateString() === today.toDateString()
                        })
                        break
                    case "yesterday":
                        const yesterday = subDays(today, 1)
                        filteredData = data.filter(entry => {
                            let entryDate
                            if (entry.date) {
                                entryDate = new Date(entry.date)
                            } else if (entry.check_in) {
                                entryDate = new Date(entry.check_in.split(' ')[0])
                            } else if (entry.timestamp) {
                                entryDate = new Date(entry.timestamp)
                            } else {
                                return false
                            }
                            return entryDate.toDateString() === yesterday.toDateString()
                        })
                        break
                    case "week":
                        const weekStart = startOfWeek(today)
                        const weekEnd = endOfWeek(today)
                        filteredData = data.filter(entry => {
                            let entryDate
                            if (entry.date) {
                                entryDate = new Date(entry.date)
                            } else if (entry.check_in) {
                                entryDate = new Date(entry.check_in.split(' ')[0])
                            } else if (entry.timestamp) {
                                entryDate = new Date(entry.timestamp)
                            } else {
                                return false
                            }
                            return entryDate >= weekStart && entryDate <= weekEnd
                        })
                        break
                    case "month":
                        const monthStart = startOfMonth(today)
                        const monthEnd = endOfMonth(today)
                        filteredData = data.filter(entry => {
                            let entryDate
                            if (entry.date) {
                                entryDate = new Date(entry.date)
                            } else if (entry.check_in) {
                                entryDate = new Date(entry.check_in.split(' ')[0])
                            } else if (entry.timestamp) {
                                entryDate = new Date(entry.timestamp)
                            } else {
                                return false
                            }
                            return entryDate >= monthStart && entryDate <= monthEnd
                        })
                        break
                    case "year":
                        const yearStart = startOfYear(today)
                        const yearEnd = endOfYear(today)
                        filteredData = data.filter(entry => {
                            let entryDate
                            if (entry.date) {
                                entryDate = new Date(entry.date)
                            } else if (entry.check_in) {
                                entryDate = new Date(entry.check_in.split(' ')[0])
                            } else if (entry.timestamp) {
                                entryDate = new Date(entry.timestamp)
                            } else {
                                return false
                            }
                            return entryDate >= yearStart && entryDate <= yearEnd
                        })
                        break
                    case "all":
                        // Show all data without date filtering
                        filteredData = data
                        break
                }
            }

            // Apply month filter
            if (monthFilter && monthFilter !== "all") {
                filteredData = filteredData.filter(entry => {
                    let entryDate
                    if (entry.date) {
                        entryDate = new Date(entry.date)
                    } else if (entry.check_in) {
                        entryDate = new Date(entry.check_in.split(' ')[0])
                    } else if (entry.timestamp) {
                        entryDate = new Date(entry.timestamp)
                    } else {
                        return false
                    }
                    return entryDate.getMonth() + 1 === parseInt(monthFilter)
                })
            }

            // Apply year filter
            if (yearFilter && yearFilter !== "all") {
                filteredData = filteredData.filter(entry => {
                    let entryDate
                    if (entry.date) {
                        entryDate = new Date(entry.date)
                    } else if (entry.check_in) {
                        entryDate = new Date(entry.check_in.split(' ')[0])
                    } else if (entry.timestamp) {
                        entryDate = new Date(entry.timestamp)
                    } else {
                        return false
                    }
                    return entryDate.getFullYear() === parseInt(yearFilter)
                })
            }

            // Apply user type filter
            if (effectiveFilterType && effectiveFilterType !== "all") {
                filteredData = filteredData.filter(entry => {
                    if (effectiveFilterType === "members") {
                        return entry.user_type === "member"
                    } else if (effectiveFilterType === "guests") {
                        return entry.user_type === "guest"
                    }
                    return true
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
    }, [periodFilter, monthFilter, yearFilter, useCustomDate, customDate, effectiveSelectedDate, effectiveFilterType])

    // Get current period display text
    const getPeriodDisplay = () => {
        if (useCustomDate && customDate) {
            return format(customDate, "MMM dd, yyyy")
        }

        const today = new Date()
        switch (periodFilter) {
            case "today":
                return "Today"
            case "yesterday":
                return "Yesterday"
            case "week":
                return "This Week"
            case "month":
                return "This Month"
            case "year":
                return "This Year"
            case "all":
                return "All Time"
            default:
                return "Today"
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

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Period Filter */}
                        <div className="flex items-center gap-2">
                            <Label htmlFor="period-filter">Period:</Label>
                            <Select value={periodFilter} onValueChange={(value) => {
                                setPeriodFilter(value)
                                setUseCustomDate(false)
                            }}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="yesterday">Yesterday</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">This Month</SelectItem>
                                    <SelectItem value="year">This Year</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Month Filter */}
                        <div className="flex items-center gap-2">
                            <Label htmlFor="month-filter">Month:</Label>
                            <Select value={monthFilter} onValueChange={setMonthFilter}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Month" />
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
                        <div className="flex items-center gap-2">
                            <Label htmlFor="year-filter">Year:</Label>
                            <Select value={yearFilter} onValueChange={setYearFilter}>
                                <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2023">2023</SelectItem>
                                    <SelectItem value="2022">2022</SelectItem>
                                    <SelectItem value="2021">2021</SelectItem>
                                    <SelectItem value="2020">2020</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Custom Date Picker */}
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
                                    {customDate ? format(customDate, "MMM dd, yyyy") : "Pick specific date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 shadow-2xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={customDate}
                                    onSelect={(date) => {
                                        setCustomDate(date)
                                        setUseCustomDate(true)
                                        setPeriodFilter("custom")
                                    }}
                                    className="rounded-md border"
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Current Period Display */}
                        <div className="ml-auto">
                            <Badge variant="secondary" className="text-sm">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {getPeriodDisplay()}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Analytics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            {/* Additional Analytics */}
            <div className="grid gap-4 md:grid-cols-3">
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

                {/* Weekly Trend */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Weekly Trend</CardTitle>
                        {getTrendIcon(analytics.weeklyTrend)}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics.weeklyTrend > 0 ? `+${analytics.weeklyTrend}` : analytics.weeklyTrend}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            vs last week
                        </p>
                    </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
                        {getTrendIcon(analytics.monthlyTrend)}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics.monthlyTrend > 0 ? `+${analytics.monthlyTrend}` : analytics.monthlyTrend}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            vs last month
                        </p>
                    </CardContent>
                </Card>
            </div>

        </div>
    )
}

export default AttendanceDashboard
