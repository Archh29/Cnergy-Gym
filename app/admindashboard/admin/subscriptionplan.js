"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Plus, Archive, Edit, Loader2, Users, TrendingUp, CreditCard, Search, X, Percent, ArchiveRestore, GripVertical, CircleDollarSign } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

const API_URL = "https://api.cnergy.site/membership.php"

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [discountForm, setDiscountForm] = useState({
    name: "",
    amount: ""
  })
  const [discounts, setDiscounts] = useState(() => {
    // Load discounts from localStorage or use defaults
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gym-discounts')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error parsing saved discounts:', e)
        }
      }
    }
    return [
      { name: "Regular Rate", amount: 0 },
      { name: "Student Discount", amount: 150 },
      { name: "Senior Discount", amount: 200 }
    ]
  })
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
  const [selectedPlanName, setSelectedPlanName] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expiringFilter, setExpiringFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [showArchived, setShowArchived] = useState(false)
  const [message, setMessage] = useState(null)
  const [availablePlans, setAvailablePlans] = useState([])
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [archivedPlanIds, setArchivedPlanIds] = useState(() => {
    // Load archived plan IDs from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('archived-plan-ids')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Error parsing archived plan IDs:', e)
        }
      }
    }
    return []
  })
  const { toast } = useToast()
  const [warnings, setWarnings] = useState({
    critical_count: 0,
    warning_count: 0,
    notice_count: 0
  })
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [analytics, setAnalytics] = useState({
    totalPlans: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [statusFilter, expiringFilter, planFilter])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

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
        console.log("Fetched plans:", response.data.plans)
        // Log archive status for debugging
        response.data.plans.forEach(plan => {
          console.log(`Plan ${plan.id} (${plan.name}): is_archived = ${plan.is_archived} (type: ${typeof plan.is_archived})`)
        })

        // Sync archived plan IDs from API if available
        const archivedFromAPI = response.data.plans
          .filter(plan => plan.is_archived === 1 || plan.is_archived === "1" || plan.is_archived === true)
          .map(plan => plan.id)

        if (archivedFromAPI.length > 0) {
          console.log("Found archived plans from API:", archivedFromAPI)
          setArchivedPlanIds(prev => {
            // Merge API archived plans with local state
            const merged = [...new Set([...prev, ...archivedFromAPI])]
            if (typeof window !== 'undefined') {
              localStorage.setItem('archived-plan-ids', JSON.stringify(merged))
            }
            return merged
          })
        }

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

  const handleArchiveConfirm = (plan) => {
    setSelectedPlanId(plan.id)
    setSelectedPlanName(plan.name)
    setIsArchiveDialogOpen(true)
  }

  const handleArchive = async () => {
    if (!selectedPlanId) return

    setIsLoading(true)
    try {
      // Find the plan to get all required fields
      const planToArchive = plans.find(p => p.id === selectedPlanId)
      if (!planToArchive) {
        throw new Error("Plan not found")
      }

      console.log("Archiving plan:", planToArchive)
      console.log("Sending data:", {
        id: planToArchive.id,
        name: planToArchive.name,
        price: planToArchive.price,
        is_member_only: planToArchive.is_member_only || false,
        duration_months: planToArchive.duration_months || 0,
        duration_days: planToArchive.duration_days || 0,
        is_archived: 1
      })

      const response = await axios.put(API_URL, {
        id: planToArchive.id,
        name: planToArchive.name,
        price: planToArchive.price,
        is_member_only: planToArchive.is_member_only || false,
        duration_months: planToArchive.duration_months || 0,
        duration_days: planToArchive.duration_days || 0,
        is_archived: 1
      })

      console.log("Archive response:", response.data)
      console.log("Archive response data:", JSON.stringify(response.data, null, 2))

      // Check if the response indicates success
      if (response.data && (response.data.success !== false)) {
        // Add to local archived list
        setArchivedPlanIds(prev => {
          const updated = [...prev, selectedPlanId]
          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('archived-plan-ids', JSON.stringify(updated))
          }
          return updated
        })

        // Force refresh plans to get updated data
        await fetchPlans()
        setIsArchiveDialogOpen(false)
        setSelectedPlanId(null)
        setSelectedPlanName(null)
        toast({
          title: "Plan Archived",
          description: `"${selectedPlanName}" has been archived successfully.`,
        })
      } else {
        throw new Error(response.data?.message || "Archive request completed but may not have been saved")
      }
    } catch (error) {
      console.error("Error archiving plan:", error)
      console.error("Error response:", error.response)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Failed to archive plan. Please try again."
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (planId) => {
    setIsLoading(true)
    try {
      // Find the plan to get all required fields
      const planToRestore = plans.find(p => p.id === planId)
      if (!planToRestore) {
        throw new Error("Plan not found")
      }

      console.log("Restoring plan:", planToRestore)

      const response = await axios.put(API_URL, {
        id: planToRestore.id,
        name: planToRestore.name,
        price: planToRestore.price,
        is_member_only: planToRestore.is_member_only || false,
        duration_months: planToRestore.duration_months || 0,
        duration_days: planToRestore.duration_days || 0,
        is_archived: 0
      })

      console.log("Restore response:", response.data)

      if (response.data && (response.data.success !== false)) {
        // Remove from local archived list
        setArchivedPlanIds(prev => {
          const updated = prev.filter(id => id !== planId)
          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('archived-plan-ids', JSON.stringify(updated))
          }
          return updated
        })

        await fetchPlans()
        toast({
          title: "Plan Restored",
          description: `"${planToRestore.name}" has been restored successfully.`,
        })
      } else {
        throw new Error(response.data?.message || "Restore request completed but may not have been saved")
      }
    } catch (error) {
      console.error("Error restoring plan:", error)
      console.error("Error response:", error.response)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Failed to restore plan. Please try again."
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
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

  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newFeatures = [...currentPlan.features]
    const draggedItem = newFeatures[draggedIndex]

    newFeatures.splice(draggedIndex, 1)
    newFeatures.splice(index, 0, draggedItem)

    setCurrentPlan({ ...currentPlan, features: newFeatures })
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const filteredPlans = plans.filter((plan) => {
    const planName = (plan.name || "").toLowerCase()
    const matchesSearch = planName.includes(searchQuery.toLowerCase())
    // Handle different possible values for is_archived (1, "1", true, etc.)
    // Also check local state if API doesn't return the field
    const isArchivedFromAPI = plan.is_archived === 1 ||
      plan.is_archived === "1" ||
      plan.is_archived === true ||
      plan.is_archived === "true" ||
      (plan.is_archived !== undefined && plan.is_archived !== null && plan.is_archived !== 0 && plan.is_archived !== "0" && plan.is_archived !== false)
    // Use local state as fallback if API doesn't return is_archived
    const isArchived = isArchivedFromAPI || archivedPlanIds.includes(plan.id)
    return matchesSearch && (showArchived ? isArchived : !isArchived)
  })

  // Filter subscriptions client-side
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    // Filter by plan
    const matchesPlan = planFilter === "all" || subscription.plan_id?.toString() === planFilter

    // Filter by status
    const status = subscription.computed_status || subscription.status_name
    const daysUntilExpiry = subscription.days_until_expiry

    let matchesStatus = true
    if (statusFilter === "all") {
      matchesStatus = true
    } else if (statusFilter === "active") {
      matchesStatus = status === 'approved' && daysUntilExpiry >= 0
    } else if (statusFilter === "expiring") {
      matchesStatus = status === 'approved' && daysUntilExpiry >= 0 && daysUntilExpiry <= 7
    } else if (statusFilter === "expired") {
      matchesStatus = daysUntilExpiry < 0 || status === 'expired'
    }

    return matchesPlan && matchesStatus
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
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">Manage subscription plans for CNERGY GYM</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{analytics.totalPlans}</p>
                <p className="text-xs text-muted-foreground">Available plans</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{analytics.activeSubscriptions}</p>
                <p className="text-xs text-muted-foreground">Premium & standard</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.monthlyRevenue)}</p>
                <p className="text-xs text-muted-foreground">From subscriptions</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CircleDollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans" onClick={() => setShowArchived(false)}>Active Plans</TabsTrigger>
          <TabsTrigger value="archived" onClick={() => setShowArchived(true)}>Archived Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Active Plans</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage your membership plans</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search plans..."
                      className="pl-8 h-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setDiscountDialogOpen(true)} variant="outline" size="sm" className="h-9">
                      <Percent className="mr-2 h-4 w-4" />
                      Discount
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={handleAdd} disabled={isLoading} size="sm" className="h-9">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Plan
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border-t">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Plan Name</TableHead>
                      <TableHead className="font-semibold">Price</TableHead>
                      <TableHead className="font-semibold">Duration</TableHead>
                      <TableHead className="font-semibold">Access Type</TableHead>
                      <TableHead className="font-semibold">Features</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {searchQuery ? "No plans found matching your search" : "No membership plans found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPlans.map((plan) => (
                        <TableRow key={plan.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-semibold py-4">{plan.name}</TableCell>
                          <TableCell className="font-semibold text-lg py-4">{formatCurrency(plan.price)}</TableCell>
                          <TableCell className="py-4">
                            {plan.duration_days > 0 ? (
                              <Badge variant="outline" className="border-gray-300">
                                {plan.duration_days} Day{plan.duration_days > 1 ? 's' : ''}
                              </Badge>
                            ) : plan.duration_months > 0 ? (
                              <Badge variant="outline" className="border-gray-300">
                                {plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-300">1 Month</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            {plan.is_member_only ? (
                              <Badge variant="outline" className="border-gray-300">Members Only</Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-300">Public</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4 max-w-xs">
                            <div className="space-y-1">
                              {plan.features?.slice(0, 2).map((feature, index) => (
                                <div key={index} className="text-sm text-muted-foreground truncate">
                                  • {feature.feature_name}
                                </div>
                              ))}
                              {plan.features?.length > 2 && (
                                <div className="text-xs text-muted-foreground font-medium">+{plan.features.length - 2} more</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <div className="flex items-center justify-end gap-2">
                              {!(plan.is_archived === 1 || plan.is_archived === true) && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleEdit(plan)} disabled={isLoading} className="h-8">
                                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleArchiveConfirm(plan)}
                                    disabled={isLoading}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 h-8"
                                  >
                                    <Archive className="h-3.5 w-3.5 mr-1.5" />
                                    Archive
                                  </Button>
                                </>
                              )}
                              {(plan.is_archived === 1 || plan.is_archived === true) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(plan.id)}
                                  disabled={isLoading}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 h-8"
                                >
                                  <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                                  Restore
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Archived Plans</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search archived plans..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
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
                    <TableHead>Access Type</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {searchQuery ? "No archived plans found matching your search" : "No archived plans found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPlans.map((plan) => (
                      <TableRow key={plan.id} className="opacity-75">
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(plan.price)}</TableCell>
                        <TableCell>
                          {plan.duration_days > 0 ? (
                            <Badge variant="outline" className="border-gray-300">
                              {plan.duration_days} Day{plan.duration_days > 1 ? 's' : ''}
                            </Badge>
                          ) : plan.duration_months > 0 ? (
                            <Badge variant="outline" className="border-gray-300">
                              {plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-300">1 Month</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {plan.is_member_only ? (
                            <Badge variant="outline" className="border-gray-300">Members Only</Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-300">Public</Badge>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(plan.id)}
                            disabled={isLoading}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
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
                    value={currentPlan.duration_months === 0 ? "" : currentPlan.duration_months}
                    onFocus={(e) => {
                      if (currentPlan.duration_months === 0) {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      const months = value === "" ? 0 : parseInt(value) || 0;
                      setCurrentPlan({
                        ...currentPlan,
                        duration_months: months,
                        duration_days: months > 0 ? 0 : currentPlan.duration_days
                      });
                    }}
                    placeholder="0"
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
                    value={currentPlan.duration_days === 0 ? "" : currentPlan.duration_days}
                    onFocus={(e) => {
                      if (currentPlan.duration_days === 0) {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      const days = value === "" ? 0 : parseInt(value) || 0;
                      setCurrentPlan({
                        ...currentPlan,
                        duration_days: days,
                        duration_months: days > 0 ? 0 : currentPlan.duration_months
                      });
                    }}
                    placeholder="0"
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
                  <div
                    key={index}
                    onDragOver={(e) => handleDragOver(e, index)}
                    className={`border rounded-lg p-3 space-y-3 transition-all ${draggedIndex === index ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragEnd={handleDragEnd}
                          className="cursor-move p-1 hover:bg-muted rounded"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Label className="text-sm font-medium">Feature</Label>
                      </div>
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Archive className="h-6 w-6 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-xl">Archive Plan</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-base space-y-3 pt-2 text-muted-foreground">
                <p>
                  Are you sure you want to archive <span className="font-semibold text-gray-900">"{selectedPlanName}"</span>?
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-orange-900">
                    <strong>What happens when you archive:</strong>
                  </p>
                  <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                    <li>This plan will be hidden from new subscriptions</li>
                    <li>Existing active subscriptions will continue to work</li>
                    <li>You can restore this plan anytime from the Archived Plans tab</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isLoading} className="mt-2 sm:mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Plan
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Discounts</DialogTitle>
            <DialogDescription>
              Add or edit discount options for subscription plans
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Discount Name</Label>
              <Input
                value={discountForm.name}
                onChange={(e) => setDiscountForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Student Discount"
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Amount (₱)</Label>
              <Input
                type="number"
                value={discountForm.amount}
                onChange={(e) => setDiscountForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g., 150"
              />
            </div>

            <div className="space-y-2">
              <Label>Current Discounts</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {discounts.map((discount, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{discount.name} - ₱{discount.amount}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newDiscounts = discounts.filter((_, i) => i !== index)
                        setDiscounts(newDiscounts)
                        // Save to localStorage
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('gym-discounts', JSON.stringify(newDiscounts))
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (discountForm.name && discountForm.amount !== "") {
                  const newDiscounts = [...discounts, { name: discountForm.name, amount: parseInt(discountForm.amount) }]
                  setDiscounts(newDiscounts)
                  // Save to localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('gym-discounts', JSON.stringify(newDiscounts))
                  }
                  setDiscountForm({ name: "", amount: "" })
                }
              }}
              disabled={!discountForm.name || discountForm.amount === ""}
            >
              Add Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionPlans
