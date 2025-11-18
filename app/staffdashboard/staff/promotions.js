"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Edit, Loader2, Eye, Calendar, Percent, Power, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

// Configure axios defaults
axios.defaults.timeout = 10000
axios.defaults.headers.common["Content-Type"] = "application/json"

const Promotions = () => {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [promotions, setPromotions] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [promotionToDeactivate, setPromotionToDeactivate] = useState(null)
  const [selectedPromotion, setSelectedPromotion] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState("")
  const [loadingStates, setLoadingStates] = useState({
    fetchingPromotions: false,
    savingPromotion: false,
    deactivatingPromotion: false,
  })

  // Add error boundary state
  const [hasError, setHasError] = useState(false)

  const setLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  // API URL
  const PROMOTIONS_API = "https://api.cnergy.site/promotions.php"

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    setLoadingState("fetchingPromotions", true)
    try {
      const response = await axios.get(PROMOTIONS_API)
      if (response.data.success && Array.isArray(response.data.promotions)) {
        // Sanitize data to ensure all properties exist
        const safePromotions = response.data.promotions.map(promotion => ({
          id: promotion?.id || null,
          title: promotion?.title || "",
          description: promotion?.description || "",
          icon: promotion?.icon || "",
          start_date: promotion?.start_date || "",
          end_date: promotion?.end_date || "",
          is_active: promotion?.is_active || 0,
          created_at: promotion?.created_at || ""
        }))
        setPromotions(safePromotions)
        setError("")
      } else {
        setPromotions([])
        setError(response.data.message || "Failed to fetch promotions")
      }
    } catch (error) {
      setPromotions([])
      handleAxiosError(error, "Error fetching promotions")
    } finally {
      setLoadingState("fetchingPromotions", false)
    }
  }

  const handleAxiosError = (error, defaultMessage) => {
    let errorMessage = defaultMessage

    if (error.response) {
      errorMessage = error.response.data?.message || `Server error: ${error.response.status}`
    } else if (error.request) {
      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timeout - please try again"
      } else {
        errorMessage = "Unable to connect to server - check your connection"
      }
    } else {
      errorMessage = error.message || defaultMessage
    }

    setError(errorMessage)
    console.error(defaultMessage, error)
  }

  const handleSavePromotion = async () => {
    if (!title.trim()) {
      setError("Promotion title is required")
      return
    }

    if (!startDate) {
      setError("Start date is required")
      return
    }

    setLoadingState("savingPromotion", true)
    setError("")

    try {
      // Automatically determine is_active based on dates
      // Get today's date in Philippines timezone (UTC+8) - date only, no time
      const now = new Date()
      const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
      const todayYear = philippinesTime.getFullYear()
      const todayMonth = philippinesTime.getMonth()
      const todayDay = philippinesTime.getDate()
      const today = new Date(todayYear, todayMonth, todayDay)
      
      // Parse start date (date only, no time)
      const startParts = startDate.split('-')
      const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
      
      // Auto-calculate end_date if not provided (30 days from start_date)
      let finalEndDate = endDate
      if (!finalEndDate && startDate) {
        const startDateObj = new Date(startDate)
        startDateObj.setDate(startDateObj.getDate() + 30)
        const year = startDateObj.getFullYear()
        const month = String(startDateObj.getMonth() + 1).padStart(2, '0')
        const day = String(startDateObj.getDate()).padStart(2, '0')
        finalEndDate = `${year}-${month}-${day}`
      }
      
      // Parse end date if provided
      let end = null
      if (finalEndDate) {
        const endParts = finalEndDate.split('-')
        end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))
      }
      
      // Set is_active = 1 if:
      // - Start date is today or in the past (and not expired), OR
      // - Start date is in the future (upcoming/pending promotions)
      // This ensures upcoming promotions show in Active tab
      const isActive = (!end || today <= end) // Not expired, regardless of start date

      const promotionData = {
        title: title.trim(),
        description: description.trim(),
        icon: "", // Icon removed
        start_date: startDate,
        end_date: finalEndDate || null,
        is_active: isActive ? 1 : 0
      }

      let response
      if (selectedPromotion) {
        // Update existing promotion
        response = await axios.put(PROMOTIONS_API, {
          id: selectedPromotion.id,
          ...promotionData,
        })
      } else {
        // Create new promotion
        response = await axios.post(PROMOTIONS_API, promotionData)
      }

      if (response.data.success) {
        // Show success toast
        toast({
          title: selectedPromotion ? "Promotion Updated" : "Promotion Created",
          description: selectedPromotion 
            ? `"${title.trim()}" has been updated and is now ${startDate && new Date(startDate) > new Date() ? 'scheduled' : 'active'}.`
            : `"${title.trim()}" has been created and is now ${startDate && new Date(startDate) > new Date() ? 'scheduled to start' : 'active'}.`,
          className: "bg-green-50 border-green-200",
        })
        await fetchPromotions()
        handleCloseDialog()
      } else {
        setError(response.data.message || "Failed to save promotion")
        toast({
          title: "Failed to Save Promotion",
          description: response.data.message || "An error occurred while saving the promotion. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      handleAxiosError(error, "Error saving promotion")
      toast({
        title: "Failed to Save Promotion",
        description: error.response?.data?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingState("savingPromotion", false)
    }
  }

  const handleDeactivateClick = (promotion) => {
    setPromotionToDeactivate(promotion)
    setDeactivateDialogOpen(true)
  }

  const handleDeactivatePromotion = async () => {
    if (!promotionToDeactivate) return

    setLoadingState("deactivatingPromotion", true)
    setError("")

    try {
      // Update promotion with is_active = 0
      const response = await axios.put(PROMOTIONS_API, {
        id: promotionToDeactivate.id,
        title: promotionToDeactivate.title,
        description: promotionToDeactivate.description || "",
        icon: promotionToDeactivate.icon || "",
        start_date: promotionToDeactivate.start_date,
        end_date: promotionToDeactivate.end_date || null,
        is_active: 0
      })

      if (response.data.success) {
        // Show success toast
        toast({
          title: "Promotion Deactivated",
          description: `"${promotionToDeactivate.title}" has been deactivated and moved to the inactive tab. You can reactivate it later if needed.`,
          className: "bg-orange-50 border-orange-200",
        })
        setDeactivateDialogOpen(false)
        setPromotionToDeactivate(null)
        await fetchPromotions()
      } else {
        setError(response.data.message || "Failed to deactivate promotion")
        toast({
          title: "Deactivation Failed",
          description: response.data.message || "Unable to deactivate the promotion. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Deactivate error:", error.response?.data)
      const errorMessage = error.response?.data?.message || "An unexpected error occurred while deactivating the promotion."
      setError(errorMessage)
      toast({
        title: "Deactivation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingState("deactivatingPromotion", false)
    }
  }

  const handleEditPromotion = (promotion) => {
    if (!promotion) return
    
    setSelectedPromotion(promotion)
    setTitle(promotion?.title || "")
    setDescription(promotion?.description || "")
    setIcon("") // Icon removed
    setStartDate(promotion?.start_date || "")
    setEndDate(promotion?.end_date || "")
    setIsActive(true) // Will be determined by dates
    setDialogOpen(true)
  }

  const handleAddPromotion = () => {
    // Get today's date in Philippines timezone (UTC+8)
    const now = new Date()
    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
    const year = philippinesTime.getFullYear()
    const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
    const day = String(philippinesTime.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`
    
    setSelectedPromotion(null)
    setTitle("")
    setDescription("")
    setIcon("") // Icon removed
    setStartDate(todayStr) // Default to today in Philippines timezone
    setEndDate("") // Optional, no default
    setIsActive(true) // Will be determined by dates
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedPromotion(null)
    setTitle("")
    setDescription("")
    setIcon("") // Icon removed
    setStartDate("")
    setEndDate("")
    setIsActive(true)
    setError("")
  }

  const handleViewPromotion = (promotion) => {
    if (!promotion) return
    
    setSelectedPromotion(promotion)
    setViewDialogOpen(true)
  }

  const getStatusBadge = (promotion) => {
    if (!promotion) return <Badge variant="secondary" className="text-xs px-2 py-0.5">Unknown</Badge>
    
    // Get today's date in Philippines timezone (UTC+8) - date only
    const now = new Date()
    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
    const todayYear = philippinesTime.getFullYear()
    const todayMonth = philippinesTime.getMonth()
    const todayDay = philippinesTime.getDate()
    const today = new Date(todayYear, todayMonth, todayDay)
    
    // Parse dates (date only, no time)
    let startDate = null
    if (promotion?.start_date) {
      const startParts = promotion.start_date.split('-')
      startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
    }
    
    let endDate = null
    if (promotion?.end_date) {
      const endParts = promotion.end_date.split('-')
      endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))
    }
    
    // If manually set to inactive, show inactive (unless dates override)
    if (promotion?.is_active == 0) {
      // Check if dates say it should be active
      if (startDate && today >= startDate && (!endDate || today <= endDate)) {
        // Dates say active, but manually deactivated - show inactive
        return <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-700 border border-gray-200">Inactive</Badge>
      }
      return <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-700 border border-gray-200">Inactive</Badge>
    }
    
    // Status is automatically determined by dates
    if (startDate && today < startDate) {
      return <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-orange-50 text-orange-700 border border-orange-200">Upcoming</Badge>
    }
    
    // If end date has passed, automatically inactive
    if (endDate && today > endDate) {
      return <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-700 border border-gray-200">Inactive</Badge>
    }
    
    if (startDate && today >= startDate && (!endDate || today <= endDate)) {
      return <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs px-2 py-0.5 font-medium border border-green-200">Active</Badge>
    }
    
    return <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-700 border border-gray-200">Inactive</Badge>
  }

  const isPromotionActive = (promotion) => {
    if (!promotion) return false
    
    // Get today's date in Philippines timezone (UTC+8) - date only
    const now = new Date()
    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
    const todayYear = philippinesTime.getFullYear()
    const todayMonth = philippinesTime.getMonth()
    const todayDay = philippinesTime.getDate()
    const today = new Date(todayYear, todayMonth, todayDay)
    
    // Parse dates (date only, no time)
    let startDate = null
    if (promotion?.start_date) {
      const startParts = promotion.start_date.split('-')
      startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
    }
    
    let endDate = null
    if (promotion?.end_date) {
      const endParts = promotion.end_date.split('-')
      endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))
    }
    
    // If manually deactivated (is_active = 0), check if it should still be active based on dates
    // If end date has passed, it's inactive
    if (endDate && today > endDate) return false
    
    // If manually set to inactive and dates don't override it, it's inactive
    // But if dates say it should be active, prioritize dates
    if (promotion?.is_active == 0) {
      // Check if dates say it should be active
      if (startDate && today >= startDate && (!endDate || today <= endDate)) {
        // Dates say active, but manually deactivated - still show as inactive
        return false
      }
      return false
    }
    
    // Active if start date has passed or is today, and (no end date or end date hasn't passed)
    // Also include upcoming promotions (start date in future) in Active tab
    if (startDate) {
      // Include if: start date is today or in the past (and not expired), OR start date is in the future (upcoming)
      return (today >= startDate && (!endDate || today <= endDate)) || today < startDate
    }
    
    return false
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }


  const filteredPromotions = (promotions || []).filter((promotion) => {
    if (!promotion) return false
    
    // Get today's date in Philippines timezone (UTC+8) - date only
    const now = new Date()
    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
    const todayYear = philippinesTime.getFullYear()
    const todayMonth = philippinesTime.getMonth()
    const todayDay = philippinesTime.getDate()
    const today = new Date(todayYear, todayMonth, todayDay)
    
    // Parse dates
    let startDate = null
    if (promotion?.start_date) {
      const startParts = promotion.start_date.split('-')
      startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
    }
    
    let endDate = null
    if (promotion?.end_date) {
      const endParts = promotion.end_date.split('-')
      endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))
    }
    
    // Determine if promotion should be in Active or Inactive tab
    let shouldShowInActive = false
    
    // First check if manually deactivated - always goes to Inactive tab
    if (promotion?.is_active == 0) {
      shouldShowInActive = false // Manually deactivated promotions always go to Inactive
    }
    // Check if expired (end date has passed)
    else if (endDate && today > endDate) {
      shouldShowInActive = false
    }
    else {
      // Check based on dates
      if (startDate) {
        // Active if: start date is today or in the past (and not expired), OR start date is in the future (upcoming/pending)
        shouldShowInActive = (today >= startDate && (!endDate || today <= endDate)) || today < startDate
      } else {
        shouldShowInActive = false
      }
    }
    
    // Filter by active/inactive status
    if (showInactive && shouldShowInActive) return false
    if (!showInactive && !shouldShowInActive) return false
    
    // Filter by search query
    return promotion?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           promotion?.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Error boundary fallback
  if (hasError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading the promotions page. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  try {
    return (
      <div className="space-y-6">
      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-1.5 rounded-md bg-gray-100 text-gray-700">
                  <Percent className="h-4 w-4" />
                </div>
                Promotions
                {loadingStates.fetchingPromotions && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
              </CardTitle>
              <CardDescription>Create and manage promotional offers and discounts</CardDescription>
            </div>
            <Button 
              onClick={handleAddPromotion} 
              disabled={loadingStates.savingPromotion || loadingStates.deactivatingPromotion}
              className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Promotion
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search promotions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tabs value={showInactive ? "inactive" : "active"} onValueChange={(value) => setShowInactive(value === "inactive")}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="rounded-md border border-gray-200 shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow className="hover:bg-gray-50 border-b">
                  <TableHead className="font-semibold text-gray-900 py-3 px-3">Title</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-3">Description</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-3">Period</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-3">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-3 text-center w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {loadingStates.fetchingPromotions
                        ? "Loading promotions..."
                        : searchQuery
                          ? "No promotions found matching your search"
                          : "No promotions found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPromotions.map((promotion) => {
                    if (!promotion) return null
                    return (
                      <TableRow key={promotion?.id} className="hover:bg-gray-50/50 transition-colors border-b">
                        <TableCell className="font-medium text-gray-900 py-3 px-3">
                          {promotion?.title || "N/A"}
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <div className="text-sm text-gray-700 max-w-xs truncate">
                            {promotion?.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-1.5 text-gray-900">
                              <Calendar className="h-3.5 w-3.5 text-gray-500" />
                              <span>{formatDate(promotion?.start_date)}</span>
                            </div>
                            {promotion?.end_date && (
                              <div className="text-gray-600 mt-0.5 ml-5 text-xs">
                                to {formatDate(promotion?.end_date)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          {getStatusBadge(promotion)}
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <div className="flex gap-1.5 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPromotion(promotion)}
                              disabled={loadingStates.savingPromotion || loadingStates.deactivatingPromotion}
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPromotion(promotion)}
                              disabled={loadingStates.savingPromotion || loadingStates.deactivatingPromotion}
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isPromotionActive(promotion) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateClick(promotion)}
                                disabled={loadingStates.savingPromotion || loadingStates.deactivatingPromotion}
                                className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                title="Deactivate"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Promotion Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" hideClose>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">{selectedPromotion ? "Edit Promotion" : "Add New Promotion"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">Promotion Title</Label>
              <Input
                id="title"
                placeholder="Enter promotion title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loadingStates.savingPromotion}
                className="h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter promotion description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loadingStates.savingPromotion}
                rows={3}
                className="resize-none border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const selectedDate = e.target.value
                    if (!selectedDate) {
                      setStartDate("")
                      return
                    }
                    
                    // Get today's date in Philippines timezone (UTC+8)
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
                    const year = philippinesTime.getFullYear()
                    const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
                    const day = String(philippinesTime.getDate()).padStart(2, '0')
                    const todayStr = `${year}-${month}-${day}`
                    
                    // Only allow dates from today onwards
                    if (selectedDate >= todayStr) {
                      setStartDate(selectedDate)
                    } else {
                      // If past date selected, set to today
                      setStartDate(todayStr)
                      setError("Start date cannot be in the past. Set to today's date.")
                      setTimeout(() => setError(""), 3000)
                    }
                  }}
                  onBlur={(e) => {
                    const selectedDate = e.target.value
                    if (!selectedDate) return
                    
                    // Get today's date in Philippines timezone (UTC+8)
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
                    const year = philippinesTime.getFullYear()
                    const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
                    const day = String(philippinesTime.getDate()).padStart(2, '0')
                    const todayStr = `${year}-${month}-${day}`
                    
                    // If past date, reset to today
                    if (selectedDate < todayStr) {
                      setStartDate(todayStr)
                      setError("Start date cannot be in the past. Set to today's date.")
                      setTimeout(() => setError(""), 3000)
                    }
                  }}
                  disabled={loadingStates.savingPromotion || !!selectedPromotion}
                  min={(() => {
                    // Get today's date in Philippines timezone (UTC+8)
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
                    const year = philippinesTime.getFullYear()
                    const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
                    const day = String(philippinesTime.getDate()).padStart(2, '0')
                    return `${year}-${month}-${day}`
                  })()}
                  className="h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
                {selectedPromotion && (
                  <p className="text-xs text-gray-500 mt-1">Start date cannot be changed after creation</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                  End Date <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value
                    // Get today's date in Philippines timezone
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)
                    
                    // Parse selected date
                    const endParts = newEndDate.split('-')
                    const selectedDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))
                    
                    // Prevent selecting dates in the past
                    if (selectedDate < today) {
                      setError("End date cannot be in the past. Please select today or a future date.")
                      setTimeout(() => setError(""), 3000)
                      return
                    }
                    
                    // Ensure end date is not before start date
                    if (startDate) {
                      const startParts = startDate.split('-')
                      const startDateObj = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
                      if (selectedDate < startDateObj) {
                        setError("End date cannot be before start date. Please select a date on or after the start date.")
                        setTimeout(() => setError(""), 3000)
                        return
                      }
                    }
                    
                    setEndDate(newEndDate)
                  }}
                  disabled={loadingStates.savingPromotion}
                  min={(() => {
                    // Use the later of today or start_date
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)
                    
                    if (startDate) {
                      const startParts = startDate.split('-')
                      const startDateObj = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
                      // Return the later date (today or start_date)
                      const minDate = startDateObj > today ? startDateObj : today
                      const year = minDate.getFullYear()
                      const month = String(minDate.getMonth() + 1).padStart(2, '0')
                      const day = String(minDate.getDate()).padStart(2, '0')
                      return `${year}-${month}-${day}`
                    }
                    
                    const year = todayYear
                    const month = String(todayMonth + 1).padStart(2, '0')
                    const day = String(todayDay).padStart(2, '0')
                    return `${year}-${month}-${day}`
                  })()}
                  className="h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Will automatically be set to 30 days from start date if left empty</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="pt-5 border-t gap-3">
            <Button 
              variant="outline" 
              onClick={handleCloseDialog} 
              disabled={loadingStates.savingPromotion}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePromotion}
              disabled={
                !title.trim() ||
                !startDate ||
                loadingStates.savingPromotion
              }
              className="bg-gray-900 hover:bg-gray-800 text-white min-w-[100px] shadow-sm"
            >
              {loadingStates.savingPromotion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedPromotion ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Promotion Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl" hideClose>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900">{selectedPromotion?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-5">
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-900 uppercase tracking-wide">Description</h4>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                {selectedPromotion?.description || "No description available"}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-900 uppercase tracking-wide">Status</h4>
              <div className="flex items-center">
                {getStatusBadge(selectedPromotion)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div>
                <h4 className="font-semibold text-sm mb-3 text-gray-900 uppercase tracking-wide">Start Date</h4>
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="font-medium">{formatDate(selectedPromotion?.start_date)}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-3 text-gray-900 uppercase tracking-wide">End Date</h4>
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="font-medium">{formatDate(selectedPromotion?.end_date) || "No end date"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-5 border-t">
            <Button 
              onClick={() => setViewDialogOpen(false)}
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={(open) => {
        setDeactivateDialogOpen(open)
        if (!open) {
          setPromotionToDeactivate(null)
          setError("")
        }
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Power className="h-5 w-5 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-xl">Deactivate Promotion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to deactivate <span className="font-semibold text-foreground">"{promotionToDeactivate?.title}"</span>?
            </AlertDialogDescription>
            <div className="mt-4 p-3 bg-muted/50 rounded-md border border-orange-200">
              <p className="text-sm text-muted-foreground">
                This promotion will be marked as inactive and will no longer be visible to users. You can reactivate it later if needed.
              </p>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="ml-2">{error}</AlertDescription>
              </Alert>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row sm:justify-end gap-2 mt-6">
            <AlertDialogCancel
              onClick={() => {
                setPromotionToDeactivate(null)
                setError("")
              }}
              disabled={loadingStates.deactivatingPromotion}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivatePromotion}
              disabled={loadingStates.deactivatingPromotion}
              className="bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500"
            >
              {loadingStates.deactivatingPromotion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    )
  } catch (error) {
    console.error('Error in Promotions component:', error)
    setHasError(true)
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading the promotions page. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

export default Promotions


