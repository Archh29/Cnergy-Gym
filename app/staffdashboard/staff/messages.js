"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Search,
  Trash2,
  Mail,
  Reply,
  User,
  PenSquare,
  Forward,
  Archive,
  Star,
  StarOff,
  MoreHorizontal,
  Filter,
  ChevronDown,
  Paperclip,
  Send,
  Inbox,
  FileText,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

// Sample message data with more fields
const initialMessages = [
  {
    id: 1,
    sender: "Admin",
    senderEmail: "admin@cynergy.com",
    subject: "Welcome to Cynergy Dashboard",
    content:
      "Welcome! Here are your dashboard details. You can find all the necessary information about your account, settings, and preferences in this dashboard. Feel free to explore and customize it according to your needs.",
    read: false,
    starred: false,
    category: "inbox",
    priority: "high",
    hasAttachments: false,
    timestamp: new Date(2023, 11, 15, 12, 0),
  },
  {
    id: 2,
    sender: "User",
    senderEmail: "user@example.com",
    subject: "Membership Update",
    content:
      "Can I update my membership details? I recently changed my contact information and would like to reflect those changes in my membership profile.",
    read: false,
    starred: true,
    category: "inbox",
    priority: "medium",
    hasAttachments: false,
    timestamp: new Date(2023, 11, 15, 13, 30),
  },
  {
    id: 3,
    sender: "Support",
    senderEmail: "support@cynergy.com",
    subject: "Your Request Has Been Received",
    content:
      "We have received your membership request and are processing it. Our team will review your application and get back to you within 24-48 hours. Thank you for your patience.",
    read: true,
    starred: false,
    category: "inbox",
    priority: "normal",
    hasAttachments: true,
    timestamp: new Date(2023, 11, 15, 14, 0),
  },
  {
    id: 4,
    sender: "System",
    senderEmail: "system@cynergy.com",
    subject: "Security Alert",
    content:
      "There was a login to your account from a new device. If this was you, no action is needed. If not, please contact support immediately.",
    read: true,
    starred: false,
    category: "inbox",
    priority: "high",
    hasAttachments: false,
    timestamp: new Date(2023, 11, 15, 15, 15),
  },
  {
    id: 5,
    sender: "Billing",
    senderEmail: "billing@cynergy.com",
    subject: "Your Monthly Invoice",
    content:
      "Your monthly invoice is now available. Please review the attached document for details about your charges and payment information.",
    read: false,
    starred: false,
    category: "inbox",
    priority: "normal",
    hasAttachments: true,
    timestamp: new Date(2023, 11, 14, 9, 0),
  },
  {
    id: 6,
    sender: "Me",
    senderEmail: "me@example.com",
    subject: "Question about gym hours",
    content: "I was wondering if the gym will be open during the holiday season? Please let me know the schedule.",
    read: true,
    starred: false,
    category: "sent",
    priority: "normal",
    hasAttachments: false,
    timestamp: new Date(2023, 11, 13, 16, 45),
  },
  {
    id: 7,
    sender: "Me",
    senderEmail: "me@example.com",
    subject: "Draft: Follow up on membership",
    content: "I wanted to follow up on my membership request from last week...",
    read: true,
    starred: false,
    category: "drafts",
    priority: "normal",
    hasAttachments: false,
    timestamp: new Date(2023, 11, 12, 10, 30),
  },
  {
    id: 8,
    sender: "Events",
    senderEmail: "events@cynergy.com",
    subject: "Upcoming Fitness Workshop",
    content:
      "We are excited to announce our upcoming fitness workshop on December 20th. Join us for expert tips and techniques to improve your workout routine.",
    read: true,
    starred: true,
    category: "archived",
    priority: "normal",
    hasAttachments: true,
    timestamp: new Date(2023, 11, 10, 11, 15),
  },
]

