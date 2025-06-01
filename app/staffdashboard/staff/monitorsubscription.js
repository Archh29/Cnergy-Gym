"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Search, Calendar, Users, DollarSign, Loader2 } from "lucide-react"

const API_URL = "http://localhost/cynergy/membership.php"

// Schema for subscription renewal
const renewalSchema = z.object({
  plan_id: z.string().min(1, { message: "Please select a subscription plan." }),
  start_date: z.string().min(1, { message: "Start date is required." }),
  end_date: z.string().min(1, { message: "End date is required." }),
})

const MonitorSubscriptions = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [subscriptions, setSubscriptions] = useState([])
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [subscriptionStatuses, setSubscriptionStatuses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [renewOpen, setRenewOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([])

  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      plan_id: "",
      start_date: "",
      end_date: "",
    },
  })

  // Fetch all subscription data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Fetch subscriptions with user and plan details
        const subscriptionsResponse = await fetch(`${API_URL}?type=subscriptions`)
        const subscriptionsData = await subscriptionsResponse.json()

        // Fetch subscription plans
        const plansResponse = await fetch(`${API_URL}?type=plans`)
        const plansData = await plansResponse.json()

        // Fetch subscription statuses
        const statusesResponse = await fetch(`${API_URL}?type=statuses`)
        const statusesData = await statusesResponse.json()

        setSubscriptions(subscriptionsData)
        setSubscriptionPlans(plansData)
        setSubscriptionStatuses(statusesData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to fetch subscription data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Filter subscriptions based on search and status
  useEffect(() => {
    let filtered = subscriptions

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowercaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (sub) =>
          `${sub.fname} ${sub.lname}`.toLowerCase().includes(lowercaseQuery) ||
          sub.email?.toLowerCase().includes(lowercaseQuery),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status_name?.toLowerCase() === statusFilter.toLowerCase())
    }

    setFilteredSubscriptions(filtered)
  }, [subscriptions, searchQuery, statusFilter])

  // Get status badge styling
  const getStatusBadge = (statusName) => {
    switch (statusName?.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-500 text-white">Active</Badge>
      case "expired":
        return <Badge className="bg-red-500 text-white">Expired</Badge>
      case "suspended":
        return <Badge className="bg-yellow-500 text-white">Suspended</Badge>
      default:
        return <Badge variant="outline">{statusName || "Unknown"}</Badge>
    }
  }

  // Check if subscription is expiring soon (within 7 days)
  const isExpiringSoon = (endDate) => {
    const today = new Date()
    const expiration = new Date(endDate)
    const diffTime = expiration - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays > 0
  }

  // Handle subscription renewal
  const handleRenewSubscription = async (data) => {
    if (!selectedSubscription) return

    try {
      setIsLoading(true)

      const renewalData = {
        user_id: selectedSubscription.user_id,
        plan_id: Number.parseInt(data.plan_id),
        start_date: data.start_date,
        end_date: data.end_date,
        status_id: 1, // Assuming 1 is "Active" status
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(renewalData),
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh subscriptions data
        const subscriptionsResponse = await fetch(`${API_URL}?type=subscriptions`)
        const updatedSubscriptions = await subscriptionsResponse.json()
        setSubscriptions(updatedSubscriptions)

        setRenewOpen(false)
        form.reset()
        toast({
          title: "Success",
          description: "Subscription renewed successfully!",
        })
      } else {
        throw new Error(result.message || "Failed to renew subscription")
      }
    } catch (error) {
      console.error("Error renewing subscription:", error)
      toast({
        title: "Error",
        description: "Failed to renew subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenRenewal = (subscription) => {
    setSelectedSubscription(subscription)

    // Set default dates (start today, end in 1 month)
    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setMonth(today.getMonth() + 1)

    form.reset({
      plan_id: "",
      start_date: today.toISOString().split("T")[0],
      end_date: nextMonth.toISOString().split("T")[0],
    })

    setRenewOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monitor Subscriptions</CardTitle>
              <CardDescription>Track and manage gym member subscriptions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by member name or email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {subscriptionStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.status_name.toLowerCase()}>
                    {status.status_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subscriptions Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subscriptions found. Try a different search or filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {subscription.fname} {subscription.lname}
                        </div>
                        <div className="text-sm text-muted-foreground">{subscription.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscription.plan_name}</div>
                        <div className="text-sm text-muted-foreground">${subscription.price}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(subscription.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>
                        <div>{new Date(subscription.end_date).toLocaleDateString()}</div>
                        {isExpiringSoon(subscription.end_date) && (
                          <div className="text-sm text-yellow-600">Expiring Soon</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(subscription.status_name)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRenewal(subscription)}
                        disabled={
                          subscription.status_name?.toLowerCase() === "active" && !isExpiringSoon(subscription.end_date)
                        }
                      >
                        Renew
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((sub) => sub.status_name?.toLowerCase() === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((sub) => isExpiringSoon(sub.end_date)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renewal Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="border rounded-md p-3">
                <p className="font-medium">
                  {selectedSubscription.fname} {selectedSubscription.lname}
                </p>
                <p className="text-sm text-muted-foreground">{selectedSubscription.email}</p>
                <p className="text-sm">Current Plan: {selectedSubscription.plan_name}</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRenewSubscription)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="plan_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Plan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subscriptionPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.plan_name} - ${plan.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRenewOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Renewal
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MonitorSubscriptions
