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
import { Search, CreditCard, DollarSign, Users, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"

const API_URL = "http://localhost/cynergy/monitor_subscription.php"

const SubscriptionMonitor = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState("")
  const [subscriptions, setSubscriptions] = useState([])

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(API_URL)
      if (Array.isArray(response.data.subscriptions)) {
        setSubscriptions(response.data.subscriptions)
      } else {
        console.error("Unexpected API response format:", response.data)
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    }
  }

  const handleRenewSubscription = async () => {
    if (selectedSubscription && selectedDuration) {
      const newEndDate = new Date(selectedSubscription.end_date)

      if (selectedDuration === "1") {
        newEndDate.setMonth(newEndDate.getMonth() + 1)
      } else if (selectedDuration === "3") {
        newEndDate.setMonth(newEndDate.getMonth() + 3)
      } else if (selectedDuration === "12") {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1)
      }

      const updatedSubscription = {
        ...selectedSubscription,
        end_date: newEndDate.toISOString().split("T")[0],
      }

      try {
        await axios.put(API_URL, updatedSubscription)
        setSubscriptions((prev) =>
          prev.map((sub) => (sub.id === selectedSubscription.id ? updatedSubscription : sub))
        )
        setRenewDialogOpen(false)
        setSelectedSubscription(null)
        setSelectedDuration("")
      } catch (error) {
        console.error("Error renewing subscription:", error)
      }
    }
  }

  // Other functions (getStatusColor, getStatusIcon, etc.) remain unchanged...

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {/* ... (Analytics cards code) ... */}

      {/* Alerts */}
      {/* ... (Alerts code) ... */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Subscription Management
                <Badge variant="outline">{subscriptions.length} members</Badge>
              </CardTitle>
              <CardDescription>Monitor and manage gym member subscriptions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {/* ... (Filters code) ... */}

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
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => (
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
                            <div className="font-medium">{`${subscription.fname} ${subscription.mname} ${subscription.lname}`}</div>
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
                        <Badge className={`${getStatusColor(subscription.status_name)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(subscription.status_name)}
                          {subscription.status_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatDate(subscription.start_date)}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatDate(subscription.end_date)}</div>
                          <div className="text-sm text-muted-foreground">
                            {subscription.status_name === "Expired" ? (
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
                            subscription.status_name === "Active" &&
                            getDaysUntilExpiration(subscription.end_date) > 30
                          }
                        >
                          {subscription.status_name === "Active" ? "Extend" : "Renew"}
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
                    {selectedSubscription.fname[0]}
                    {selectedSubscription.lname[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{`${selectedSubscription.fname} ${selectedSubscription.mname} ${selectedSubscription.lname}`}</div>
                  <div className="text-sm text-muted-foreground">
                    Current: {selectedSubscription.plan_name} Plan
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
                    <SelectItem value="1">1 Month - {formatCurrency(selectedSubscription.price)}</SelectItem>
                    <SelectItem value="3">3 Months - {formatCurrency(selectedSubscription.price * 3)}</SelectItem>
                    <SelectItem value="12">
                      12 Months - {formatCurrency(selectedSubscription.price * 12)}
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
