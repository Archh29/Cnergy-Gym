"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Archive, Loader2, Megaphone, Calendar, ChevronLeft, ChevronRight, CheckCircle2, PowerOff, Search, AlertTriangle, RotateCcw } from "lucide-react"

const API_URL = "https://api.cnergy.site/announcement.php"

const Announcement = () => {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: "medium",
    start_date: "",
    end_date: "",
  })
  const [loadingStates, setLoadingStates] = useState({
    fetching: false,
    saving: false,
    deactivating: false,
  })
  const [activeTab, setActiveTab] = useState("active") // "active", "pending", or "inactive"
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [successAnnouncement, setSuccessAnnouncement] = useState(null)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [announcementToDeactivate, setAnnouncementToDeactivate] = useState(null)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [announcementToRestore, setAnnouncementToRestore] = useState(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [announcementToPreview, setAnnouncementToPreview] = useState(null)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const setLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  const fetchAnnouncements = async () => {
    setLoadingState("fetching", true)
    try {
      const response = await axios.get(API_URL, {
        timeout: 30000 // 30 seconds timeout
      })
      const announcements = response.data.announcements || []
      // Debug: Log fetched announcements to check date fields
      console.log("Fetched announcements:", announcements)
      setAnnouncements(announcements)
    } catch (error) {
      console.error("Error fetching announcements:", error)
      setAnnouncements([])
      toast({
        title: "Error",
        description: "Failed to fetch announcements. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingState("fetching", false)
    }
  }

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (!newAnnouncement.start_date) {
      toast({
        title: "Validation Error",
        description: "Start date is required.",
        variant: "destructive",
      })
      return
    }

    setLoadingState("saving", true)
    setError("")
    const announcementTitle = newAnnouncement.title.trim()

    // Auto-calculate end_date if not provided (30 days from start_date)
    let endDate = newAnnouncement.end_date
    // Check if end_date is empty string or null/undefined
    if ((!endDate || endDate.trim() === "") && newAnnouncement.start_date) {
      const startDate = new Date(newAnnouncement.start_date)
      startDate.setDate(startDate.getDate() + 30)
      const year = startDate.getFullYear()
      const month = String(startDate.getMonth() + 1).padStart(2, '0')
      const day = String(startDate.getDate()).padStart(2, '0')
      endDate = `${year}-${month}-${day}`
    }

    // Status will be automatically set to 'active' on creation
    const announcementData = {
      ...newAnnouncement,
      end_date: endDate || null, // Send null instead of empty string if no end_date
      status: "active" // Always active when creating
    }

    // Debug: Log what we're sending
    console.log("Sending announcement data:", announcementData)

    try {
      const response = await axios.post(API_URL, announcementData, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.data.success) {
        await fetchAnnouncements()
        setIsAddDialogOpen(false)

        // Get today's date for comparison
        const now = new Date()
        const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
        const todayYear = philippinesTime.getFullYear()
        const todayMonth = philippinesTime.getMonth()
        const todayDay = philippinesTime.getDate()
        const today = new Date(todayYear, todayMonth, todayDay)

        const startParts = newAnnouncement.start_date.split('-')
        const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))

        const statusText = start > today ? "pending" : "active"

        // Set success modal data
        setSuccessAnnouncement({
          title: announcementTitle,
          status: statusText,
          startDate: newAnnouncement.start_date,
          endDate: endDate || newAnnouncement.end_date
        })
        setSuccessDialogOpen(true)

        setNewAnnouncement({ title: "", content: "", priority: "medium", start_date: "", end_date: "" })
      } else {
        setError(response.data.message || "Failed to create announcement")
        toast({
          title: "Failed to Create Announcement",
          description: response.data.message || "An error occurred while creating the announcement. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding announcement:", error)
      let errorMessage = "An unexpected error occurred while creating the announcement. Please try again."

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = "The request took too long to complete. The server might be slow or experiencing issues. Please try again in a moment."
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      toast({
        title: "Failed to Create Announcement",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingState("saving", false)
    }
  }

  const handleEditAnnouncement = async () => {
    if (!selectedAnnouncement?.title?.trim() || !selectedAnnouncement?.content?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (!selectedAnnouncement?.start_date) {
      toast({
        title: "Validation Error",
        description: "Start date is required.",
        variant: "destructive",
      })
      return
    }

    setLoadingState("saving", true)
    setError("")
    const announcementTitle = selectedAnnouncement.title.trim()

    try {
      const response = await axios.put(API_URL, selectedAnnouncement, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.data.success) {
        await fetchAnnouncements()
        setIsEditDialogOpen(false)

        // Calculate status text based on dates
        const statusText = getAnnouncementStatus(selectedAnnouncement)

        toast({
          title: "Announcement Updated",
          description: `"${announcementTitle}" has been updated successfully.`,
          className: "bg-green-50 border-green-200",
        })
      } else {
        setError(response.data.message || "Failed to update announcement")
        toast({
          title: "Failed to Update Announcement",
          description: response.data.message || "An error occurred while updating the announcement. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating announcement:", error)
      const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred while updating the announcement. Please try again."
      setError(errorMessage)
      toast({
        title: "Failed to Update Announcement",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingState("saving", false)
    }
  }

  const handleDeactivateClick = (announcement) => {
    setAnnouncementToDeactivate(announcement)
    setDeactivateDialogOpen(true)
  }

  const handleDeactivateAnnouncement = async () => {
    if (!announcementToDeactivate) return

    setLoadingState("deactivating", true)
    try {
      await axios.put(API_URL, {
        ...announcementToDeactivate,
        status: "inactive"
      }, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      })
      await fetchAnnouncements()
      setDeactivateDialogOpen(false)
      setAnnouncementToDeactivate(null)
      toast({
        title: "Announcement Deactivated Successfully",
        description: `"${announcementToDeactivate.title}" has been deactivated and is no longer visible to gym members. You can restore it anytime from the inactive tab.`,
        className: "bg-orange-50 border-orange-200 text-orange-900",
      })
    } catch (error) {
      console.error("Error deactivating announcement:", error)
      toast({
        title: "Unable to Deactivate Announcement",
        description: error.response?.data?.message || "We encountered an issue while deactivating this announcement. Please try again or contact support if the problem persists.",
        variant: "destructive",
      })
    } finally {
      setLoadingState("deactivating", false)
    }
  }

  const handleRestoreClick = (announcement) => {
    setAnnouncementToRestore(announcement)
    setRestoreDialogOpen(true)
  }

  const handleRestoreAnnouncement = async () => {
    if (!announcementToRestore) return

    setLoadingState("deactivating", true)
    try {
      await axios.put(API_URL, {
        ...announcementToRestore,
        status: "active"
      }, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      })
      await fetchAnnouncements()
      setRestoreDialogOpen(false)
      setAnnouncementToRestore(null)
      toast({
        title: "Announcement Restored Successfully",
        description: `"${announcementToRestore.title}" has been restored and is now active. It will be visible to gym members based on its start and end dates.`,
        className: "bg-green-50 border-green-200 text-green-900",
      })
    } catch (error) {
      console.error("Error restoring announcement:", error)
      toast({
        title: "Unable to Restore Announcement",
        description: error.response?.data?.message || "We encountered an issue while restoring this announcement. Please try again or contact support if the problem persists.",
        variant: "destructive",
      })
    } finally {
      setLoadingState("deactivating", false)
    }
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      low: "bg-green-50 text-green-700 border border-green-200",
      medium: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      high: "bg-red-50 text-red-700 border border-red-200",
    }
    return (
      <Badge className={`text-xs px-2 py-0.5 font-medium ${colors[priority] || colors.medium}`}>
        {priority || "medium"}
      </Badge>
    )
  }

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-50 text-green-700 border border-green-200",
      pending: "bg-purple-50 text-purple-700 border border-purple-200",
      expired: "bg-gray-100 text-gray-700 border border-gray-200",
      inactive: "bg-red-50 text-red-700 border border-red-200",
    }
    return (
      <Badge className={`text-xs px-2 py-0.5 font-medium ${colors[status] || colors.active}`}>
        {status || "active"}
      </Badge>
    )
  }

  // Helper function to calculate announcement status based on dates
  const getAnnouncementStatus = (announcement) => {
    // Handle null or undefined announcement
    if (!announcement) return "active"

    // If manually set to inactive, return inactive
    if (announcement.status === "inactive") return "inactive"

    if (!announcement.start_date) return "active"

    const now = new Date()
    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    const todayYear = philippinesTime.getFullYear()
    const todayMonth = philippinesTime.getMonth()
    const todayDay = philippinesTime.getDate()
    const today = new Date(todayYear, todayMonth, todayDay)

    const startParts = announcement.start_date.split('-')
    const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))

    // If end date has passed, automatically inactive
    if (announcement.end_date) {
      const endParts = announcement.end_date.split('-')
      const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))
      if (today > end) return "inactive"
    }

    if (start > today) return "pending"
    return "active"
  }

  // Helper function to determine if announcement should show in active tab
  const isAnnouncementActive = (announcement) => {
    const status = getAnnouncementStatus(announcement)
    return status === "active"
  }

  // Helper function to determine if announcement is pending
  const isAnnouncementPending = (announcement) => {
    const status = getAnnouncementStatus(announcement)
    return status === "pending"
  }

  // Helper function to check if announcement is expired (end date passed)
  const isAnnouncementExpired = (announcement) => {
    if (!announcement.end_date) return false

    const now = new Date()
    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    const todayYear = philippinesTime.getFullYear()
    const todayMonth = philippinesTime.getMonth()
    const todayDay = philippinesTime.getDate()
    const today = new Date(todayYear, todayMonth, todayDay)

    const endParts = announcement.end_date.split('-')
    const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))

    return today > end
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const filteredAnnouncements = (announcements || []).filter((announcement) => {
    // Filter by tab
    let matchesTab = false
    if (activeTab === "active") {
      matchesTab = isAnnouncementActive(announcement)
    } else if (activeTab === "pending") {
      matchesTab = isAnnouncementPending(announcement)
    } else if (activeTab === "inactive") {
      matchesTab = !isAnnouncementActive(announcement) && !isAnnouncementPending(announcement)
    }

    if (!matchesTab) return false

    // Filter by priority
    if (priorityFilter !== "all" && announcement.priority !== priorityFilter) {
      return false
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const titleMatch = announcement.title?.toLowerCase().includes(query)
      const contentMatch = announcement.content?.toLowerCase().includes(query)
      return titleMatch || contentMatch
    }

    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, endIndex)

  // Reset to page 1 when announcements or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [announcements, activeTab])

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-50 border border-gray-200">
                <Megaphone className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Announcements
                  {loadingStates.fetching && <Loader2 className="h-4 w-4 animate-spin text-gray-500 ml-2 inline" />}
                </CardTitle>
                <CardDescription>Manage and organize gym announcements</CardDescription>
              </div>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              disabled={loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
              className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search announcements..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="w-auto">
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="active" className="mt-0">
              <div className="space-y-3">
                {loadingStates.fetching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredAnnouncements.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    {searchQuery
                      ? "No announcements found matching your search"
                      : "No announcements found"}
                  </div>
                ) : (
                  paginatedAnnouncements.map((announcement) => (
                    <Card
                      key={announcement.id}
                      className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setAnnouncementToPreview(announcement)
                        setPreviewDialogOpen(true)
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                              {announcement.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getPriorityBadge(announcement.priority)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(getAnnouncementStatus(announcement))}
                            </div>
                            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {isAnnouncementActive(announcement) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAnnouncement(announcement)
                                      setIsEditDialogOpen(true)
                                    }}
                                    disabled={loadingStates.saving || loadingStates.deactivating}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeactivateClick(announcement)}
                                    disabled={loadingStates.saving || loadingStates.deactivating}
                                    className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                    title="Deactivate"
                                  >
                                    <PowerOff className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-700 mb-3">{announcement.content}</p>
                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>Posted: {new Date(announcement.date_posted).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                          </div>
                          {announcement.start_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>Start: {new Date(announcement.start_date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                            </div>
                          )}
                          {announcement.end_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>End: {new Date(announcement.end_date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredAnnouncements.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-gray-900">{Math.min(endIndex, filteredAnnouncements.length)}</span> of{" "}
                    <span className="font-medium text-gray-900">{filteredAnnouncements.length}</span> announcements
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
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
                              disabled={loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
                              className={`h-9 min-w-[36px] ${currentPage === page
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
                      disabled={currentPage === totalPages || loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
                      className="h-9 border-gray-300 hover:bg-gray-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              <div className="space-y-3">
                {loadingStates.fetching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredAnnouncements.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    {searchQuery
                      ? "No pending announcements found matching your search"
                      : "No pending announcements found"}
                  </div>
                ) : (
                  paginatedAnnouncements.map((announcement) => (
                    <Card
                      key={announcement.id}
                      className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setAnnouncementToPreview(announcement)
                        setPreviewDialogOpen(true)
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                              {announcement.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getPriorityBadge(announcement.priority)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(getAnnouncementStatus(announcement))}
                            </div>
                            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {isAnnouncementPending(announcement) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAnnouncement(announcement)
                                      setIsEditDialogOpen(true)
                                    }}
                                    disabled={loadingStates.saving || loadingStates.deactivating}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeactivateClick(announcement)}
                                    disabled={loadingStates.saving || loadingStates.deactivating}
                                    className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                    title="Deactivate"
                                  >
                                    <PowerOff className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-700 mb-3">{announcement.content}</p>
                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>Posted: {new Date(announcement.date_posted).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                          </div>
                          {announcement.start_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>Start: {new Date(announcement.start_date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                            </div>
                          )}
                          {announcement.end_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>End: {new Date(announcement.end_date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredAnnouncements.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-gray-900">{Math.min(endIndex, filteredAnnouncements.length)}</span> of{" "}
                    <span className="font-medium text-gray-900">{filteredAnnouncements.length}</span> announcements
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
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
                              disabled={loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
                              className={`h-9 ${currentPage === page ? "bg-gray-900 text-white hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                            >
                              {page}
                            </Button>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 text-gray-500">...</span>
                        }
                        return null
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
                      className="h-9 border-gray-300 hover:bg-gray-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="inactive" className="mt-0">
              <div className="space-y-3">
                {loadingStates.fetching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredAnnouncements.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    {searchQuery
                      ? "No inactive announcements found matching your search"
                      : "No inactive announcements found"}
                  </div>
                ) : (
                  paginatedAnnouncements.map((announcement) => (
                    <Card
                      key={announcement.id}
                      className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setAnnouncementToPreview(announcement)
                        setPreviewDialogOpen(true)
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                              {announcement.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getPriorityBadge(announcement.priority)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(getAnnouncementStatus(announcement))}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-700 mb-3">{announcement.content}</p>
                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>Posted: {new Date(announcement.date_posted).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                          </div>
                          {announcement.start_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>Start: {new Date(announcement.start_date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                            </div>
                          )}
                          {announcement.end_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>End: {new Date(announcement.end_date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredAnnouncements.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-gray-900">{Math.min(endIndex, filteredAnnouncements.length)}</span> of{" "}
                    <span className="font-medium text-gray-900">{filteredAnnouncements.length}</span> announcements
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
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
                              disabled={loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
                              className={`h-9 ${currentPage === page ? "bg-gray-900 text-white hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                            >
                              {page}
                            </Button>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 text-gray-500">...</span>
                        }
                        return null
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loadingStates.fetching || loadingStates.saving || loadingStates.deactivating}
                      className="h-9 border-gray-300 hover:bg-gray-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Announcement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) {
          setError("")
          // Get today's date in Philippines timezone for default start_date
          const now = new Date()
          const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
          const year = philippinesTime.getFullYear()
          const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
          const day = String(philippinesTime.getDate()).padStart(2, '0')
          const todayStr = `${year}-${month}-${day}`
          setNewAnnouncement({ title: "", content: "", priority: "medium", start_date: todayStr, end_date: "" })
        } else {
          // Set default start_date when opening
          const now = new Date()
          const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
          const year = philippinesTime.getFullYear()
          const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
          const day = String(philippinesTime.getDate()).padStart(2, '0')
          const todayStr = `${year}-${month}-${day}`
          setNewAnnouncement(prev => ({ ...prev, start_date: prev.start_date || todayStr }))
        }
      }}>
        <DialogContent className="sm:max-w-3xl" hideClose>
          <DialogHeader className="pb-5 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <Megaphone className="h-5 w-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">Add New Announcement</DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-2">
                  Create and schedule an announcement to share with gym members
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 mt-4">
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-5 pt-5">
            <div className="space-y-2.5">
              <Label htmlFor="title" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>Title</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                placeholder="Enter announcement title"
                disabled={loadingStates.saving}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="content" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>Content</span>
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                className="min-h-[120px] border-gray-300 focus:border-gray-900 focus:ring-gray-900 resize-none"
                placeholder="Enter announcement content"
                disabled={loadingStates.saving}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="priority" className="text-sm font-semibold text-gray-900">
                Priority Level
              </Label>
              <Select
                value={newAnnouncement.priority}
                onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, priority: value })}
                disabled={loadingStates.saving}
              >
                <SelectTrigger className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                  <SelectValue>
                    {newAnnouncement.priority && (
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${newAnnouncement.priority === "low" ? "bg-green-500" :
                          newAnnouncement.priority === "medium" ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}></div>
                        <span>
                          {newAnnouncement.priority === "low" ? "Low Priority" :
                            newAnnouncement.priority === "medium" ? "Medium Priority" :
                              "High Priority"}
                        </span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      High Priority
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label htmlFor="start_date" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span>Start Date</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newAnnouncement.start_date}
                  onChange={(e) => {
                    const newStartDate = e.target.value
                    // Get today's date in Philippines timezone
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)

                    // Parse selected date
                    const startParts = newStartDate.split('-')
                    const selectedDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))

                    // Prevent selecting dates in the past
                    if (selectedDate < today) {
                      toast({
                        title: "Invalid Date",
                        description: "Start date cannot be in the past. Please select today or a future date.",
                        variant: "destructive",
                      })
                      return
                    }

                    setNewAnnouncement({ ...newAnnouncement, start_date: newStartDate })
                    // Auto-calculate end_date (30 days from start_date) if end_date is empty
                    if (!newAnnouncement.end_date && newStartDate) {
                      const startDate = new Date(newStartDate)
                      startDate.setDate(startDate.getDate() + 30)
                      const year = startDate.getFullYear()
                      const month = String(startDate.getMonth() + 1).padStart(2, '0')
                      const day = String(startDate.getDate()).padStart(2, '0')
                      setNewAnnouncement(prev => ({ ...prev, start_date: newStartDate, end_date: `${year}-${month}-${day}` }))
                    } else {
                      setNewAnnouncement({ ...newAnnouncement, start_date: newStartDate })
                    }
                  }}
                  className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  disabled={loadingStates.saving}
                  required
                  min={(() => {
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const year = philippinesTime.getFullYear()
                    const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
                    const day = String(philippinesTime.getDate()).padStart(2, '0')
                    return `${year}-${month}-${day}`
                  })()}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="end_date" className="text-sm font-semibold text-gray-900">
                  End Date
                  <span className="text-gray-500 font-normal text-xs ml-2">(Optional)</span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={newAnnouncement.end_date}
                  onChange={(e) => {
                    const newEndDate = e.target.value
                    // Get today's date in Philippines timezone
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)

                    // Parse selected date
                    const endParts = newEndDate.split('-')
                    const selectedDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))

                    // Prevent selecting dates in the past
                    if (selectedDate < today) {
                      toast({
                        title: "Invalid Date",
                        description: "End date cannot be in the past. Please select today or a future date.",
                        variant: "destructive",
                      })
                      return
                    }

                    // Ensure end date is not before start date
                    if (newAnnouncement.start_date) {
                      const startParts = newAnnouncement.start_date.split('-')
                      const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
                      if (selectedDate < startDate) {
                        toast({
                          title: "Invalid Date",
                          description: "End date cannot be before start date. Please select a date on or after the start date.",
                          variant: "destructive",
                        })
                        return
                      }
                    }

                    setNewAnnouncement({ ...newAnnouncement, end_date: newEndDate })
                  }}
                  className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  disabled={loadingStates.saving}
                  min={(() => {
                    // Use the later of today or start_date
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)

                    if (newAnnouncement.start_date) {
                      const startParts = newAnnouncement.start_date.split('-')
                      const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
                      // Return the later date (today or start_date)
                      const minDate = startDate > today ? startDate : today
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
                />
                <p className="text-xs text-gray-500">Auto-set to 30 days from start if not specified</p>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-6 border-t border-gray-200 gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={loadingStates.saving}
              className="border-gray-300 hover:bg-gray-50 h-11 px-6 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAnnouncement}
              disabled={!newAnnouncement.title.trim() || !newAnnouncement.content.trim() || !newAnnouncement.start_date || loadingStates.saving}
              className="bg-gray-900 hover:bg-gray-800 text-white min-w-[120px] shadow-sm h-11 px-6 font-semibold"
            >
              {loadingStates.saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center border-2 border-green-200">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <div className="flex-1 pt-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  Announcement Created Successfully
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                  Your announcement has been created and is now {successAnnouncement?.status === "pending" ? "scheduled" : "active"}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-green-50/50 border-l-4 border-green-500 rounded-r-lg p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                Announcement Details
              </p>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-[80px]">Title:</span>
                  <span className="text-slate-700">{successAnnouncement?.title}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-slate-900 min-w-[80px]">Status:</span>
                  <Badge className={`text-xs px-2 py-0.5 font-medium ${successAnnouncement?.status === "pending"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                    {successAnnouncement?.status === "pending" ? "Pending" : "Active"}
                  </Badge>
                </div>
                {successAnnouncement?.startDate && (
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[80px]">Start Date:</span>
                    <span className="text-slate-700">
                      {new Date(successAnnouncement.startDate + 'T00:00:00').toLocaleDateString('en-US', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {successAnnouncement?.endDate && (
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[80px]">End Date:</span>
                    <span className="text-slate-700">
                      {new Date(successAnnouncement.endDate + 'T00:00:00').toLocaleDateString('en-US', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">What's Next:</strong> Your announcement will be visible to gym members {successAnnouncement?.status === "pending" ? "once the start date arrives" : "immediately"}. You can edit or deactivate it anytime from the announcements list.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button
              onClick={() => {
                setSuccessDialogOpen(false)
                setActiveTab(successAnnouncement?.status === "pending" ? "active" : "active")
              }}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-8 py-2.5 shadow-sm hover:shadow-md transition-all"
            >
              View Announcements
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setError("")
        }
      }}>
        <DialogContent className="sm:max-w-3xl" hideClose>
          <DialogHeader className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Edit className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">Edit Announcement</DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1.5">
                  Update the announcement details and scheduling information
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 mt-4">
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-5 pt-5">
            <div className="space-y-2.5">
              <Label htmlFor="edit-title" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>Title</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                value={selectedAnnouncement?.title || ""}
                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, title: e.target.value })}
                className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                placeholder="Enter announcement title"
                disabled={loadingStates.saving}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="edit-content" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span>Content</span>
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="edit-content"
                value={selectedAnnouncement?.content || ""}
                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, content: e.target.value })}
                className="min-h-[120px] border-gray-300 focus:border-gray-900 focus:ring-gray-900 resize-none"
                placeholder="Enter announcement content"
                disabled={loadingStates.saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority" className="text-sm font-semibold text-gray-900">
                Priority Level
              </Label>
              <Select
                value={selectedAnnouncement?.priority || "medium"}
                onValueChange={(value) => setSelectedAnnouncement({ ...selectedAnnouncement, priority: value })}
                disabled={loadingStates.saving}
              >
                <SelectTrigger className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                  <SelectValue>
                    {selectedAnnouncement?.priority && (
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedAnnouncement.priority === "low" ? "bg-green-500" :
                          selectedAnnouncement.priority === "medium" ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}></div>
                        <span>
                          {selectedAnnouncement.priority === "low" ? "Low Priority" :
                            selectedAnnouncement.priority === "medium" ? "Medium Priority" :
                              "High Priority"}
                        </span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      High Priority
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-start_date" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span>Start Date</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={selectedAnnouncement?.start_date || ""}
                  onChange={(e) => {
                    const newStartDate = e.target.value
                    // Get today's date in Philippines timezone
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)

                    // Parse selected date
                    const startParts = newStartDate.split('-')
                    const selectedDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))

                    // Prevent selecting dates in the past
                    if (selectedDate < today) {
                      toast({
                        title: "Invalid Date",
                        description: "Start date cannot be in the past. Please select today or a future date.",
                        variant: "destructive",
                      })
                      return
                    }

                    setSelectedAnnouncement({ ...selectedAnnouncement, start_date: newStartDate })
                  }}
                  className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900 text-base"
                  disabled={loadingStates.saving}
                  required
                  min={(() => {
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const year = philippinesTime.getFullYear()
                    const month = String(philippinesTime.getMonth() + 1).padStart(2, '0')
                    const day = String(philippinesTime.getDate()).padStart(2, '0')
                    return `${year}-${month}-${day}`
                  })()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end_date" className="text-sm font-semibold text-gray-900">
                  End Date
                  <span className="text-gray-500 font-normal text-xs ml-2">(Optional)</span>
                </Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  value={selectedAnnouncement?.end_date || ""}
                  onChange={(e) => {
                    const newEndDate = e.target.value
                    // Get today's date in Philippines timezone
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)

                    // Parse selected date
                    const endParts = newEndDate.split('-')
                    const selectedDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]))

                    // Prevent selecting dates in the past
                    if (selectedDate < today) {
                      toast({
                        title: "Invalid Date",
                        description: "End date cannot be in the past. Please select today or a future date.",
                        variant: "destructive",
                      })
                      return
                    }

                    // Ensure end date is not before start date
                    if (selectedAnnouncement?.start_date) {
                      const startParts = selectedAnnouncement.start_date.split('-')
                      const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
                      if (selectedDate < startDate) {
                        toast({
                          title: "Invalid Date",
                          description: "End date cannot be before start date. Please select a date on or after the start date.",
                          variant: "destructive",
                        })
                        return
                      }
                    }

                    setSelectedAnnouncement({ ...selectedAnnouncement, end_date: newEndDate })
                  }}
                  className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900 text-base"
                  disabled={loadingStates.saving}
                  min={(() => {
                    // Use the later of today or start_date
                    const now = new Date()
                    const philippinesTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                    const todayYear = philippinesTime.getFullYear()
                    const todayMonth = philippinesTime.getMonth()
                    const todayDay = philippinesTime.getDate()
                    const today = new Date(todayYear, todayMonth, todayDay)

                    if (selectedAnnouncement?.start_date) {
                      const startParts = selectedAnnouncement.start_date.split('-')
                      const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]))
                      // Return the later date (today or start_date)
                      const minDate = startDate > today ? startDate : today
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
                />
                <p className="text-xs text-gray-500 mt-1">Auto-set to 30 days from start if not specified</p>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-6 border-t border-gray-200 gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={loadingStates.saving}
              className="border-gray-300 hover:bg-gray-50 h-11 px-6 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditAnnouncement}
              disabled={!selectedAnnouncement?.title?.trim() || !selectedAnnouncement?.content?.trim() || !selectedAnnouncement?.start_date || loadingStates.saving}
              className="bg-gray-900 hover:bg-gray-800 text-white min-w-[120px] shadow-sm h-11 px-6 font-semibold"
            >
              {loadingStates.saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center border-2 border-orange-200">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1 pt-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  Deactivate Announcement
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                  Are you sure you want to deactivate this announcement?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-orange-50/50 border-l-4 border-orange-500 rounded-r-lg p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                What This Means
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                This announcement will be deactivated and moved to the inactive tab. It will no longer be visible to gym members, but you can restore it anytime if needed.
              </p>
            </div>

            {announcementToDeactivate && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
                <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-slate-600" />
                  Announcement Details
                </h4>
                <div className="space-y-2 text-sm text-slate-700 bg-white rounded-md p-4 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[60px]">Title:</span>
                    <span className="text-slate-700">{announcementToDeactivate.title}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[60px]">Status:</span>
                    <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 font-medium">
                      {getAnnouncementStatus(announcementToDeactivate)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Note:</strong> You can reactivate this announcement later from the inactive tab if you change your mind.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateDialogOpen(false)
                setAnnouncementToDeactivate(null)
              }}
              disabled={loadingStates.deactivating}
              className="border-gray-300 hover:bg-gray-50 font-medium px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeactivateAnnouncement}
              disabled={loadingStates.deactivating}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 shadow-sm hover:shadow-md transition-all"
            >
              {loadingStates.deactivating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Deactivate Announcement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center border-2 border-green-200">
                <RotateCcw className="h-7 w-7 text-green-600" />
              </div>
              <div className="flex-1 pt-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  Restore Announcement
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                  Are you sure you want to restore this announcement?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-green-50/50 border-l-4 border-green-500 rounded-r-lg p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                What This Means
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                This announcement will be restored and moved to the active tab. It will become visible to gym members based on its start and end dates.
              </p>
            </div>

            {announcementToRestore && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
                <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-slate-600" />
                  Announcement Details
                </h4>
                <div className="space-y-2 text-sm text-slate-700 bg-white rounded-md p-4 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[60px]">Title:</span>
                    <span className="text-slate-700">{announcementToRestore.title}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[60px]">Status:</span>
                    <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-xs px-2 py-0.5 font-medium">
                      Inactive
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Note:</strong> The announcement's visibility will depend on its start and end dates. Make sure the dates are appropriate before restoring.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRestoreDialogOpen(false)
                setAnnouncementToRestore(null)
              }}
              disabled={loadingStates.deactivating}
              className="border-gray-300 hover:bg-gray-50 font-medium px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestoreAnnouncement}
              disabled={loadingStates.deactivating}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 shadow-sm hover:shadow-md transition-all"
            >
              {loadingStates.deactivating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Announcement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Announcement Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-3xl" hideClose>
          <DialogHeader className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                <Megaphone className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {announcementToPreview?.title || "Announcement Preview"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1.5">
                  View announcement details and status
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {announcementToPreview && (
            <div className="space-y-6 pt-6">
              {/* Status and Priority */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Status:</span>
                  {getStatusBadge(getAnnouncementStatus(announcementToPreview))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Priority:</span>
                  {getPriorityBadge(announcementToPreview.priority)}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-900">Content</Label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[120px]">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {announcementToPreview.content}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Start Date</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>
                      {(() => {
                        // Debug: Log the announcement data
                        console.log("Preview announcement data:", announcementToPreview)
                        const dateStr = announcementToPreview.start_date
                        if (!dateStr || dateStr === "" || dateStr === "null" || dateStr === null) {
                          return "Not set"
                        }
                        try {
                          // Handle YYYY-MM-DD format
                          const dateParts = dateStr.split('-')
                          if (dateParts.length === 3) {
                            const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                            if (isNaN(date.getTime())) {
                              return dateStr // Return raw string if invalid date
                            }
                            return date.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          }
                          // Fallback to direct date parsing
                          const date = new Date(dateStr)
                          if (isNaN(date.getTime())) {
                            return dateStr // Return raw string if invalid date
                          }
                          return date.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        } catch (e) {
                          console.error("Error parsing start_date:", e, "Date string:", dateStr)
                          return dateStr || "Not set"
                        }
                      })()}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">End Date</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>
                      {(() => {
                        const dateStr = announcementToPreview.end_date
                        if (!dateStr || dateStr === "" || dateStr === "null" || dateStr === null) {
                          return "No end date"
                        }
                        try {
                          // Handle YYYY-MM-DD format
                          const dateParts = dateStr.split('-')
                          if (dateParts.length === 3) {
                            const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                            if (isNaN(date.getTime())) {
                              return dateStr // Return raw string if invalid date
                            }
                            return date.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          }
                          // Fallback to direct date parsing
                          const date = new Date(dateStr)
                          if (isNaN(date.getTime())) {
                            return dateStr // Return raw string if invalid date
                          }
                          return date.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        } catch (e) {
                          console.error("Error parsing end_date:", e, "Date string:", dateStr)
                          return dateStr || "No end date"
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Posted Date */}
              {announcementToPreview.date_posted && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Posted On</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {new Date(announcementToPreview.date_posted).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Status Information</p>
                    <p className="text-sm text-gray-700">
                      {getAnnouncementStatus(announcementToPreview) === "pending"
                        ? "This announcement is scheduled and will become active once the start date arrives."
                        : getAnnouncementStatus(announcementToPreview) === "active"
                          ? "This announcement is currently active and visible to gym members."
                          : getAnnouncementStatus(announcementToPreview) === "inactive"
                            ? "This announcement has been deactivated or has passed its end date and is no longer visible to gym members."
                            : "This announcement has expired and is no longer visible to gym members."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-gray-200 gap-3">
            <Button
              variant="outline"
              onClick={() => setPreviewDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Close
            </Button>
            {announcementToPreview && isAnnouncementActive(announcementToPreview) && (
              <Button
                onClick={() => {
                  setPreviewDialogOpen(false)
                  setSelectedAnnouncement(announcementToPreview)
                  setIsEditDialogOpen(true)
                }}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Announcement
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Announcement

