"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Users, AlertTriangle, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from "lucide-react"

const API_URL = "http://localhost/cynergy/monitor_subscription.php"

const SubscriptionMonitor = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [subscriptions, setSubscriptions] = useState([])
  const [pendingSubscriptions, setPendingSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)

  // Decline dialog state
  const [declineDialog, setDeclineDialog] = useState({
    open: false,
    subscription: null,
  })
  const [declineReason, setDeclineReason] = useState("")

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchSubscriptions(), fetchPendingSubscriptions()])
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage({ type: "error", text: "Failed to load subscription data" })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(API_URL)
      if (response.data.success && Array.isArray(response.data.subscriptions)) {
        setSubscriptions(response.data.subscriptions)
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    }
  }

  const fetchPendingSubscriptions = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=pending`)
      if (response.data.success) {
        setPendingSubscriptions(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching pending subscriptions:", error)
    }
  }

  const handleApprove = async (subscriptionId) => {
    setActionLoading(subscriptionId)
    setMessage(null)

    try {
      const response = await axios.post(`${API_URL}?action=approve`, {
        subscription_id: subscriptionId,
        approved_by: "Admin",
      })

      if (response.data.success) {
        setMessage({ type: "success", text: response.data.message })
        // Refresh data
        await fetchAllData()
      } else {
        setMessage({ type: "error", text: response.data.message })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to approve subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async () => {
    if (!declineDialog.subscription) return

    setActionLoading(declineDialog.subscription.subscription_id)
    setMessage(null)

    try {
      const response = await axios.post(`${API_URL}?action=decline`, {
        subscription_id: declineDialog.subscription.subscription_id,
        declined_by: "Admin",
        decline_reason: declineReason,
      })

      if (response.data.success) {
        setMessage({ type: "success", text: response.data.message })
        setDeclineDialog({ open: false, subscription: null })
        setDeclineReason("")
        // Refresh data
        await fetchAllData()
      } else {
        setMessage({ type: "error", text: response.data.message })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to decline subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending_approval":
      case "pending approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "approved":
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "declined":
        return "bg-red-100 text-red-800 border-red-200"
      case "expired":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending_approval":
      case "pending approval":
        return <Clock className="h-3 w-3" />
      case "approved":
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "declined":
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch =
      `${subscription.fname} ${subscription.mname} ${subscription.lname}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      subscription.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscription.plan_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || subscription.status_name === statusFilter
    const matchesPlan = planFilter === "all" || subscription.plan_name === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  // Get analytics
  const analytics = {
    total: subscriptions.length,
    pending: pendingSubscriptions.length,
    approved: subscriptions.filter((s) => s.status_name === "approved" || s.status_name === "active").length,
    declined: subscriptions.filter((s) => s.status_name === "declined").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading subscription data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{analytics.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold">{analytics.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{analytics.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Declined</p>
              <p className="text-2xl font-bold">{analytics.declined}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Messages */}
      {message && (
        <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          {message.type === "error" ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Subscription Request Monitor
                <Badge variant="outline">{analytics.pending} pending</Badge>
              </CardTitle>
              <CardDescription>Monitor and manage gym member subscription requests</CardDescription>
            </div>
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Pending Requests ({analytics.pending})</TabsTrigger>
              <TabsTrigger value="all">All Requests ({analytics.total})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending subscription requests</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSubscriptions.map((subscription) => (
                        <TableRow key={subscription.subscription_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {subscription.fname[0]}
                                  {subscription.lname[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {`${subscription.fname} ${subscription.mname || ""} ${subscription.lname}`}
                                </div>
                                <div className="text-sm text-muted-foreground">{subscription.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{subscription.plan_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(subscription.price)}/month
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDateTime(subscription.created_at)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(subscription.subscription_id)}
                                disabled={actionLoading === subscription.subscription_id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === subscription.subscription_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeclineDialog({ open: true, subscription })}
                                disabled={actionLoading === subscription.subscription_id}
                              >
                                <XCircle className="h-4 w-4" />
                                Decline
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search members, emails, or plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_approval">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* All Subscriptions Table */}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {subscription.fname[0]}
                                  {subscription.lname[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {`${subscription.fname} ${subscription.mname || ""} ${subscription.lname}`}
                                </div>
                                <div className="text-sm text-muted-foreground">{subscription.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{subscription.plan_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(subscription.price)}/month
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getStatusColor(subscription.display_status || subscription.status_name)} flex items-center gap-1 w-fit`}
                            >
                              {getStatusIcon(subscription.status_name)}
                              {subscription.display_status || subscription.status_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDate(subscription.start_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatDate(subscription.end_date)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(subscription.price)}</div>
                            <div className="text-sm text-muted-foreground">
                              {subscription.payments?.length || 0} payment
                              {(subscription.payments?.length || 0) !== 1 ? "s" : ""}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => setDeclineDialog({ open, subscription: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Subscription Request</DialogTitle>
          </DialogHeader>
          {declineDialog.subscription && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p>
                  <strong>Member:</strong> {`${declineDialog.subscription.fname} ${declineDialog.subscription.lname}`}
                </p>
                <p>
                  <strong>Plan:</strong> {declineDialog.subscription.plan_name}
                </p>
                <p>
                  <strong>Price:</strong> {formatCurrency(declineDialog.subscription.price)}/month
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason for decline (optional)</label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Enter reason for declining this subscription request..."
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialog({ open: false, subscription: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={actionLoading !== null}>
              {actionLoading !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                "Decline Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionMonitor
