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
import { Search, Plus, Edit, Trash2, Loader2, Eye, Package, Tag, X, AlertTriangle, CheckCircle2, Power, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Configure axios defaults
axios.defaults.timeout = 10000
axios.defaults.headers.common["Content-Type"] = "application/json"

const Merchandise = () => {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [merchandise, setMerchandise] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedMerchandise, setSelectedMerchandise] = useState(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState("")
  const [error, setError] = useState("")
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [merchandiseToDeactivate, setMerchandiseToDeactivate] = useState(null)
  const [merchandiseToReactivate, setMerchandiseToReactivate] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showInactive, setShowInactive] = useState(false)
  const [loadingStates, setLoadingStates] = useState({
    fetchingMerchandise: false,
    savingMerchandise: false,
    deactivatingMerchandise: false,
    reactivatingMerchandise: false,
  })

  const setLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  // API URL
  const MERCHANDISE_API = "https://api.cnergy.site/merchandise.php"

  // Normalize image URL to ensure correct format
  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url

    try {
      // If it's already a full URL, check and fix it
      if (url.startsWith('http')) {
        // Extract filename from nested URLs or malformed URLs
        let filename = null
        
        // Check for nested encoding (like serve_image.php?path=serve_image.php%3Fpath%3D...)
        const nestedMatch = url.match(/uploads[%\/]*(?:merchandise[%\/]*)?([a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp))/i)
        if (nestedMatch) {
          filename = nestedMatch[1]
        } else {
          // Try to extract from URL parameters
          try {
            const urlObj = new URL(url)
            const pathParam = urlObj.searchParams.get('path')
            if (pathParam) {
              // Decode and extract filename
              const decoded = decodeURIComponent(pathParam)
              const filenameMatch = decoded.match(/([a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp))$/i)
              if (filenameMatch) {
                filename = filenameMatch[1]
              } else {
                // Try to extract from the path itself
                const pathMatch = pathParam.match(/merchandise[%\/]*([a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp))/i)
                if (pathMatch) {
                  filename = pathMatch[1]
                }
              }
            }
          } catch (e) {
            // If URL parsing fails, try regex extraction
            const directMatch = url.match(/([a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp))$/i)
            if (directMatch) {
              filename = directMatch[1]
            }
          }
        }

        // If we found a filename, construct the correct URL
        if (filename) {
          const encodedPath = `uploads%2Fmerchandise%2F${encodeURIComponent(filename)}`
          return `https://api.cnergy.site/serve_image.php?path=${encodedPath}`
        }

        // If it's already correctly formatted, return as is
        if (url.includes('serve_image.php') && url.includes('uploads') && url.includes('merchandise')) {
          return url
        }
      }

      // If it's a relative path, construct full URL
      if (url.startsWith('uploads/') || url.startsWith('uploads%2F')) {
        const path = url.startsWith('uploads/') 
          ? url.replace('uploads/', 'uploads%2F').replace(/\//g, '%2F')
          : url
        return `https://api.cnergy.site/serve_image.php?path=${path}`
      }

      return url
    } catch (error) {
      console.error('Error normalizing image URL:', error)
      return url
    }
  }

  useEffect(() => {
    fetchMerchandise()
  }, [])

  const fetchMerchandise = async () => {
    setLoadingState("fetchingMerchandise", true)
    try {
      const response = await axios.get(MERCHANDISE_API)
      if (response.data.success && Array.isArray(response.data.merchandise)) {
        // Normalize image URLs for all merchandise items
        const normalizedMerchandise = response.data.merchandise.map(item => ({
          ...item,
          image_url: normalizeImageUrl(item.image_url)
        }))
        setMerchandise(normalizedMerchandise)
        setError("")
      } else {
        setMerchandise([])
        setError(response.data.message || "Failed to fetch merchandise")
      }
    } catch (error) {
      setMerchandise([])
      handleAxiosError(error, "Error fetching merchandise")
    } finally {
      setLoadingState("fetchingMerchandise", false)
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

  const handleFileUpload = async (file, type) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("action", "upload_file")
    formData.append("type", type)

    try {
      const response = await axios.post(MERCHANDISE_API, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success) {
        // Normalize the returned URL to ensure correct format
        const normalizedUrl = normalizeImageUrl(response.data.file_url)
        return normalizedUrl
      } else {
        throw new Error(response.data.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveMerchandise = async () => {
    if (!name.trim()) {
      setError("Merchandise name is required")
      return
    }

    if (!price || parseFloat(price) <= 0) {
      setError("Valid price is required")
      return
    }

    setLoadingState("savingMerchandise", true)
    setError("")

    try {
      let imageUrl = selectedMerchandise?.image_url || ""

      // Upload image if new file selected
      if (imageFile) {
        imageUrl = await handleFileUpload(imageFile, "image")
      } else if (imageUrl) {
        // Normalize existing URL to ensure it's in correct format
        imageUrl = normalizeImageUrl(imageUrl)
      }

      const merchandiseData = {
        name: name.trim(),
        price: parseFloat(price),
        image_url: imageUrl,
        status: "active" // Always active when creating/updating
      }

      let response
      if (selectedMerchandise) {
        // Update existing merchandise
        response = await axios.put(MERCHANDISE_API, {
          id: selectedMerchandise.id,
          ...merchandiseData,
        })
      } else {
        // Create new merchandise
        response = await axios.post(MERCHANDISE_API, merchandiseData)
      }

      if (response.data.success) {
        toast({
          title: selectedMerchandise ? "Item Updated" : "Item Created",
          description: selectedMerchandise 
            ? `"${name.trim()}" has been updated and is now active.`
            : `"${name.trim()}" has been created and is now available.`,
          className: "bg-green-50 border-green-200",
        })
        await fetchMerchandise()
        handleCloseDialog()
      } else {
        setError(response.data.message || "Failed to save merchandise")
        toast({
          title: "Failed to Save Item",
          description: response.data.message || "An error occurred while saving the item. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      handleAxiosError(error, "Error saving merchandise")
      toast({
        title: "Failed to Save Item",
        description: error.response?.data?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingState("savingMerchandise", false)
    }
  }

  const handleDeactivateClick = (item) => {
    setMerchandiseToDeactivate(item)
    setDeactivateDialogOpen(true)
  }

  const handleDeactivateMerchandise = async () => {
    if (!merchandiseToDeactivate) return

    setLoadingState("deactivatingMerchandise", true)
    setError("")

    try {
      const response = await axios.put(MERCHANDISE_API, {
        id: merchandiseToDeactivate.id,
        name: merchandiseToDeactivate.name,
        price: merchandiseToDeactivate.price,
        image_url: merchandiseToDeactivate.image_url || "",
        status: "inactive"
      })

      if (response.data.success) {
        toast({
          title: "Item Deactivated",
          description: `"${merchandiseToDeactivate.name}" has been deactivated and is no longer available. You can reactivate it later if needed.`,
          className: "bg-orange-50 border-orange-200",
        })
        setDeactivateDialogOpen(false)
        setMerchandiseToDeactivate(null)
        await fetchMerchandise()
      } else {
        setError(response.data.message || "Failed to deactivate merchandise")
        toast({
          title: "Deactivation Failed",
          description: response.data.message || "Unable to deactivate the item. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      handleAxiosError(error, "Error deactivating merchandise")
      toast({
        title: "Deactivation Failed",
        description: error.response?.data?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingState("deactivatingMerchandise", false)
    }
  }

  const handleReactivateClick = (item) => {
    setMerchandiseToReactivate(item)
    setReactivateDialogOpen(true)
  }

  const handleReactivateMerchandise = async () => {
    if (!merchandiseToReactivate) return

    setLoadingState("reactivatingMerchandise", true)
    setError("")

    try {
      const response = await axios.put(MERCHANDISE_API, {
        id: merchandiseToReactivate.id,
        name: merchandiseToReactivate.name,
        price: merchandiseToReactivate.price,
        image_url: merchandiseToReactivate.image_url || "",
        status: "active"
      })

      if (response.data.success) {
        toast({
          title: "Item Reactivated",
          description: `"${merchandiseToReactivate.name}" has been reactivated and is now available.`,
          className: "bg-green-50 border-green-200",
        })
        setReactivateDialogOpen(false)
        setMerchandiseToReactivate(null)
        await fetchMerchandise()
      } else {
        setError(response.data.message || "Failed to reactivate merchandise")
        toast({
          title: "Reactivation Failed",
          description: response.data.message || "Unable to reactivate the item. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      handleAxiosError(error, "Error reactivating merchandise")
      toast({
        title: "Reactivation Failed",
        description: error.response?.data?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingState("reactivatingMerchandise", false)
    }
  }

  const handleEditMerchandise = (item) => {
    if (!item) return
    
    setSelectedMerchandise(item)
    setName(item?.name || "")
    setPrice(item?.price ? item.price.toString() : "")
    setImageUrl(item?.image_url || "")
    setImagePreview(item?.image_url || "")
    setImageFile(null)
    setDialogOpen(true)
  }

  const handleAddMerchandise = () => {
    setSelectedMerchandise(null)
    setName("")
    setPrice("")
    setImageUrl("")
    setImagePreview("")
    setImageFile(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedMerchandise(null)
    setName("")
    setPrice("")
    setImageUrl("")
    setImagePreview("")
    setImageFile(null)
    setError("")
  }

  const handleViewMerchandise = (item) => {
    if (!item) return
    
    setSelectedMerchandise(item)
    setViewDialogOpen(true)
  }

  const getStatusBadge = (item) => {
    if (!item) return <Badge variant="secondary" className="text-xs px-2 py-0.5">Unknown</Badge>
    
    if (item?.status === 'inactive') {
      return <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-700 border border-gray-200">Inactive</Badge>
    }
    
    return <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-green-50 text-green-700 border border-green-200">Active</Badge>
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const filteredMerchandise = (merchandise || []).filter((item) => {
    if (!item) return false
    
    // Filter by active/inactive status
    const isActive = item?.status === 'active'
    if (showInactive && isActive) return false
    if (!showInactive && !isActive) return false
    
    // Filter by search query
    const matchesSearch = item?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredMerchandise.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMerchandise = filteredMerchandise.slice(startIndex, endIndex)

  // Reset to page 1 when search query or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, showInactive])


  return (
    <div className="space-y-6">
      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-1.5 rounded-md bg-gray-100 text-gray-700">
                  <Package className="h-4 w-4" />
                </div>
                Merchandise
                {loadingStates.fetchingMerchandise && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
              </CardTitle>
              <CardDescription>Manage gym merchandise, supplements, and products</CardDescription>
            </div>
            <Button 
              onClick={handleAddMerchandise} 
              disabled={loadingStates.savingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
              className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
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
                placeholder="Search merchandise..."
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
                  <TableHead className="font-semibold text-gray-900 py-3 px-4 w-[30%]">Name</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-4 w-[15%]">Price</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-4 w-[15%]">Image</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-4 w-[15%]">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-3 px-4 text-center w-[25%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchandise.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {loadingStates.fetchingMerchandise
                        ? "Loading merchandise..."
                        : searchQuery
                          ? `No ${showInactive ? 'inactive' : 'active'} merchandise found matching your search`
                          : `No ${showInactive ? 'inactive' : 'active'} merchandise found`}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMerchandise.map((item) => {
                    if (!item) return null
                    return (
                      <TableRow key={item?.id} className="hover:bg-gray-50/50 transition-colors border-b">
                        <TableCell className="font-medium text-gray-900 py-3 px-4">
                          <div className="max-w-[200px] truncate" title={item?.name || "N/A"}>
                            {item?.name || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{formatCurrency(item?.price || 0)}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {item?.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item?.name || "Item"}
                              className="w-12 h-12 object-cover rounded border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                const placeholder = e.target.nextElementSibling
                                if (placeholder) {
                                  placeholder.classList.remove('hidden')
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center ${item?.image_url ? 'hidden' : ''}`}>
                            <span className="text-xs font-medium text-gray-500">Image</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">{getStatusBadge(item)}</TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex gap-1.5 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewMerchandise(item)}
                              disabled={loadingStates.savingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMerchandise(item)}
                              disabled={loadingStates.savingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {item?.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateClick(item)}
                                disabled={loadingStates.savingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
                                className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                title="Deactivate"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                            {item?.status === 'inactive' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivateClick(item)}
                                disabled={loadingStates.savingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
                                className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                                title="Reactivate"
                              >
                                <RotateCcw className="h-4 w-4" />
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

          {/* Pagination */}
          {filteredMerchandise.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{" "}
                <span className="font-medium text-gray-900">{Math.min(endIndex, filteredMerchandise.length)}</span> of{" "}
                <span className="font-medium text-gray-900">{filteredMerchandise.length}</span> items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loadingStates.fetchingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
                  className="h-9 border-gray-300 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          disabled={loadingStates.fetchingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
                          className={`h-9 min-w-[36px] ${
                            currentPage === page
                              ? "bg-gray-900 hover:bg-gray-800 text-white"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </Button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-gray-500">
                          ...
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loadingStates.fetchingMerchandise || loadingStates.deactivatingMerchandise || loadingStates.reactivatingMerchandise}
                  className="h-9 border-gray-300 hover:bg-gray-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Merchandise Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" hideClose>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900">{selectedMerchandise ? "Edit Merchandise" : "Add New Merchandise"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Item Name</Label>
              <Input
                id="name"
                placeholder="Enter item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loadingStates.savingMerchandise}
                className="h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium text-gray-700">Price</Label>
              <Input
                id="price"
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loadingStates.savingMerchandise}
                min="0"
                step="0.01"
                className="h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Merchandise Image</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loadingStates.savingMerchandise}
                    className="flex-1 h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                  {imagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImagePreview("")
                        setImageFile(null)
                      }}
                      disabled={loadingStates.savingMerchandise}
                      className="h-10 px-3 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                      title="Remove image"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Remove
                    </Button>
                  )}
                </div>
                {imagePreview && (
                  <div className="flex justify-center pt-2">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-40 h-40 object-cover rounded-lg border-2 border-gray-200 shadow-md"
                      />
                      <div className="absolute -top-2 -right-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setImagePreview("")
                            setImageFile(null)
                          }}
                          disabled={loadingStates.savingMerchandise}
                          className="h-6 w-6 rounded-full p-0 shadow-md hover:shadow-lg"
                          title="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
              disabled={loadingStates.savingMerchandise}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveMerchandise}
              disabled={
                !name.trim() ||
                !price ||
                parseFloat(price) <= 0 ||
                loadingStates.savingMerchandise
              }
              className="bg-gray-900 hover:bg-gray-800 text-white min-w-[100px] shadow-sm"
            >
              {loadingStates.savingMerchandise ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedMerchandise ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Merchandise Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900">{selectedMerchandise?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-5">
            {/* Image Section */}
            <div className="flex justify-center">
              {selectedMerchandise?.image_url ? (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 w-full">
                  <img 
                    src={selectedMerchandise.image_url} 
                    alt={selectedMerchandise.name}
                    className="w-full h-auto max-h-80 object-contain rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const placeholder = e.target.nextElementSibling
                      if (placeholder) {
                        placeholder.classList.remove('hidden')
                      }
                    }}
                  />
                  <div className="hidden w-20 h-20 bg-gray-100 rounded-lg border border-gray-200"></div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 w-full flex justify-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200"></div>
                </div>
              )}
            </div>
            
            {/* Details Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</h4>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(selectedMerchandise?.price || 0)}
                  </div>
                </div>
                
                <div className="space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</h4>
                  <div className="flex items-center">
                    {getStatusBadge(selectedMerchandise)}
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Created</h4>
                <p className="text-sm font-medium text-gray-900">{formatDate(selectedMerchandise?.created_at)}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t mt-4">
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
          setMerchandiseToDeactivate(null)
          setError("")
        }
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Power className="h-5 w-5 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-xl">Deactivate Merchandise Item</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to deactivate <span className="font-semibold text-foreground">"{merchandiseToDeactivate?.name}"</span>?
            </AlertDialogDescription>
            <div className="mt-4 p-3 bg-muted/50 rounded-md border border-orange-200">
              <p className="text-sm text-muted-foreground">
                This item will be marked as inactive and will no longer be visible to users. You can reactivate it later if needed.
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
                setMerchandiseToDeactivate(null)
                setError("")
              }}
              disabled={loadingStates.deactivatingMerchandise}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateMerchandise}
              disabled={loadingStates.deactivatingMerchandise}
              className="bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500"
            >
              {loadingStates.deactivatingMerchandise ? (
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

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={(open) => {
        setReactivateDialogOpen(open)
        if (!open) {
          setMerchandiseToReactivate(null)
          setError("")
        }
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <RotateCcw className="h-5 w-5 text-green-600" />
              </div>
              <AlertDialogTitle className="text-xl">Reactivate Merchandise Item</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to reactivate <span className="font-semibold text-foreground">"{merchandiseToReactivate?.name}"</span>?
            </AlertDialogDescription>
            <div className="mt-4 p-3 bg-muted/50 rounded-md border border-green-200">
              <p className="text-sm text-muted-foreground">
                This item will be marked as active and will be visible to users again.
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
                setMerchandiseToReactivate(null)
                setError("")
              }}
              disabled={loadingStates.reactivatingMerchandise}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateMerchandise}
              disabled={loadingStates.reactivatingMerchandise}
              className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
            >
              {loadingStates.reactivatingMerchandise ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reactivate
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Merchandise





