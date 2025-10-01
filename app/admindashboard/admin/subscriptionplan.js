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
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expiringFilter, setExpiringFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [availablePlans, setAvailablePlans] = useState([])
  const [warnings, setWarnings] = useState({
    critical_count: 0,
    warning_count: 0,
    notice_count: 0
  })
  const [analytics, setAnalytics] = useState({
    totalPlans: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    averagePlanPrice: 0,
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [statusFilter, expiringFilter, planFilter])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchPlans(), fetchSubscriptions()])
    } catch (error) {
      console.error("Error loading initial data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await axios.get(API_URL)
      if (Array.isArray(response.data.plans)) {
        setPlans(response.data.plans)
        // Update analytics if provided
        if (response.data.analytics) {
          setAnalytics(response.data.analytics)
        }
      } else {
        setPlans([])
        console.error("Unexpected API response format:", response.data)
      }
    } catch (error) {
      console.error("Error fetching plans:", error)
      setPlans([])
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams({
        action: 'subscriptions',
        status: statusFilter,
        expiring: expiringFilter,
        plan: planFilter
      })
      
      const response = await axios.get(`${API_URL}?${params}`)
      if (response.data.subscriptions) {
        setSubscriptions(response.data.subscriptions)
        setWarnings(response.data.warnings || { critical_count: 0, warning_count: 0, notice_count: 0 })
        setAvailablePlans(response.data.availablePlans || [])
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
      setSubscriptions([])
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
      plan_name: plan.name,
      price: plan.price.toString(),
      is_member_only: plan.is_member_only,
      duration_months: plan.duration_months || 1,
      duration_days: plan.duration_days || 0,
      features: plan.features || [],
    })
    setIsDialogOpen(true)
  }

  const handleDeleteConfirm = (id) => {
    setSelectedPlanId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await axios.delete(API_URL, { data: { id: selectedPlanId } })
      setPlans(plans.filter((plan) => plan.id !== selectedPlanId))
      setIsDeleteDialogOpen(false)
      await fetchAnalytics()
    } catch (error) {
      console.error("Error deleting plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentPlan.plan_name || !currentPlan.price) return
    
    // Validate that at least one duration is set
    if (currentPlan.duration_months === 0 && currentPlan.duration_days === 0) {
      alert("Please set either duration in months or days")
      return
    }

    setIsLoading(true)
    try {
      const planData = {
        id: currentPlan.id,
        name: currentPlan.plan_name,
        price: Number.parseFloat(currentPlan.price),
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
    updatedFeatures[index] = { ...updatedFeatures[index], [field]: value }
    setCurrentPlan({ ...currentPlan, features: updatedFeatures })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const filteredPlans = plans.filter((plan) => {
    const planName = (plan.name || "").toLowerCase()
    return planName.includes(searchQuery.toLowerCase())
  })

  if (isLoading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading subscription plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-l font-semibold">Manage membership plans and subscriptions for CNERGY Gym</p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPlans}</div>
            <p className="text-xs text-muted-foreground">Available membership plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Current active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <span className="text-muted-foreground">₱</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">From subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Plan Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.averagePlanPrice)}</div>
            <p className="text-xs text-muted-foreground">Across all plans</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
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
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(plan.price)}</TableCell>
                        <TableCell>
                          {plan.duration_days > 0 ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {plan.duration_days} Day{plan.duration_days > 1 ? 's' : ''}
                            </Badge>
                          ) : plan.duration_months > 0 ? (
                            <Badge variant="outline">
                              {plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline">1 Month</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {plan.is_member_only ? (
                            <Badge variant="secondary">Members Only</Badge>
                          ) : (
                            <Badge variant="outline">Public</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {plan.features?.slice(0, 2).map((feature, index) => (
                              <div key={index} className="text-sm text-muted-foreground">
                                • {feature.feature_name}
                              </div>
                            ))}
                            {plan.features?.length > 2 && (
                              <div className="text-sm text-muted-foreground">+{plan.features.length - 2} more</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(plan)} disabled={isLoading}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteConfirm(plan.id)}
                              disabled={isLoading}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
                  {/* Expiration Warnings */}
                  {(warnings.critical_count > 0 || warnings.warning_count > 0 || warnings.notice_count > 0) && (
                    <div className="flex items-center gap-2">
                      {warnings.critical_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {warnings.critical_count} Expiring in 3 days
                        </Badge>
                      )}
                      {warnings.warning_count > 0 && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                          {warnings.warning_count} Expiring in 7 days
                        </Badge>
                      )}
                      {warnings.notice_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {warnings.notice_count} Expiring in 14 days
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium">Status:</Label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending_approval">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="expiring-filter" className="text-sm font-medium">Expiring:</Label>
                  <select
                    id="expiring-filter"
                    value={expiringFilter}
                    onChange={(e) => setExpiringFilter(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All</option>
                    <option value="active">Active Only</option>
                    <option value="critical">Critical (3 days)</option>
                    <option value="warning">Warning (7 days)</option>
                    <option value="notice">Notice (14 days)</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="plan-filter" className="text-sm font-medium">Plan:</Label>
                  <select
                    id="plan-filter"
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="all">All Plans</option>
                    {availablePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.plan_name}
                      </option>
                    ))}
                  </select>
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
                    <TableHead>Days Left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount Paid</TableHead>
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
                          <div>
                            <div className="font-medium">{subscription.member_name}</div>
                            <div className="text-sm text-muted-foreground">{subscription.member_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{subscription.plan_name}</TableCell>
                        <TableCell>{new Date(subscription.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(subscription.end_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              subscription.days_until_expiry < 0 ? 'text-red-600' :
                              subscription.expiry_status === 'critical' ? 'text-red-600' :
                              subscription.expiry_status === 'warning' ? 'text-orange-600' :
                              subscription.expiry_status === 'notice' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {subscription.days_until_expiry < 0 ? 
                                `Expired ${Math.abs(subscription.days_until_expiry)} days ago` :
                                `${subscription.days_until_expiry} days`
                              }
                            </span>
                            {subscription.expiry_status === 'critical' && (
                              <Badge variant="destructive" className="text-xs">Critical</Badge>
                            )}
                            {subscription.expiry_status === 'warning' && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Warning</Badge>
                            )}
                            {subscription.expiry_status === 'notice' && (
                              <Badge variant="outline" className="text-xs">Notice</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            subscription.status_name === 'approved' ? 'default' :
                            subscription.status_name === 'pending_approval' ? 'secondary' :
                            subscription.status_name === 'rejected' ? 'destructive' :
                            'outline'
                          }>
                            {subscription.status_name.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(subscription.amount_paid)}
                          {subscription.discount_type !== 'none' && (
                            <div className="text-xs text-muted-foreground">
                              {subscription.discount_type} discount
                            </div>
                          )}
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

      {/* Add/Edit Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentPlan.id ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription>
              {currentPlan.id ? "Update the details of your membership plan." : "Add a new membership plan."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan_name">Plan Name</Label>
                <Input
                  id="plan_name"
                  value={currentPlan.plan_name}
                  onChange={(e) => setCurrentPlan({ ...currentPlan, plan_name: e.target.value })}
                  placeholder="e.g. Basic Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₱)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={currentPlan.price}
                  onChange={(e) => setCurrentPlan({ ...currentPlan, price: e.target.value })}
                  placeholder="Enter price"
                />
              </div>
            </div>

            {/* Duration Fields */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Plan Duration</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration_months">Duration (Months)</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    min="0"
                    value={currentPlan.duration_months}
                    onChange={(e) => {
                      const months = parseInt(e.target.value) || 0;
                      setCurrentPlan({ 
                        ...currentPlan, 
                        duration_months: months,
                        duration_days: months > 0 ? 0 : currentPlan.duration_days
                      });
                    }}
                    placeholder="0 for day pass plans"
                    className={currentPlan.duration_months > 0 ? "border-green-500 bg-green-50" : ""}
                  />
                  <p className="text-xs text-muted-foreground">Leave as 0 for day pass plans</p>
                  {currentPlan.duration_months > 0 && (
                    <p className="text-xs text-green-600 font-medium">✓ Monthly Plan</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_days">Duration (Days)</Label>
                  <Input
                    id="duration_days"
                    type="number"
                    min="0"
                    value={currentPlan.duration_days}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 0;
                      setCurrentPlan({ 
                        ...currentPlan, 
                        duration_days: days,
                        duration_months: days > 0 ? 0 : currentPlan.duration_months
                      });
                    }}
                    placeholder="0 for monthly plans"
                    className={currentPlan.duration_days > 0 ? "border-blue-500 bg-blue-50" : ""}
                  />
                  <p className="text-xs text-muted-foreground">Leave as 0 for monthly plans</p>
                  {currentPlan.duration_days > 0 && (
                    <p className="text-xs text-blue-600 font-medium">✓ Day Pass Plan</p>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Note:</strong> Use either months OR days, not both. Set one to 0 when using the other.
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_member_only"
                checked={currentPlan.is_member_only}
                onCheckedChange={(checked) => setCurrentPlan({ ...currentPlan, is_member_only: checked })}
              />
              <Label htmlFor="is_member_only">Members Only Plan</Label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Plan Features</Label>
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {currentPlan.features.map((feature, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Feature {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Feature name"
                        value={feature.feature_name}
                        onChange={(e) => updateFeature(index, "feature_name", e.target.value)}
                      />
                      <Textarea
                        placeholder="Feature description (optional)"
                        value={feature.description}
                        onChange={(e) => updateFeature(index, "description", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}

                {currentPlan.features.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No features added yet. Click "Add Feature" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!currentPlan.plan_name || !currentPlan.price || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : currentPlan.id ? (
                "Update Plan"
              ) : (
                "Create Plan"
              )}
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
              This action cannot be undone. This will permanently delete the selected membership plan and all its
              features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SubscriptionPlans
