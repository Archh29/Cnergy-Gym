"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, Search, MessageSquare, Calendar, User, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

const SupportRequests = () => {
  const [requests, setRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSupportRequests()
  }, [])

  useEffect(() => {
    // Filter requests based on search query
    if (searchQuery.trim() === "") {
      setFilteredRequests(requests)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = requests.filter(
        (req) =>
          req.user_email?.toLowerCase().includes(query) ||
          req.subject?.toLowerCase().includes(query) ||
          req.message?.toLowerCase().includes(query) ||
          req.source?.toLowerCase().includes(query)
      )
      setFilteredRequests(filtered)
    }
  }, [searchQuery, requests])

  const fetchSupportRequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("https://api.cnergy.site/support_requests.php")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      // Sort by created_at descending (newest first)
      const sortedData = Array.isArray(data) 
        ? data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : []
      setRequests(sortedData)
      setFilteredRequests(sortedData)
    } catch (error) {
      console.error("Error fetching support requests:", error)
      toast({
        title: "Error",
        description: "Failed to fetch support requests. Please try again.",
        variant: "destructive",
      })
      setRequests([])
      setFilteredRequests([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewRequest = (request) => {
    setSelectedRequest(request)
    setIsViewDialogOpen(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return format(date, "MMM dd, yyyy 'at' hh:mm a")
    } catch {
      return dateString
    }
  }

  const getSourceBadge = (source) => {
    const colors = {
      mobile_app_deactivation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      mobile_app: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      web: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    }
    const color = colors[source] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    const label = source?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"
    
    return (
      <Badge className={color} variant="outline">
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Support Requests
              </CardTitle>
              <CardDescription>View and manage support requests from users</CardDescription>
            </div>
            <Button onClick={fetchSupportRequests} variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email, subject, message, or source..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No requests found matching your search." : "No support requests found."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleViewRequest(request)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{request.user_email}</span>
                      {getSourceBadge(request.source)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Mail className="h-3 w-3" />
                      <span className="font-semibold">{request.subject}</span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {request.message}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Request Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Support Request Details</DialogTitle>
            <DialogDescription>View full details of the support request</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{selectedRequest.user_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Subject:</span>
                  <span>{selectedRequest.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Source:</span>
                  {getSourceBadge(selectedRequest.source)}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Date:</span>
                  <span>{formatDate(selectedRequest.created_at)}</span>
                </div>
              </div>
              <div className="border rounded-md p-4 bg-muted/50">
                <div className="font-medium mb-2">Message:</div>
                <div className="text-sm whitespace-pre-wrap">{selectedRequest.message}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SupportRequests