const Messages = () => {
  // State for storing messages
  const [messages, setMessages] = useState(initialMessages)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("inbox")
  const [sortOrder, setSortOrder] = useState("newest")
  const [selectedMessages, setSelectedMessages] = useState([])
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    content: "",
  })
  const [replyData, setReplyData] = useState({
    to: "",
    subject: "",
    content: "",
  })
  const [isReplyOpen, setIsReplyOpen] = useState(false)
  const [isForwardOpen, setIsForwardOpen] = useState(false)
  const [forwardData, setForwardData] = useState({
    to: "",
    subject: "",
    content: "",
  })

  const composeSubjectRef = useRef(null)

  // Function to mark a message as read
  const markAsRead = (id) => {
    setMessages(messages.map((message) => (message.id === id ? { ...message, read: true } : message)))
  }

  // Function to mark messages as unread
  const markAsUnread = (ids) => {
    if (!Array.isArray(ids)) ids = [ids]
    setMessages(messages.map((message) => (ids.includes(message.id) ? { ...message, read: false } : message)))
    setSelectedMessages([])
  }

  // Function to toggle star status
  const toggleStar = (id) => {
    setMessages(messages.map((message) => (message.id === id ? { ...message, starred: !message.starred } : message)))
  }

  // Function to delete a message
  const deleteMessage = (id) => {
    setMessages(messages.filter((message) => message.id !== id))
    if (selectedMessage?.id === id) setSelectedMessage(null)
    setSelectedMessages(selectedMessages.filter((msgId) => msgId !== id))
  }

  // Function to delete multiple messages
  const deleteSelectedMessages = () => {
    setMessages(messages.filter((message) => !selectedMessages.includes(message.id)))
    if (selectedMessage && selectedMessages.includes(selectedMessage.id)) {
      setSelectedMessage(null)
    }
    setSelectedMessages([])
  }

  // Function to archive messages
  const archiveMessages = (ids) => {
    if (!Array.isArray(ids)) ids = [ids]
    setMessages(messages.map((message) => (ids.includes(message.id) ? { ...message, category: "archived" } : message)))
    if (selectedMessage && ids.includes(selectedMessage.id)) {
      setSelectedMessage(null)
    }
    setSelectedMessages([])
  }

  // Function to select a message and display its content
  const selectMessage = (message) => {
    if (!message.read) {
      markAsRead(message.id)
    }
    setSelectedMessage(message)
  }

  // Function to toggle message selection for bulk actions
  const toggleMessageSelection = (id, event) => {
    event.stopPropagation()
    if (selectedMessages.includes(id)) {
      setSelectedMessages(selectedMessages.filter((msgId) => msgId !== id))
    } else {
      setSelectedMessages([...selectedMessages, id])
    }
  }

  // Function to handle compose submission
  const handleCompose = (e) => {
    e.preventDefault()
    const newMessage = {
      id: messages.length + 1,
      sender: "Me",
      senderEmail: "me@example.com",
      subject: composeData.subject,
      content: composeData.content,
      read: true,
      starred: false,
      category: "sent",
      priority: "normal",
      hasAttachments: false,
      timestamp: new Date(),
    }
    setMessages([newMessage, ...messages])
    setComposeData({ to: "", subject: "", content: "" })
    setIsComposeOpen(false)
  }

  // Function to handle reply submission
  const handleReply = (e) => {
    e.preventDefault()
    const newMessage = {
      id: messages.length + 1,
      sender: "Me",
      senderEmail: "me@example.com",
      subject: replyData.subject,
      content: replyData.content,
      read: true,
      starred: false,
      category: "sent",
      priority: "normal",
      hasAttachments: false,
      timestamp: new Date(),
    }
    setMessages([newMessage, ...messages])
    setReplyData({ to: "", subject: "", content: "" })
    setIsReplyOpen(false)
  }

  // Function to handle forward submission
  const handleForward = (e) => {
    e.preventDefault()
    const newMessage = {
      id: messages.length + 1,
      sender: "Me",
      senderEmail: "me@example.com",
      subject: forwardData.subject,
      content: forwardData.content,
      read: true,
      starred: false,
      category: "sent",
      priority: "normal",
      hasAttachments: false,
      timestamp: new Date(),
    }
    setMessages([newMessage, ...messages])
    setForwardData({ to: "", subject: "", content: "" })
    setIsForwardOpen(false)
  }

  // Function to prepare reply data
  const prepareReply = (message) => {
    setReplyData({
      to: message.senderEmail,
      subject: `Re: ${message.subject}`,
      content: `\n\n-------- Original Message --------\nFrom: ${
        message.sender
      } <${message.senderEmail}>\nDate: ${format(
        message.timestamp,
        "PPpp",
      )}\nSubject: ${message.subject}\n\n${message.content}`,
    })
    setIsReplyOpen(true)
  }

  // Function to prepare forward data
  const prepareForward = (message) => {
    setForwardData({
      to: "",
      subject: `Fwd: ${message.subject}`,
      content: `\n\n-------- Forwarded Message --------\nFrom: ${
        message.sender
      } <${message.senderEmail}>\nDate: ${format(
        message.timestamp,
        "PPpp",
      )}\nSubject: ${message.subject}\n\n${message.content}`,
    })
    setIsForwardOpen(true)
  }

  // Function to confirm message deletion
  const confirmDelete = (message) => {
    setMessageToDelete(message)
    setIsDeleteAlertOpen(true)
  }

  // Filter and sort messages
  const filteredMessages = messages
    .filter(
      (message) =>
        // Filter by category/tab
        message.category === activeTab &&
        // Filter by search query
        (searchQuery.trim() === "" ||
          message.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.content.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .sort((a, b) => {
      // Sort by timestamp
      if (sortOrder === "newest") {
        return b.timestamp - a.timestamp
      } else {
        return a.timestamp - b.timestamp
      }
    })

  // Count unread messages by category
  const unreadCounts = {
    inbox: messages.filter((m) => m.category === "inbox" && !m.read).length,
    sent: 0,
    drafts: 0,
    archived: 0,
  }

  // Get priority badge
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge variant="secondary">Medium</Badge>
      case "normal":
        return <Badge variant="outline">Normal</Badge>
      default:
        return null
    }
  }

  // Format timestamp
  const formatMessageTime = (timestamp) => {
    const now = new Date()
    const messageDate = new Date(timestamp)

    // If it's today, show time
    if (messageDate.toDateString() === now.toDateString()) {
      return format(messageDate, "h:mm a")
    }

    // If it's within the last 7 days, show day name
    const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24))
    if (diffInDays < 7) {
      return format(messageDate, "EEE")
    }

    // Otherwise show date
    return format(messageDate, "MMM d")
  }

  return (
    <div className="flex flex-col lg:flex-row w-full h-full gap-6">
      {/* Left: Message List */}
      <Card className="lg:w-1/3 w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Manage your communications</CardDescription>
            </div>
            <Button onClick={() => setIsComposeOpen(true)}>
              <PenSquare className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </div>
        </CardHeader>

        <Tabs defaultValue="inbox" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 overflow-hidden">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="inbox" className="relative">
                Inbox
                {unreadCounts.inbox > 0 && (
                  <Badge className="ml-1 bg-primary absolute -top-1 -right-1 text-[10px] h-4 min-w-4 px-1">
                    {unreadCounts.inbox}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-4 pb-2">
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search messages..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="ml-2">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setSortOrder("newest")}>Newest First</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("oldest")}>Oldest First</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter</DropdownMenuLabel>
                  <DropdownMenuItem>Unread Only</DropdownMenuItem>
                  <DropdownMenuItem>Starred Only</DropdownMenuItem>
                  <DropdownMenuItem>With Attachments</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedMessages.length > 0 && (
              <div className="flex items-center justify-between mb-4 p-2 bg-muted rounded-md">
                <span className="text-sm">{selectedMessages.length} selected</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => markAsUnread(selectedMessages)}>
                    <Mail className="h-4 w-4 mr-1" />
                    Mark Unread
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveMessages(selectedMessages)}>
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={deleteSelectedMessages}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}

            <TabsContent value="inbox" className="m-0">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Inbox className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>Your inbox is empty</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => selectMessage(message)}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                        !message.read
                          ? "bg-blue-50"
                          : selectedMessage?.id === message.id
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center mr-2">
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(message.id)}
                          onChange={(e) => toggleMessageSelection(message.id, e)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 ml-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStar(message.id)
                          }}
                        >
                          {message.starred ? (
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          ) : (
                            <StarOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h2 className={`font-medium truncate ${!message.read ? "font-semibold" : ""}`}>
                            {message.sender}
                          </h2>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            {message.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className={`text-sm truncate ${!message.read ? "font-medium" : "text-muted-foreground"}`}>
                          {message.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {message.content.substring(0, 60)}...
                        </p>
                        <div className="flex items-center mt-1">{getPriorityBadge(message.priority)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="m-0">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No sent messages</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => selectMessage(message)}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h2 className="font-medium truncate">To: {message.to || "Recipient"}</h2>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm truncate">{message.subject}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {message.content.substring(0, 60)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="drafts" className="m-0">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No draft messages</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => selectMessage(message)}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h2 className="font-medium truncate">{message.subject || "No subject"}</h2>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {message.content.substring(0, 60) || "No content"}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived" className="m-0">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No archived messages</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => selectMessage(message)}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h2 className="font-medium truncate">{message.sender}</h2>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm truncate">{message.subject}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {message.content.substring(0, 60)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>

        <CardFooter className="flex justify-between text-xs text-muted-foreground pt-0">
          <span>
            {filteredMessages.length} message
            {filteredMessages.length !== 1 ? "s" : ""}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <ChevronDown className="h-3 w-3 mr-1" />
            Show more
          </Button>
        </CardFooter>
      </Card>

      {/* Right: Message Detail */}
      <Card className="lg:w-2/3 w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Message Details</CardTitle>
              <CardDescription>
                {selectedMessage ? "View message content" : "Select a message to view details"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <h2 className="text-xl font-semibold">{selectedMessage.subject}</h2>
                <div className="flex items-center gap-1">
                  {getPriorityBadge(selectedMessage.priority)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => prepareReply(selectedMessage)}>
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => prepareForward(selectedMessage)}>
                        <Forward className="h-4 w-4 mr-2" />
                        Forward
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStar(selectedMessage.id)}>
                        {selectedMessage.starred ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Remove Star
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Add Star
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => markAsUnread(selectedMessage.id)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Mark as Unread
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => confirmDelete(selectedMessage)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm">
                      From: <span className="font-medium">{selectedMessage.sender}</span>
                    </span>
                    <p className="text-xs text-muted-foreground">{selectedMessage.senderEmail}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm">{format(selectedMessage.timestamp, "PPpp")}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(selectedMessage.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>

              {selectedMessage.hasAttachments && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Attachment.pdf</span>
                  <Button variant="outline" size="sm" className="ml-auto h-7 px-2">
                    Download
                  </Button>
                </div>
              )}

              <div className="py-4">
                <p className="leading-relaxed whitespace-pre-line">{selectedMessage.content}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => prepareReply(selectedMessage)}
                  className="flex items-center gap-2"
                >
                  <Reply className="h-4 w-4" />
                  <span>Reply</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => prepareForward(selectedMessage)}
                  className="flex items-center gap-2"
                >
                  <Forward className="h-4 w-4" />
                  <span>Forward</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => archiveMessages(selectedMessage.id)}
                  className="flex items-center gap-2 ml-auto"
                >
                  <Archive className="h-4 w-4" />
                  <span>Archive</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => confirmDelete(selectedMessage)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <Mail className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-xl">Select a message</p>
              <p className="mt-2 text-sm max-w-md text-center">
                Click on any message from your inbox to view its contents here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
            <DialogDescription>Create a new message to send</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCompose}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="to" className="text-right">
                  To:
                </label>
                <Input
                  id="to"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  className="col-span-3"
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="subject" className="text-right">
                  Subject:
                </label>
                <Input
                  id="subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="col-span-3"
                  placeholder="Message subject"
                  ref={composeSubjectRef}
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="content" className="text-right pt-2">
                  Message:
                </label>
                <Textarea
                  id="content"
                  value={composeData.content}
                  onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                  className="col-span-3"
                  rows={10}
                  placeholder="Type your message here..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Message</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={isReplyOpen} onOpenChange={setIsReplyOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReply}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="reply-to" className="text-right">
                  To:
                </label>
                <Input
                  id="reply-to"
                  value={replyData.to}
                  onChange={(e) => setReplyData({ ...replyData, to: e.target.value })}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="reply-subject" className="text-right">
                  Subject:
                </label>
                <Input
                  id="reply-subject"
                  value={replyData.subject}
                  onChange={(e) => setReplyData({ ...replyData, subject: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="reply-content" className="text-right pt-2">
                  Message:
                </label>
                <Textarea
                  id="reply-content"
                  value={replyData.content}
                  onChange={(e) => setReplyData({ ...replyData, content: e.target.value })}
                  className="col-span-3"
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReplyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Reply</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={isForwardOpen} onOpenChange={setIsForwardOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleForward}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="forward-to" className="text-right">
                  To:
                </label>
                <Input
                  id="forward-to"
                  value={forwardData.to}
                  onChange={(e) => setForwardData({ ...forwardData, to: e.target.value })}
                  className="col-span-3"
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="forward-subject" className="text-right">
                  Subject:
                </label>
                <Input
                  id="forward-subject"
                  value={forwardData.subject}
                  onChange={(e) => setForwardData({ ...forwardData, subject: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="forward-content" className="text-right pt-2">
                  Message:
                </label>
                <Textarea
                  id="forward-content"
                  value={forwardData.content}
                  onChange={(e) => setForwardData({ ...forwardData, content: e.target.value })}
                  className="col-span-3"
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsForwardOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Forward Message</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the message. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {messageToDelete && (
            <div className="border rounded-md p-3 mb-4">
              <p className="font-medium">{messageToDelete.subject}</p>
              <p className="text-sm text-muted-foreground">From: {messageToDelete.sender}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (messageToDelete) {
                  deleteMessage(messageToDelete.id)
                  setMessageToDelete(null)  
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Messages

