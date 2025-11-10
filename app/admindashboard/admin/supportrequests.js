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
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Mail, Search, MessageSquare, Calendar, User, AlertCircle, Send, RefreshCw, Filter } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"

const SupportRequests = () => {
  const [tickets, setTickets] = useState([])
  const [filteredTickets, setFilteredTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [userId, setUserId] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    // Get userId from sessionStorage
    const storedUserId = sessionStorage.getItem("user_id")
    if (storedUserId) {
      setUserId(parseInt(storedUserId))
    }
    fetchSupportTickets()
  }, [])

  useEffect(() => {
    // Filter tickets based on search query and status
    let filtered = tickets

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticket_number?.toLowerCase().includes(query) ||
          ticket.user_name?.toLowerCase().includes(query) ||
          ticket.user_email?.toLowerCase().includes(query) ||
          ticket.subject?.toLowerCase().includes(query) ||
          ticket.message?.toLowerCase().includes(query) ||
          ticket.source?.toLowerCase().includes(query)
      )
    }

    setFilteredTickets(filtered)
  }, [searchQuery, statusFilter, tickets])

  const fetchSupportTickets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("https://api.cnergy.site/support_requests.php?action=get_all_tickets")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      // Sort by created_at descending (newest first)
      const sortedData = Array.isArray(data) 
        ? data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : []
      setTickets(sortedData)
      setFilteredTickets(sortedData)
    } catch (error) {
      console.error("Error fetching support tickets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch support tickets. Please try again.",
        variant: "destructive",
      })
      setTickets([])
      setFilteredTickets([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket)
    setIsViewDialogOpen(true)
    await fetchTicketMessages(ticket.id)
  }

  const fetchTicketMessages = async (ticketId) => {
    try {
      setIsLoadingMessages(true)
      const adminIdParam = userId ? `&admin_id=${userId}` : ''
      const response = await fetch(`https://api.cnergy.site/support_requests.php?action=get_ticket_messages&ticket_id=${ticketId}${adminIdParam}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success && data.messages) {
        setMessages(data.messages)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast({
        title: "Error",
        description: "Failed to fetch messages. Please try again.",
        variant: "destructive",
      })
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message.",
        variant: "destructive",
      })
      return
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    if (!selectedTicket) {
      return
    }

    try {
      setIsSendingMessage(true)
      const response = await fetch("https://api.cnergy.site/support_requests.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_message",
          ticket_id: selectedTicket.id,
          sender_id: userId,
          message: newMessage.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewMessage("")
        // Refresh messages
        await fetchTicketMessages(selectedTicket.id)
        // Refresh tickets list to update message count
        await fetchSupportTickets()
        toast({
          title: "Success",
          description: "Message sent successfully.",
        })
      } else {
        throw new Error(data.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleUpdateStatus = async (newStatus) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    if (!selectedTicket) {
      return
    }

    try {
      const response = await fetch("https://api.cnergy.site/support_requests.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_status",
          ticket_id: selectedTicket.id,
          status: newStatus,
          admin_id: userId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setSelectedTicket({ ...selectedTicket, status: newStatus })
        // Refresh tickets list
        await fetchSupportTickets()
        toast({
          title: "Success",
          description: `Ticket status updated to ${newStatus.replace('_', ' ')}.`,
        })
      } else {
        throw new Error(data.error || "Failed to update status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      })
    }
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

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    }
    const color = colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    const label = status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"
    
    return (
      <Badge className={color} variant="outline">
        {label}
      </Badge>
    )
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

  const isAdminMessage = (message) => {
    return message.user_type_id === 1 || message.user_type_id === 2
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Support Tickets
              </CardTitle>
              <CardDescription>View and manage support tickets from users</CardDescription>
            </div>
            <Button onClick={fetchSupportTickets} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by ticket number, name, email, subject..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "No tickets found matching your filters." 
                : "No support tickets found."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{ticket.ticket_number}</span>
                      {getStatusBadge(ticket.status)}
                      {getSourceBadge(ticket.source)}
                      {ticket.message_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {ticket.message_count} {ticket.message_count === 1 ? 'message' : 'messages'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {ticket.user_name || ticket.user_email || 'Unknown User'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Mail className="h-3 w-3" />
                      <span className="font-semibold">{ticket.subject}</span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.message}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created: {formatDate(ticket.created_at)}</span>
                      </div>
                      {ticket.last_message_at && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>Last message: {formatDate(ticket.last_message_at)}</span>
                        </div>
                      )}
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

      {/* View Ticket Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open)
        if (!open) {
          setSelectedTicket(null)
          setMessages([])
          setNewMessage("")
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>Ticket {selectedTicket?.ticket_number}</span>
              </div>
              {selectedTicket && (
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedTicket.status)}
                  {getSourceBadge(selectedTicket.source)}
                </div>
              )}
            </DialogTitle>
            <DialogDescription>View and respond to support ticket</DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  <div className="font-medium">
                    {selectedTicket.user_name || selectedTicket.user_email || 'Unknown User'}
                  </div>
                  {selectedTicket.user_email && (
                    <div className="text-sm text-muted-foreground">{selectedTicket.user_email}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <div className="font-medium">{selectedTicket.subject}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <div className="text-sm">{formatDate(selectedTicket.created_at)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <div className="text-sm">{formatDate(selectedTicket.updated_at)}</div>
                </div>
              </div>

              {/* Status Update */}
              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <Select 
                  value={selectedTicket.status} 
                  onValueChange={(value) => {
                    handleUpdateStatus(value)
                    setSelectedTicket({ ...selectedTicket, status: value })
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Messages */}
              <div className="space-y-2">
                <Label>Conversation</Label>
                <ScrollArea className="h-64 border rounded-md p-4">
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No messages yet. Start the conversation below.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${isAdminMessage(message) ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              isAdminMessage(message)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="text-xs font-semibold mb-1">
                              {message.sender_name || 'Unknown User'}
                              {isAdminMessage(message) && (
                                <span className="ml-2 opacity-75">(Admin)</span>
                              )}
                            </div>
                            <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                            <div className="text-xs opacity-75 mt-1">
                              {formatDate(message.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Reply Section */}
              <div className="space-y-2">
                <Label htmlFor="message">Reply</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isSendingMessage || !newMessage.trim()}
                  className="w-full"
                >
                  {isSendingMessage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SupportRequests
