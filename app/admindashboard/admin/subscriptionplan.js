"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Plus, Trash2, Edit, Loader2, Users, DollarSign, TrendingUp, CreditCard, Search } from "lucide-react"
import { Label } from "@/components/ui/label"

const API_URL = "http://localhost/cynergy/membership.php"

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState({
    id: null,
    plan_name: "",
    price: "",
  })
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [analytics, setAnalytics] = useState({
    totalPlans: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    averagePlanPrice: 0,
  })

  useEffect(() => {
    loadInitialData()
  }, [])

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
      if (Array.isArray(response.data.plans)) {
        setPlans(response.data.plans)
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
      // This would be a separate API call to get subscription data
      // For now, using mock data
      setSubscriptions([])
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
      setSubscriptions([])
    }
  }

  const fetchAnalytics = async () => {
    try {
      // Calculate analytics from plans data
      const totalPlans = plans.length
      const averagePlanPrice =
        plans.length > 0 ? plans.reduce((sum, plan) => sum + Number.parseFloat(plan.price || 0), 0) / plans.length : 0

      setAnalytics({
        totalPlans,
        activeSubscriptions: 0, // This would come from actual subscription data
        monthlyRevenue: 0, // This would come from actual subscription data
        averagePlanPrice,
      })
    } catch (error) {
      console.error("Error calculating analytics:", error)
    }
  }

  const handleAdd = () => {
    setCurrentPlan({
      id: null,
      plan_name: "",
      price: "",
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (plan) => {
    setCurrentPlan({
      id: plan.id,
      plan_name: plan.name || plan.plan_name,
      price: plan.price.toString(),
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

    setIsLoading(true)
    try {
      const planData = {
        id: currentPlan.id,
        name: currentPlan.plan_name,
        price: Number.parseFloat(currentPlan.price),
      }

      if (currentPlan.id) {
        await axios.put(API_URL, planData)
        setPlans(
          plans.map((plan) =>
            plan.id === currentPlan.id ? { ...plan, name: planData.name, price: planData.price } : plan,
          ),
        )
      } else {
        const response = await axios.post(API_URL, planData)
        setPlans([...plans, { ...planData, id: response.data.id }])
      }

      setIsDialogOpen(false)
      await fetchAnalytics()
    } catch (error) {
      console.error("Error saving plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const filteredPlans = plans.filter((plan) => {
    const planName = (plan.name || plan.plan_name || "").toLowerCase()
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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {searchQuery ? "No plans found matching your search" : "No membership plans found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name || plan.plan_name}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(plan.price)}</TableCell>
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
              <CardTitle>Active Subscriptions</CardTitle>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No active subscriptions found
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentPlan.id ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription>
              {currentPlan.id ? "Update the details of your membership plan." : "Add a new membership plan."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              This action cannot be undone. This will permanently delete the selected membership plan.
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
