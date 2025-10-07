import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const Home = () => {
  // Sample data for charts
  const membershipData = [
    { name: "Jan", members: 200 },
    { name: "Feb", members: 300 },
    { name: "Mar", members: 500 },
    { name: "Apr", members: 700 },
    { name: "May", members: 600 },
    { name: "Jun", members: 800 },
  ]

  const revenueData = [
    { name: "Jan", revenue: 4000 },
    { name: "Feb", revenue: 3000 },
    { name: "Mar", revenue: 5000 },
    { name: "Apr", revenue: 7000 },
    { name: "May", revenue: 6000 },
    { name: "Jun", revenue: 8000 },
  ]

  // Custom formatters
  const formatCurrency = (value) => {
    return `₱${value.toLocaleString()}`
  }

  const formatNumber = (value) => {
    return value.toLocaleString()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-l font-semibold">Welcome to the CNERGY Gym Admin Dashboard – Manage Staff, Members, Coaches, and Operations! </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                members: {
                  label: "Members",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={membershipData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatNumber}
                  />
                  <Line
                    type="monotone"
                    dataKey="members"
                    strokeWidth={2}
                    activeDot={{
                      r: 8,
                      style: { fill: "hsl(var(--chart-1))", opacity: 0.8 },
                    }}
                    style={{
                      stroke: "hsl(var(--chart-1))",
                    }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name) => [formatNumber(value), "Members"]}
                    />} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrency}
                  />
                  <Bar
                    dataKey="revenue"
                    style={{
                      fill: "hsl(var(--chart-2))",
                      opacity: 0.8,
                    }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name) => [formatCurrency(value), "Revenue"]}
                    />} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-primary/10 rounded-lg">
              <h3 className="text-lg font-semibold">Total Members</h3>
              <p className="text-3xl font-bold">456</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <h3 className="text-lg font-semibold">Active Trainers</h3>
              <p className="text-3xl font-bold">12</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <h3 className="text-lg font-semibold">This Month's Revenue</h3>
              <p className="text-3xl font-bold">₱15,678</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Home
