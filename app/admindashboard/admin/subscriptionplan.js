"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, Edit, Loader2, Users, TrendingUp, CreditCard, Search, X } from "lucide-react"
import { Label } from "@/components/ui/label"

const API_URL = "https://api.cnergy.site/membership.php"

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState({
    id: null,
    plan_name: "",
    price: "",
    is_member_only: false,
    duration_months: 1,
    duration_days: 0,
    features: [],
  })

  // Discount management state
  const [discounts, setDiscounts] = useState({
    student: { name: "Student Discount", amount: 150, enabled: true },
    senior: { name: "Senior Discount", amount: 200, enabled: true }
  })

  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expiringFilter, setExpiringFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [analytics, setAnalytics] = useState({
    totalPlans: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
  })

  useEffect(() => {
    loadInitialData()
    loadDiscounts()
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [statusFilter, expiringFilter, planFilter])

  // Discount management functions
  const handleDiscountChange = (discountType, field, value) => {
    setDiscounts(prev => ({
      ...prev,
      [discountType]: {
        ...prev[discountType],
        [field]: value
      }
    }))
  }

  const saveDiscounts = () => {
    // Save discounts to localStorage (no database needed)
    localStorage.setItem('subscription_discounts', JSON.stringify(discounts))
    setIsDiscountDialogOpen(false)
  }

  const loadDiscounts = () => {
    // Load discounts from localStorage
    const savedDiscounts = localStorage.getItem('subscription_discounts')
    if (savedDiscounts) {
      setDiscounts(JSON.parse(savedDiscounts))
    }
  }

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchPlans(), fetchSubscriptions(), fetchAnalytics()])
    } catch (error) {
      console.error("Error loading initial data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await axios.get(API_URL)
      setPlans(response.data)
    } catch (error) {
      console.error("Error fetching plans:", error)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      // Try to fetch from monitor_subscription.php instead
      const response = await axios.get("https://api.cnergy.site/monitor_subscription.php")
      let filteredSubscriptions = response.data

      // Apply filters
      if (statusFilter !== "all") {
        filteredSubscriptions = filteredSubscriptions.filter(
          (sub) => sub.status === statusFilter
        )
      }

      if (expiringFilter !== "all") {
        const today = new Date()
        const daysFromNow = parseInt(expiringFilter)
        filteredSubscriptions = filteredSubscriptions.filter((sub) => {
          const endDate = new Date(sub.end_date)
          const diffTime = endDate - today
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays <= daysFromNow && diffDays >= 0
        })
      }

      if (planFilter !== "all") {
        filteredSubscriptions = filteredSubscriptions.filter(
          (sub) => sub.plan_id == planFilter
        )
      }

      setSubscriptions(filteredSubscriptions)
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
      // Set empty array if API fails
      setSubscriptions([])
    }
  }

  const fetchAnalytics = async () => {
    try {
      const [plansResponse, subscriptionsResponse] = await Promise.all([
        axios.get(API_URL),
        axios.get("https://api.cnergy.site/monitor_subscription.php").catch(() => ({ data: [] }))
      ])

      const totalPlans = plansResponse.data.length
      const totalSubscriptions = subscriptionsResponse.data.length
      const activeSubscriptions = subscriptionsResponse.data.filter(
        (sub) => sub.status === "active"
      ).length

      const monthlyRevenue = subscriptionsResponse.data
        .filter((sub) => sub.status === "active")
        .reduce((sum, sub) => {
          const plan = plansResponse.data.find((p) => p.id === sub.plan_id)
          return sum + (plan ? parseFloat(plan.price) : 0)
        }, 0)

      setAnalytics({
        totalPlans,
        totalSubscriptions,
        activeSubscriptions,
        monthlyRevenue,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    }
  }

  const handleAdd = () => {
    setCurrentPlan({
      id: null,
      plan_name: "",
      price: "",
      is_member_only: false,
      duration_months: 1,
      duration_days: 0,
      features: [],
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (plan) => {
    setCurrentPlan({
      id: plan.id,
      plan_name: plan.plan_name,
      price: plan.price,
      is_member_only: plan.is_member_only,
      duration_months: plan.duration_months,
      duration_days: plan.duration_days,
      features: plan.features || [],
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (planId) => {
    setSelectedPlanId(planId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedPlanId) return

    try {
      setIsLoading(true)
      await axios.delete(`${API_URL}?id=${selectedPlanId}`)
      await fetchPlans()
      await fetchAnalytics()
    } catch (error) {
      console.error("Error deleting plan:", error)
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setSelectedPlanId(null)
    }
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)

      const planData = {
        plan_name: currentPlan.plan_name,
        price: parseFloat(currentPlan.price),
        is_member_only: currentPlan.is_member_only,
        duration_months: currentPlan.duration_months,
        duration_days: currentPlan.duration_days,
        features: currentPlan.features.filter((f) => f.feature_name.trim() !== ""),
      }

      if (currentPlan.id) {
        await axios.put(API_URL, planData)
      } else {
        await axios.post(API_URL, planData)
      }

      await fetchPlans()
      setIsDialogOpen(false)
      await fetchAnalytics()
    } catch (error) {
      console.error("Error saving plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addFeature = () => {
    setCurrentPlan({
      ...currentPlan,
      features: [...currentPlan.features, { feature_name: "", description: "" }],
    })
  }

  const removeFeature = (index) => {
    setCurrentPlan({
      ...currentPlan,
      features: currentPlan.features.filter((_, i) => i !== index),
    })
  }

  const updateFeature = (index, field, value) => {
    const updatedFeatures = [...currentPlan.features]
    updatedFeatures[index][field] = value
    setCurrentPlan({
      ...currentPlan,
      features: updatedFeatures,
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-PH")
  }

  const filteredPlans = plans.filter((plan) =>
    plan.plan_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPlans}</div>
            <p className="text-xs text-muted-foreground">Active membership plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">All subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">From active subscriptions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans">Membership Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Membership Plans</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search plans..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAdd} disabled={isLoading}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Plan
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                  <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={isLoading}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Discount Settings
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Member Only</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchQuery ? "No plans found matching your search" : "No membership plans found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.plan_name}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(plan.price)}</TableCell>
                        <TableCell>
                          {plan.duration_days > 0 ? (
                            `${plan.duration_days} days`
                          ) : (
                            `${plan.duration_months} month${plan.duration_months > 1 ? "s" : ""}`
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={plan.is_member_only ? "default" : "secondary"}>
                            {plan.is_member_only ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {plan.features && plan.features.length > 0 ? (
                              <div className="space-y-1">
                                {plan.features.slice(0, 2).map((feature, index) => (
                                  <div key={index} className="text-sm text-muted-foreground">
                                    • {feature.feature_name}
                                  </div>
                                ))}
                                {plan.features.length > 2 && (
                                  <div className="text-sm text-muted-foreground">
                                    +{plan.features.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No features</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(plan)}
                              disabled={isLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(plan.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Subscriptions</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="status-filter">Status:</Label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1 border rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="expiring-filter">Expiring:</Label>
                    <select
                      id="expiring-filter"
                      value={expiringFilter}
                      onChange={(e) => setExpiringFilter(e.target.value)}
                      className="px-3 py-1 border rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="7">Within 7 days</option>
                      <option value="30">Within 30 days</option>
                      <option value="90">Within 90 days</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="plan-filter">Plan:</Label>
                    <select
                      id="plan-filter"
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="px-3 py-1 border rounded-md"
                    >
                      <option value="all">All Plans</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.plan_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-medium">
                          {subscription.member_name}
                        </TableCell>
                        <TableCell>{subscription.plan_name}</TableCell>
                        <TableCell>{formatDate(subscription.start_date)}</TableCell>
                        <TableCell>{formatDate(subscription.end_date)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subscription.status === "active"
                                ? "default"
                                : subscription.status === "expired"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {subscription.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(subscription.amount_paid)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {currentPlan.id ? "Edit Plan" : "Add New Plan"}
            </DialogTitle>
            <DialogDescription>
              {currentPlan.id
                ? "Update the membership plan details"
                : "Create a new membership plan"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plan Name</Label>
                <Input
                  id="plan-name"
                  value={currentPlan.plan_name}
                  onChange={(e) =>
                    setCurrentPlan({ ...currentPlan, plan_name: e.target.value })
                  }
                  placeholder="Enter plan name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₱)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={currentPlan.price}
                  onChange={(e) =>
                    setCurrentPlan({ ...currentPlan, price: e.target.value })
                  }
                  placeholder="Enter price"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration-months">Duration (Months)</Label>
                <Input
                  id="duration-months"
                  type="number"
                  min="1"
                  value={currentPlan.duration_months}
                  onChange={(e) =>
                    setCurrentPlan({
                      ...currentPlan,
                      duration_months: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration-days">Duration (Days)</Label>
                <Input
                  id="duration-days"
                  type="number"
                  min="0"
                  value={currentPlan.duration_days}
                  onChange={(e) =>
                    setCurrentPlan({
                      ...currentPlan,
                      duration_days: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="member-only"
                checked={currentPlan.is_member_only}
                onCheckedChange={(checked) =>
                  setCurrentPlan({ ...currentPlan, is_member_only: checked })
                }
              />
              <Label htmlFor="member-only">Member Only Plan</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feature
                </Button>
              </div>
              <div className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Feature name"
                      value={feature.feature_name}
                      onChange={(e) =>
                        updateFeature(index, "feature_name", e.target.value)
                      }
                    />
                    <Textarea
                      placeholder="Description"
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(index, "description", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentPlan.id ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Settings Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discount Settings</DialogTitle>
            <DialogDescription>
              Configure discount amounts for different customer types. These settings will be used when assigning subscriptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(discounts).map(([key, discount]) => (
              <div key={key} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{discount.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={discount.enabled}
                      onCheckedChange={(checked) =>
                        handleDiscountChange(key, "enabled", checked)
                      }
                    />
                    <Label>Enabled</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${key}-name`}>Discount Name</Label>
                  <Input
                    id={`${key}-name`}
                    value={discount.name}
                    onChange={(e) =>
                      handleDiscountChange(key, "name", e.target.value)
                    }
                    placeholder="Enter discount name"
                  />
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor={`${key}-amount`}>Discount Amount (₱)</Label>
                  <Input
                    id={`${key}-amount`}
                    type="number"
                    step="0.01"
                    value={discount.amount}
                    onChange={(e) =>
                      handleDiscountChange(key, "amount", parseFloat(e.target.value) || 0)
                    }
                    placeholder="Enter discount amount"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDiscounts}>
              Save Discount Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              membership plan and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SubscriptionPlans