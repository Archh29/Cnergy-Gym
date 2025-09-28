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
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2, Loader2, Eye, Calendar, Percent } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// Configure axios defaults
axios.defaults.timeout = 10000
axios.defaults.headers.common["Content-Type"] = "application/json"

const Promotions = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [promotions, setPromotions] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState("")
  const [loadingStates, setLoadingStates] = useState({
    fetchingPromotions: false,
    savingPromotion: false,
    deletingPromotion: false,
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

    setLoadingState("savingPromotion", true)
    setError("")

    try {
      const promotionData = {
        title: title.trim(),
        description: description.trim(),
        icon: icon.trim(),
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
        await fetchPromotions()
        handleCloseDialog()
      } else {
        setError(response.data.message || "Failed to save promotion")
      }
    } catch (error) {
      handleAxiosError(error, "Error saving promotion")
    } finally {
      setLoadingState("savingPromotion", false)
    }
  }

  const handleDeletePromotion = async (id) => {
    if (!confirm("Are you sure you want to delete this promotion?")) {
      return
    }

    setLoadingState("deletingPromotion", true)
    setError("")

    try {
      const response = await axios.delete(PROMOTIONS_API, {
        data: { id },
      })

      if (response.data.success) {
        await fetchPromotions()
      } else {
        setError(response.data.message || "Failed to delete promotion")
      }
    } catch (error) {
      handleAxiosError(error, "Error deleting promotion")
    } finally {
      setLoadingState("deletingPromotion", false)
    }
  }

  const handleEditPromotion = (promotion) => {
    if (!promotion) return
    
    setSelectedPromotion(promotion)
    setTitle(promotion?.title || "")
    setDescription(promotion?.description || "")
    setIcon(promotion?.icon || "")
    setStartDate(promotion?.start_date || "")
    setEndDate(promotion?.end_date || "")
    setIsActive(promotion?.is_active == 1)
    setDialogOpen(true)
  }

  const handleAddPromotion = () => {
    setSelectedPromotion(null)
    setTitle("")
    setDescription("")
    setIcon("")
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setIsActive(true)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedPromotion(null)
    setTitle("")
    setDescription("")
    setIcon("")
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
    if (!promotion) return <Badge variant="secondary">Unknown</Badge>
    
    const now = new Date()
    const startDate = promotion?.start_date ? new Date(promotion.start_date) : null
    const endDate = promotion?.end_date ? new Date(promotion.end_date) : null
    
    if (!promotion?.is_active) {
      return <Badge variant="destructive">Inactive</Badge>
    }
    
    if (startDate && now < startDate) {
      return <Badge variant="secondary">Upcoming</Badge>
    }
    
    if (endDate && now > endDate) {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }


  const filteredPromotions = (promotions || []).filter((promotion) => {
    if (!promotion) return false
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Promotions
                {loadingStates.fetchingPromotions && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>Create and manage promotional offers and discounts</CardDescription>
            </div>
            <Button onClick={handleAddPromotion} disabled={loadingStates.savingPromotion || loadingStates.deletingPromotion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Promotion
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search promotions..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
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
                      <TableRow key={promotion?.id}>
                        <TableCell className="font-medium">{promotion?.title || "N/A"}</TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {promotion?.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(promotion?.start_date)}
                            </div>
                            {promotion?.end_date && (
                              <div className="text-muted-foreground">
                                to {formatDate(promotion?.end_date)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(promotion)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPromotion(promotion)}
                            disabled={loadingStates.savingPromotion || loadingStates.deletingPromotion}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPromotion(promotion)}
                            disabled={loadingStates.savingPromotion || loadingStates.deletingPromotion}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePromotion(promotion?.id)}
                            disabled={loadingStates.savingPromotion || loadingStates.deletingPromotion}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPromotion ? "Edit Promotion" : "Add New Promotion"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Promotion Title *</Label>
              <Input
                id="title"
                placeholder="Enter promotion title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loadingStates.savingPromotion}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter promotion description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loadingStates.savingPromotion}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                placeholder="Enter icon name (e.g., percent, gift, star)"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                disabled={loadingStates.savingPromotion}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loadingStates.savingPromotion}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={loadingStates.savingPromotion}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={loadingStates.savingPromotion}
              />
              <Label htmlFor="isActive">Active Promotion</Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={loadingStates.savingPromotion}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePromotion}
              disabled={
                !title.trim() ||
                loadingStates.savingPromotion
              }
            >
              {loadingStates.savingPromotion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedPromotion ? (
                "Update Promotion"
              ) : (
                "Create Promotion"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Promotion Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPromotion?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{selectedPromotion?.description || "No description available"}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Icon</h4>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {selectedPromotion?.icon || "No icon"}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                {getStatusBadge(selectedPromotion)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Start Date</h4>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(selectedPromotion?.start_date)}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">End Date</h4>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(selectedPromotion?.end_date) || "No end date"}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
