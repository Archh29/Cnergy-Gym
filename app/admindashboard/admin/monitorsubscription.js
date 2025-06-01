"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, CreditCard, DollarSign, Users, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"

const SubscriptionMonitor = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState("")

  // Simplified data structure matching your database schema
  const [subscriptions, setSubscriptions] = useState([
    {
      id: 1,
      user: {
        id: 1,
        fname: "Sarah",
        mname: "Jane",
        lname: "Johnson",
        email: "sarah.johnson@email.com",
        bday: "1995-03-15",
      },
      plan: {
        id: 1,
        plan_name: "Premium",
        price: 89.99,
      },
      status: {
        id: 1,
        status_name: "Active",
      },
      start_date: "2024-12-01",
      end_date: "2025-01-01",
      payments: [{ id: 1, amount: 89.99, payment_date: "2024-12-01" }],
    },
    {
      id: 2,
      user: {
        id: 2,
        fname: "Michael",
        mname: "David",
        lname: "Chen",
        email: "michael.chen@email.com",
        bday: "1988-07-22",
      },
      plan: {
        id: 2,
        plan_name: "Basic",
        price: 39.99,
      },
      status: {
        id: 2,
        status_name: "Expiring Soon",
      },
      start_date: "2024-12-05",
      end_date: "2025-01-05",
      payments: [{ id: 2, amount: 39.99, payment_date: "2024-12-05" }],
    },
    {
      id: 3,
      user: {
        id: 3,
        fname: "Emily",
        mname: "Maria",
        lname: "Rodriguez",
        email: "emily.rodriguez@email.com",
        bday: "1992-11-10",
      },
      plan: {
        id: 3,
        plan_name: "Standard",
        price: 59.99,
      },
      status: {
        id: 3,
        status_name: "Expired",
      },
      start_date: "2024-11-15",
      end_date: "2024-12-15",
      payments: [{ id: 3, amount: 59.99, payment_date: "2024-11-15" }],
    },
  ])

  // Available subscription plans (from Member_Subscription_Plan table)
  const availablePlans = [
    { id: 1, plan_name: "Basic", price: 39.99 },
    { id: 2, plan_name: "Standard", price: 59.99 },
    { id: 3, plan_name: "Premium", price: 89.99 },
  ]

  // Calculate analytics from actual data
  const analytics = {
    totalRevenue: subscriptions.reduce(
      (sum, sub) => sum + sub.payments.reduce((paySum, payment) => paySum + payment.amount, 0),
      0,
    ),
    activeSubscriptions: subscriptions.filter((sub) => sub.status.status_name === "Active").length,
    expiringThisWeek: subscriptions.filter((sub) => sub.status.status_name === "Expiring Soon").length,
    expiredSubscriptions: subscriptions.filter((sub) => sub.status.status_name === "Expired").length,
  }

  const handleRenewSubscription = () => {
    if (selectedSubscription && selectedDuration) {
      const newEndDate = new Date(selectedSubscription.end_date)

      if (selectedDuration === "1") {
        newEndDate.setMonth(newEndDate.getMonth() + 1)
      } else if (selectedDuration === "3") {
        newEndDate.setMonth(newEndDate.getMonth() + 3)
      } else if (selectedDuration === "12") {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1)
      }

      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubscription.id
            ? {
                ...sub,
                status: { id: 1, status_name: "Active" },
                end_date: newEndDate.toISOString().split("T")[0],
                payments: [
                  ...sub.payments,
                  {
                    id: Date.now(),
                    amount: sub.plan.price,
                    payment_date: new Date().toISOString().split("T")[0],
                  },
                ],
              }
            : sub,
        ),
      )
      setRenewDialogOpen(false)
      setSelectedSubscription(null)
      setSelectedDuration("")
    }
  }

  const getStatusColor = (statusName) => {
    switch (statusName) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Expiring Soon":
        return "bg-yellow-100 text-yellow-800"
      case "Expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (statusName) => {
    switch (statusName) {
      case "Active":
        return <CheckCircle className="h-4 w-4" />
      case "Expiring Soon":
        return <Clock className="h-4 w-4" />
      case "Expired":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getDaysUntilExpiration = (endDate) => {
    const today = new Date()
    const expiry = new Date(endDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getFullName = (user) => {
    return `${user.fname} ${user.mname} ${user.lname}`.trim()
  }

  const getTotalPaid = (payments) => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0)
  }

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const fullName = getFullName(sub.user)
    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || sub.status.status_name.toLowerCase().replace(" ", "") === statusFilter
    const matchesPlan = planFilter === "all" || sub.plan.plan_name.toLowerCase() === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{analytics.activeSubscriptions}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.expiringThisWeek}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600">{analytics.expiredSubscriptions}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {analytics.expiringThisWeek > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {analytics.expiringThisWeek} subscription{analytics.expiringThisWeek > 1 ? "s" : ""} expiring soon. Consider
            sending renewal reminders.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Subscription Management
                <Badge variant="outline">{filteredSubscriptions.length} members</Badge>
              </CardTitle>
              <CardDescription>Monitor and manage gym member subscriptions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiringsoon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No subscriptions found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {subscription.user.fname[0]}
                              {subscription.user.lname[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getFullName(subscription.user)}</div>
                            <div className="text-sm text-muted-foreground">{subscription.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.plan.plan_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(subscription.plan.price)}/month
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(subscription.status.status_name)} flex items-center gap-1 w-fit`}
                        >
                          {getStatusIcon(subscription.status.status_name)}
                          {subscription.status.status_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatDate(subscription.start_date)}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatDate(subscription.end_date)}</div>
                          <div className="text-sm text-muted-foreground">
                            {subscription.status.status_name === "Expired" ? (
                              <span className="text-red-600">Expired</span>
                            ) : (
                              `${getDaysUntilExpiration(subscription.end_date)} days left`
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(getTotalPaid(subscription.payments))}</div>
                        <div className="text-sm text-muted-foreground">
                          {subscription.payments.length} payment{subscription.payments.length > 1 ? "s" : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSubscription(subscription)
                            setRenewDialogOpen(true)
                          }}
                          disabled={
                            subscription.status.status_name === "Active" &&
                            getDaysUntilExpiration(subscription.end_date) > 30
                          }
                        >
                          {subscription.status.status_name === "Active" ? "Extend" : "Renew"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Renewal Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarFallback>
                    {selectedSubscription.user.fname[0]}
                    {selectedSubscription.user.lname[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{getFullName(selectedSubscription.user)}</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {selectedSubscription.plan.plan_name} Plan
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Select Extension Period</label>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Choose extension period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month - {formatCurrency(selectedSubscription.plan.price)}</SelectItem>
                    <SelectItem value="3">3 Months - {formatCurrency(selectedSubscription.plan.price * 3)}</SelectItem>
                    <SelectItem value="12">
                      12 Months - {formatCurrency(selectedSubscription.plan.price * 12)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenewSubscription} disabled={!selectedDuration}>
              <CreditCard className="h-4 w-4 mr-2" />
              Process Renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionMonitor
