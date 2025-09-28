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
import { Search, Plus, Edit, Trash2, Loader2, Eye, Package, Tag } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// Configure axios defaults
axios.defaults.timeout = 10000
axios.defaults.headers.common["Content-Type"] = "application/json"

const Merchandise = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [merchandise, setMerchandise] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedMerchandise, setSelectedMerchandise] = useState(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [status, setStatus] = useState("active")
  const [error, setError] = useState("")
  const [loadingStates, setLoadingStates] = useState({
    fetchingMerchandise: false,
    savingMerchandise: false,
    deletingMerchandise: false,
  })

  const setLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  // API URL
  const MERCHANDISE_API = "https://api.cnergy.site/merchandise.php"


  useEffect(() => {
    fetchMerchandise()
  }, [])

  const fetchMerchandise = async () => {
    setLoadingState("fetchingMerchandise", true)
    try {
      const response = await axios.get(MERCHANDISE_API)
      if (response.data.success && Array.isArray(response.data.merchandise)) {
        setMerchandise(response.data.merchandise)
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
      const merchandiseData = {
        name: name.trim(),
        price: parseFloat(price),
        image_url: imageUrl.trim(),
        status: status
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
        await fetchMerchandise()
        handleCloseDialog()
      } else {
        setError(response.data.message || "Failed to save merchandise")
      }
    } catch (error) {
      handleAxiosError(error, "Error saving merchandise")
    } finally {
      setLoadingState("savingMerchandise", false)
    }
  }

  const handleDeleteMerchandise = async (id) => {
    if (!confirm("Are you sure you want to delete this merchandise item?")) {
      return
    }

    setLoadingState("deletingMerchandise", true)
    setError("")

    try {
      const response = await axios.delete(MERCHANDISE_API, {
        data: { id },
      })

      if (response.data.success) {
        await fetchMerchandise()
      } else {
        setError(response.data.message || "Failed to delete merchandise")
      }
    } catch (error) {
      handleAxiosError(error, "Error deleting merchandise")
    } finally {
      setLoadingState("deletingMerchandise", false)
    }
  }

  const handleEditMerchandise = (item) => {
    if (!item) return
    
    setSelectedMerchandise(item)
    setName(item?.name || "")
    setPrice(item?.price ? item.price.toString() : "")
    setImageUrl(item?.image_url || "")
    setStatus(item?.status || "active")
    setDialogOpen(true)
  }

  const handleAddMerchandise = () => {
    setSelectedMerchandise(null)
    setName("")
    setPrice("")
    setImageUrl("")
    setStatus("active")
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedMerchandise(null)
    setName("")
    setPrice("")
    setImageUrl("")
    setStatus("active")
    setError("")
  }

  const handleViewMerchandise = (item) => {
    if (!item) return
    
    setSelectedMerchandise(item)
    setViewDialogOpen(true)
  }

  const getStatusBadge = (item) => {
    if (!item) return <Badge variant="secondary">Unknown</Badge>
    
    if (item?.status === 'inactive') {
      return <Badge variant="destructive">Inactive</Badge>
    }
    
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
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
    const matchesSearch = item?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Merchandise
                {loadingStates.fetchingMerchandise && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>Manage gym merchandise, supplements, and products</CardDescription>
            </div>
            <Button onClick={handleAddMerchandise} disabled={loadingStates.savingMerchandise || loadingStates.deletingMerchandise}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
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
              placeholder="Search merchandise..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchandise.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {loadingStates.fetchingMerchandise
                        ? "Loading merchandise..."
                        : searchQuery
                          ? "No merchandise found matching your search"
                          : "No merchandise found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMerchandise.map((item) => {
                    if (!item) return null
                    return (
                      <TableRow key={item?.id}>
                        <TableCell className="font-medium">{item?.name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>₱</span>
                            {formatCurrency(item?.price || 0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item?.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item?.name || "Item"}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMerchandise(item)}
                            disabled={loadingStates.savingMerchandise || loadingStates.deletingMerchandise}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditMerchandise(item)}
                            disabled={loadingStates.savingMerchandise || loadingStates.deletingMerchandise}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteMerchandise(item?.id)}
                            disabled={loadingStates.savingMerchandise || loadingStates.deletingMerchandise}
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

      {/* Add/Edit Merchandise Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMerchandise ? "Edit Merchandise" : "Add New Merchandise"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                placeholder="Enter item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loadingStates.savingMerchandise}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={loadingStates.savingMerchandise}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={setStatus} disabled={loadingStates.savingMerchandise}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={loadingStates.savingMerchandise}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={loadingStates.savingMerchandise}>
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
            >
              {loadingStates.savingMerchandise ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedMerchandise ? (
                "Update Item"
              ) : (
                "Create Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Merchandise Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMerchandise?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMerchandise?.image_url && (
              <div className="flex justify-center">
                <img 
                  src={selectedMerchandise.image_url} 
                  alt={selectedMerchandise.name}
                  className="max-w-xs max-h-48 object-contain rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Price</h4>
                <div className="flex items-center gap-2">
                  <span>₱</span>
                  {formatCurrency(selectedMerchandise?.price)}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                {getStatusBadge(selectedMerchandise)}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Created</h4>
              <p className="text-muted-foreground">{formatDate(selectedMerchandise?.created_at)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Merchandise
