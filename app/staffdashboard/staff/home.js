"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CalendarDays, Clock, Users } from "lucide-react"

const StaffDashboard = () => {
  // Sample data for charts - modified for staff focus
  const attendanceData = [
    { name: "Mon", attendance: 45 },
    { name: "Tue", attendance: 38 },
    { name: "Wed", attendance: 52 },
    { name: "Thu", attendance: 41 },
    { name: "Fri", attendance: 58 },
    { name: "Sat", attendance: 68 },
    { name: "Sun", attendance: 42 },
  ]

  const classesData = [
    { name: "6AM", classes: 2 },
    { name: "9AM", classes: 3 },
    { name: "12PM", classes: 2 },
    { name: "3PM", classes: 1 },
    { name: "6PM", classes: 4 },
    { name: "8PM", classes: 3 },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Staff Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-l font-semibold">
            Welcome to the CNERGY Gym Staff Portal – Track classes, manage member attendance, and view your schedule!
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                attendance: {
                  label: "Members",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    strokeWidth={2}
                    activeDot={{
                      r: 8,
                      style: { fill: "hsl(var(--chart-1))", opacity: 0.8 },
                    }}
                    style={{
                      stroke: "hsl(var(--chart-1))",
                    }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Class Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                classes: {
                  label: "Classes",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classesData}>
                  <Bar
                    dataKey="classes"
                    style={{
                      fill: "hsl(var(--chart-2))",
                      opacity: 0.8,
                    }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Members Checked In</h3>
                <p className="text-3xl font-bold">42</p>
              </div>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Your Classes Today</h3>
                <p className="text-3xl font-bold">4</p>
              </div>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Next Class</h3>
                <p className="text-3xl font-bold">3:00 PM</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      
    </div>
  )
}

export default StaffDashboard

