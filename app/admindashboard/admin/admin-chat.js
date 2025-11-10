"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    MessageCircle,
    X,
    Send,
    Search,
    Loader2,
    User,
    Clock,
    Check,
    CheckCheck,
    Ticket,
    AlertCircle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { cn } from "@/lib/utils"

const API_BASE_URL = "https://api.cnergy.site/messages.php"
const SUPPORT_API_URL = "https://api.cnergy.site/support_requests.php"

const AdminChat = ({ userId: propUserId }) => {
    // Try to get userId from prop, sessionStorage, or state
    const [userId, setUserId] = useState(() => {
        // First try prop
        if (propUserId) {
            console.log("AdminChat: Initializing with userId from prop:", propUserId)
            return propUserId
        }
        // Then try sessionStorage (client-side only)
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem("user_id")
            if (stored) {
                console.log("AdminChat: Initializing with userId from sessionStorage:", stored)
                return parseInt(stored)
            }
            console.log("AdminChat: No userId found in prop or sessionStorage")
        }
        return null
    })

    const [isOpen, setIsOpen] = useState(false)
    const [conversations, setConversations] = useState([])
    const [supportTickets, setSupportTickets] = useState([])
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [selectedTicket, setSelectedTicket] = useState(null)
    const [messages, setMessages] = useState([])
    const [messageInput, setMessageInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [ticketCount, setTicketCount] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [userIdLoadingTimeout, setUserIdLoadingTimeout] = useState(false)
    const [viewMode, setViewMode] = useState("all") // "all", "messages", "tickets"
    const messagesEndRef = useRef(null)
    const messageInputRef = useRef(null)
    const { toast } = useToast()

    // Sync userId from prop when it changes, and periodically check sessionStorage
    useEffect(() => {
        if (propUserId) {
            console.log("AdminChat: Received userId from prop:", propUserId)
            setUserId(propUserId)
        } else if (typeof window !== 'undefined') {
            // Try to get from sessionStorage if prop is not available
            const checkSessionStorage = () => {
                const stored = sessionStorage.getItem("user_id")
                if (stored) {
                    const parsed = parseInt(stored)
                    console.log("AdminChat: Found userId in sessionStorage:", parsed)
                    if (parsed && parsed !== userId) {
                        setUserId(parsed)
                    }
                }
            }

            // Check immediately
            checkSessionStorage()

            // Also check periodically (in case it gets set later)
            if (!userId) {
                const interval = setInterval(checkSessionStorage, 1000)
                return () => clearInterval(interval)
            }
        }
    }, [propUserId, userId])

    // Set timeout for userId loading
    useEffect(() => {
        if (!userId) {
            const timeout = setTimeout(() => {
                setUserIdLoadingTimeout(true)
            }, 3000) // Show timeout message after 3 seconds
            return () => clearTimeout(timeout)
        } else {
            setUserIdLoadingTimeout(false)
        }
    }, [userId])

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    // Fetch support tickets
    const fetchSupportTickets = async () => {
        if (!userId) {
            return
        }

        try {
            const response = await fetch(`${SUPPORT_API_URL}?action=get_all_tickets`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                console.error("Error fetching tickets:", response.status, errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const data = await response.json()
            console.log("Support tickets response:", data)
            
            // Handle response - can be array directly or wrapped in success
            let tickets = []
            if (Array.isArray(data)) {
                tickets = data
            } else if (data.success && Array.isArray(data.tickets)) {
                tickets = data.tickets
            } else if (data.tickets && Array.isArray(data.tickets)) {
                tickets = data.tickets
            }
            
            // Sort by created_at descending (newest first)
            const sortedData = tickets.sort((a, b) => {
                const dateA = new Date(a.created_at || a.last_message_at || 0)
                const dateB = new Date(b.created_at || b.last_message_at || 0)
                return dateB - dateA
            })
            
            setSupportTickets(sortedData)
            
            // Count pending and in_progress tickets
            const activeTickets = sortedData.filter(
                ticket => ticket.status === 'pending' || ticket.status === 'in_progress'
            ).length
            setTicketCount(activeTickets)
        } catch (error) {
            console.error("Error fetching support tickets:", error)
            setSupportTickets([])
            setTicketCount(0)
        }
    }

    // Fetch conversations - Get all users who have messaged admin
    const fetchConversations = async () => {
        if (!userId) {
            console.log("AdminChat: userId not set yet, skipping fetch")
            setIsLoading(false)
            return
        }

        // Add timeout to prevent stuck loading
        let timeoutId = null

        try {
            setIsLoading(true)
            console.log("AdminChat: Fetching conversations for userId:", userId)

            timeoutId = setTimeout(() => {
                console.warn("AdminChat: Fetch timeout, setting loading to false")
                setIsLoading(false)
            }, 10000) // 10 second timeout

            // Fetch both conversations and tickets
            await Promise.all([fetchSupportTickets()])

            // First, try to get admin conversations directly from messages table
            let adminConversations = []

            try {
                const adminConvResponse = await fetch(
                    `${API_BASE_URL}?action=get_admin_conversations&admin_id=${userId}`
                )

                if (adminConvResponse.ok) {
                    const adminConvData = await adminConvResponse.json()
                    console.log("AdminChat: Admin conversations response:", adminConvData)

                    if (adminConvData.success && adminConvData.conversations) {
                        adminConversations = adminConvData.conversations
                        console.log("AdminChat: Found", adminConversations.length, "admin conversations")
                    }
                }
            } catch (err) {
                console.log("AdminChat: get_admin_conversations endpoint not available, using fallback:", err)
            }

            // Fallback: Fetch conversations from the regular conversations endpoint
            if (adminConversations.length === 0) {
                console.log("AdminChat: Trying conversations endpoint...")
                const response = await fetch(
                    `${API_BASE_URL}?action=conversations&user_id=${userId}`
                )

                console.log("AdminChat: Conversations response status:", response.status)

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error("AdminChat: Failed to fetch conversations:", response.status, errorText)
                    throw new Error(`Failed to fetch conversations: ${response.status}`)
                }

                const data = await response.json()
                console.log("AdminChat: Conversations data:", data)

                if (data.success && data.conversations) {
                    console.log("AdminChat: Found conversations:", data.conversations.length)
                    adminConversations = data.conversations.filter((conv) => {
                        // Show conversations that have messages or unread count
                        return conv.last_message || conv.unread_count > 0 || conv.last_message_time
                    })
                }
            }

            if (adminConversations.length > 0) {
                console.log("AdminChat: Processing", adminConversations.length, "conversations")

                // Sort by last message time (most recent first), then by unread count
                adminConversations.sort((a, b) => {
                    // First sort by unread count (unread first)
                    if ((a.unread_count || 0) > 0 && (b.unread_count || 0) === 0) return -1
                    if ((a.unread_count || 0) === 0 && (b.unread_count || 0) > 0) return 1

                    // Then sort by last message time
                    if (a.last_message_time && b.last_message_time) {
                        return new Date(b.last_message_time) - new Date(a.last_message_time)
                    }
                    if (a.last_message_time) return -1
                    if (b.last_message_time) return 1

                    // Finally sort by name
                    const nameA = `${a.other_user?.fname || ''} ${a.other_user?.lname || ''}`.toLowerCase()
                    const nameB = `${b.other_user?.fname || ''} ${b.other_user?.lname || ''}`.toLowerCase()
                    return nameA.localeCompare(nameB)
                })

                setConversations(adminConversations)

                // Calculate total unread count
                const totalUnread = adminConversations.reduce(
                    (sum, conv) => sum + (conv.unread_count || 0),
                    0
                )
                setUnreadCount(totalUnread)
                console.log("AdminChat: Total unread count:", totalUnread)
            } else {
                console.log("AdminChat: No conversations found")
                setConversations([])
                setUnreadCount(0)
            }
        } catch (error) {
            console.error("AdminChat: Error fetching conversations:", error)
            setConversations([])
            setUnreadCount(0)
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            setIsLoading(false)
        }
    }

    // Fetch messages for a conversation
    const fetchMessages = async (conversationId, otherUserId) => {
        if (!userId) {
            console.log("AdminChat: userId not set yet, skipping fetch messages")
            return
        }

        try {
            setIsLoadingMessages(true)

            let url = ""

            if (conversationId === 0) {
                // Virtual conversation - get messages between admin and user
                url = `${API_BASE_URL}?action=messages&conversation_id=0&user_id=${userId}&other_user_id=${otherUserId}`
            } else {
                // Regular conversation
                url = `${API_BASE_URL}?action=messages&conversation_id=${conversationId}&user_id=${userId}`
            }

            console.log("Fetching messages from:", url)
            const response = await fetch(url)

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Failed to fetch messages:", response.status, errorText)
                throw new Error(`Failed to fetch messages: ${response.status}`)
            }

            const data = await response.json()
            console.log("Messages response:", data)

            if (data.success && data.messages) {
                const filteredMessages = data.messages.filter(msg => {
                    return (
                        (msg.sender_id === otherUserId && (msg.receiver_id === userId || msg.receiver_id === 1)) ||
                        (msg.sender_id === userId && msg.receiver_id === otherUserId)
                    )
                })

                setMessages(filteredMessages.length > 0 ? filteredMessages : data.messages)
                setTimeout(() => scrollToBottom(), 100)
            } else if (data.success && Array.isArray(data.messages) && data.messages.length === 0) {
                setMessages([])
            } else {
                throw new Error(data.message || "No messages found")
            }
        } catch (error) {
            console.error("Error fetching messages:", error)
            toast({
                title: "Error",
                description: `Failed to load messages: ${error.message}`,
                variant: "destructive",
            })
            setMessages([])
        } finally {
            setIsLoadingMessages(false)
        }
    }

    // Fetch ticket messages
    const fetchTicketMessages = async (ticketId) => {
        if (!userId || !ticketId) {
            return
        }

        try {
            setIsLoadingMessages(true)
            const adminIdParam = userId ? `&admin_id=${userId}` : ''
            const url = `${SUPPORT_API_URL}?action=get_ticket_messages&ticket_id=${ticketId}${adminIdParam}`
            console.log("Fetching ticket messages from:", url)
            
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                console.error("Error fetching ticket messages:", response.status, errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const data = await response.json()
            console.log("Ticket messages response:", data)
            
            if (data.success && data.messages) {
                setMessages(data.messages)
                setTimeout(() => scrollToBottom(), 100)
            } else if (data.messages && Array.isArray(data.messages)) {
                setMessages(data.messages)
                setTimeout(() => scrollToBottom(), 100)
            } else {
                setMessages([])
            }
        } catch (error) {
            console.error("Error fetching ticket messages:", error)
            toast({
                title: "Error",
                description: `Failed to fetch messages: ${error.message}`,
                variant: "destructive",
            })
            setMessages([])
        } finally {
            setIsLoadingMessages(false)
        }
    }

    // Send message
    const sendMessage = async () => {
        if (!messageInput.trim() || !userId || isSending) {
            return
        }

        const messageText = messageInput.trim()
        setMessageInput("")
        setIsSending(true)

        try {
            // If we have a selected ticket, send via support API
            if (selectedTicket) {
                const requestBody = {
                    action: "send_message",
                    ticket_id: selectedTicket.id,
                    sender_id: userId,
                    message: messageText,
                }
                
                console.log("Sending ticket message:", requestBody)
                
                const response = await fetch(SUPPORT_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                })

                console.log("Send message response status:", response.status)

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error("Error sending message:", response.status, errorText)
                    let errorMessage = "Failed to send message"
                    try {
                        const errorData = JSON.parse(errorText)
                        errorMessage = errorData.error || errorData.message || errorMessage
                    } catch (e) {
                        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
                    }
                    throw new Error(errorMessage)
                }

                const data = await response.json()
                console.log("Send message response data:", data)

                if (data.success) {
                    // Refresh messages
                    await fetchTicketMessages(selectedTicket.id)
                    // Refresh tickets list
                    await fetchSupportTickets()
                    toast({
                        title: "Success",
                        description: "Message sent successfully.",
                    })
                } else {
                    throw new Error(data.error || data.message || "Failed to send message")
                }
            } else if (selectedConversation) {
                // Regular conversation message
                const response = await fetch(`${API_BASE_URL}?action=send_message`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sender_id: userId,
                        receiver_id: selectedConversation.other_user.id,
                        message: messageText,
                        conversation_id: selectedConversation.id || null,
                    }),
                })

                if (!response.ok) {
                    throw new Error("Failed to send message")
                }

                const data = await response.json()
                if (data.success && data.message) {
                    setMessages((prev) => [...prev, data.message])
                    fetchConversations()
                    setTimeout(() => scrollToBottom(), 100)
                } else {
                    throw new Error(data.message || "Failed to send message")
                }
            }
        } catch (error) {
            console.error("Error sending message:", error)
            setMessageInput(messageText) // Restore message on error
            toast({
                title: "Error",
                description: error.message || "Failed to send message",
                variant: "destructive",
            })
        } finally {
            setIsSending(false)
        }
    }

    // Update ticket status
    const handleUpdateStatus = async (newStatus) => {
        if (!userId || !selectedTicket) {
            return
        }

        try {
            const requestBody = {
                action: "update_status",
                ticket_id: selectedTicket.id,
                status: newStatus,
                admin_id: userId,
            }
            
            console.log("Updating ticket status:", requestBody)
            
            const response = await fetch(SUPPORT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(requestBody),
            })

            console.log("Update status response status:", response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Error updating status:", response.status, errorText)
                let errorMessage = "Failed to update status"
                try {
                    const errorData = JSON.parse(errorText)
                    errorMessage = errorData.error || errorData.message || errorMessage
                } catch (e) {
                    errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
                }
                throw new Error(errorMessage)
            }

            const data = await response.json()
            console.log("Update status response data:", data)

            if (data.success) {
                setSelectedTicket({ ...selectedTicket, status: newStatus })
                await fetchSupportTickets()
                toast({
                    title: "Success",
                    description: `Ticket status updated to ${newStatus.replace('_', ' ')}.`,
                })
            } else {
                throw new Error(data.error || data.message || "Failed to update status")
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

    // Handle conversation select
    const handleConversationSelect = (conversation) => {
        setSelectedConversation(conversation)
        setSelectedTicket(null)
        setMessages([])
        fetchMessages(conversation.id, conversation.other_user.id)
    }

    // Handle ticket select
    const handleTicketSelect = (ticket) => {
        setSelectedTicket(ticket)
        setSelectedConversation(null)
        setMessages([])
        fetchTicketMessages(ticket.id)
    }

    // Handle back button
    const handleBack = () => {
        setSelectedConversation(null)
        setSelectedTicket(null)
        setMessages([])
        setMessageInput("")
    }

    // Handle open/close
    const handleToggle = () => {
        if (isOpen) {
            setIsOpen(false)
            setSelectedConversation(null)
            setSelectedTicket(null)
            setMessages([])
        } else {
            setIsOpen(true)
            setSelectedConversation(null)
            setSelectedTicket(null)
            if (userId) {
                fetchConversations()
            } else {
                const checkUserId = setInterval(() => {
                    if (userId) {
                        clearInterval(checkUserId)
                        fetchConversations()
                    }
                }, 500)
                setTimeout(() => clearInterval(checkUserId), 5000)
            }
        }
    }

    // Get all messages from users (not from admin) - Simplified version for unread count
    const getAllUserMessages = async () => {
        if (!userId) {
            return
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}?action=conversations&user_id=${userId}`
            )

            if (!response.ok) {
                return
            }

            const data = await response.json()
            if (data.success && data.conversations) {
                const conversationsWithMessages = data.conversations.filter(
                    (conv) => conv.last_message || conv.unread_count > 0 || conv.last_message_time
                )

                const totalUnread = conversationsWithMessages.reduce(
                    (sum, conv) => sum + (conv.unread_count || 0),
                    0
                )
                setUnreadCount(totalUnread)
            }
        } catch (error) {
            console.log("Error fetching user messages:", error)
        }
    }

    // Initial load and periodic refresh
    useEffect(() => {
        if (!userId) return

        if (isOpen) {
            fetchConversations()
            const interval = setInterval(() => {
                if (userId && isOpen) {
                    fetchConversations()
                    if (selectedConversation) {
                        fetchMessages(
                            selectedConversation.id,
                            selectedConversation.other_user.id
                        )
                    }
                    if (selectedTicket) {
                        fetchTicketMessages(selectedTicket.id)
                    }
                }
            }, 10000)

            return () => clearInterval(interval)
        } else {
            getAllUserMessages()
            fetchSupportTickets() // Also fetch tickets when closed for count
            const interval = setInterval(() => {
                if (userId && !isOpen) {
                    getAllUserMessages()
                    fetchSupportTickets()
                }
            }, 30000)

            return () => clearInterval(interval)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, isOpen, selectedConversation?.id, selectedTicket?.id])

    // Handle Enter key to send message
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // Format message time
    const formatMessageTime = (timestamp) => {
        if (!timestamp) return ""
        try {
            const date = new Date(timestamp)
            if (isToday(date)) {
                return format(date, "HH:mm")
            } else if (isYesterday(date)) {
                return "Yesterday " + format(date, "HH:mm")
            } else {
                return format(date, "MMM d, HH:mm")
            }
        } catch {
            return ""
        }
    }

    // Format conversation time
    const formatConversationTime = (timestamp) => {
        if (!timestamp) return ""
        try {
            const date = new Date(timestamp)
            return formatDistanceToNow(date, { addSuffix: true })
        } catch {
            return ""
        }
    }

    // Get user initials
    const getUserInitials = (user) => {
        if (!user) return "U"
        const fname = user?.fname || ""
        const lname = user?.lname || ""
        return `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase() || "U"
    }

    // Get status badge
    const getStatusBadge = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
            in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
            resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        }
        const color = colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        const label = status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"
        
        return (
            <Badge className={color} variant="outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                {label}
            </Badge>
        )
    }

    // Check if message is from admin
    const isAdminMessage = (message) => {
        return message.user_type_id === 1 || message.user_type_id === 2 || message.sender_type === 'admin' || message.sender_type === 'staff'
    }

    // Filter conversations by search
    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        const userName = `${conv.other_user?.fname || ''} ${conv.other_user?.lname || ''}`.toLowerCase()
        const email = conv.other_user?.email?.toLowerCase() || ""
        const lastMessage = conv.last_message?.toLowerCase() || ""
        return userName.includes(query) || email.includes(query) || lastMessage.includes(query)
    })

    // Filter tickets by search and status
    const filteredTickets = supportTickets.filter((ticket) => {
        // Filter by status
        if (statusFilter !== "all" && ticket.status !== statusFilter) {
            return false
        }
        
        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                ticket.ticket_number?.toLowerCase().includes(query) ||
                ticket.user_name?.toLowerCase().includes(query) ||
                ticket.user_email?.toLowerCase().includes(query) ||
                ticket.subject?.toLowerCase().includes(query) ||
                ticket.message?.toLowerCase().includes(query)
            )
        }
        
        return true
    })

    // Combine all items for display
    const allItems = [
        ...filteredTickets.map(ticket => ({ type: 'ticket', data: ticket })),
        ...filteredConversations.map(conv => ({ type: 'conversation', data: conv }))
    ].sort((a, b) => {
        // Sort by date - most recent first
        const dateA = a.type === 'ticket' 
            ? new Date(a.data.created_at || a.data.last_message_at)
            : new Date(a.data.last_message_time || 0)
        const dateB = b.type === 'ticket'
            ? new Date(b.data.created_at || b.data.last_message_at)
            : new Date(b.data.last_message_time || 0)
        return dateB - dateA
    })

    // Calculate total badge count (unread messages + active tickets)
    const totalBadgeCount = unreadCount + (ticketCount > 0 ? ticketCount : 0)

    return (
        <>
            {/* Floating Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggle()
                }}
                className={cn(
                    "fixed z-[100] flex items-center justify-center",
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-full",
                    "shadow-md transition-all duration-200 ease-in-out",
                    "bg-orange-500 hover:bg-orange-600",
                    "text-white hover:scale-105 active:scale-95",
                    "border-2 border-white dark:border-gray-800",
                    "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2",
                    "cursor-pointer select-none",
                    "mobile-safe-bottom",
                    "pointer-events-auto"
                )}
                style={{
                    bottom: '100px',
                    right: '24px',
                    zIndex: 100,
                    cursor: 'pointer',
                    pointerEvents: 'auto'
                }}
                aria-label="Messages & Support"
                title="Messages & Support"
            >
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                {totalBadgeCount > 0 && (
                    <Badge
                        className={cn(
                            "absolute -top-1 -right-1 min-w-[18px] h-5 px-1.5 z-20",
                            "flex items-center justify-center",
                            "bg-red-500 text-white text-[10px] font-semibold",
                            "border-2 border-white dark:border-gray-800",
                            "rounded-full"
                        )}
                    >
                        {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
                    </Badge>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed z-[100] transition-all duration-300 ease-in-out",
                        "w-[calc(100vw-2rem)] sm:w-96 h-[600px] md:h-[700px] max-h-[calc(100vh-8rem)]",
                        "bg-white dark:bg-gray-800 rounded-xl shadow-2xl",
                        "border-2 border-gray-200 dark:border-gray-700",
                        "flex flex-col overflow-hidden",
                        "max-w-full",
                        "backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95"
                    )}
                    style={{
                        bottom: '100px',
                        right: '24px',
                        zIndex: 100,
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 bg-orange-500 text-white border-b border-orange-600">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            <h3 className="font-semibold text-sm">
                                Messages & Support
                            </h3>
                            {totalBadgeCount > 0 && (
                                <Badge className="bg-white text-orange-600 text-xs px-1.5 py-0.5">
                                    {totalBadgeCount} new
                                </Badge>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {!selectedConversation && !selectedTicket ? (
                        // List View
                        <div className="flex flex-col h-full">
                            {/* Filters */}
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 h-9 text-sm"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-8 text-xs">
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

                            {/* Items List */}
                            <ScrollArea className="flex-1">
                                {!userId && !userIdLoadingTimeout ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 p-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                                        <p className="text-xs opacity-75">Loading...</p>
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 p-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                                        <p className="text-xs opacity-75">Loading...</p>
                                    </div>
                                ) : allItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 p-4">
                                        <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No items found</p>
                                        <p className="text-xs mt-2 opacity-75 text-center max-w-xs">
                                            {searchQuery || statusFilter !== "all"
                                                ? "Try adjusting your filters"
                                                : "Messages and support tickets will appear here"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {allItems.map((item) => {
                                            if (item.type === 'ticket') {
                                                const ticket = item.data
                                                return (
                                                    <button
                                                        key={`ticket-${ticket.id}`}
                                                        onClick={() => handleTicketSelect(ticket)}
                                                        className={cn(
                                                            "w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                                                            "transition-colors text-left flex items-start gap-3",
                                                            (ticket.status === 'pending' || ticket.status === 'in_progress') &&
                                                            "bg-orange-50 dark:bg-orange-900/10"
                                                        )}
                                                    >
                                                        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                            <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1 gap-2">
                                                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                    {ticket.user_name || ticket.user_email || 'Unknown User'}
                                                                </p>
                                                                {getStatusBadge(ticket.status)}
                                                            </div>
                                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                                                                {ticket.subject}
                                                            </p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">
                                                                {ticket.message}
                                                            </p>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {ticket.ticket_number}
                                                                </span>
                                                                {ticket.last_message_at && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                                        {formatConversationTime(ticket.last_message_at)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                )
                                            } else {
                                                const conv = item.data
                                                return (
                                                    <button
                                                        key={conv.id || conv.other_user.id}
                                                        onClick={() => handleConversationSelect(conv)}
                                                        className={cn(
                                                            "w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                                                            "transition-colors text-left flex items-start gap-3",
                                                            conv.unread_count > 0 &&
                                                            "bg-orange-50 dark:bg-orange-900/10"
                                                        )}
                                                    >
                                                        <Avatar className="w-10 h-10 flex-shrink-0">
                                                            <AvatarFallback className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400">
                                                                {getUserInitials(conv.other_user)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                    {conv.other_user?.fname} {conv.other_user?.lname}
                                                                </p>
                                                                {conv.last_message_time && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                                                                        {formatConversationTime(conv.last_message_time)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                                    {conv.last_message || "No messages yet"}
                                                                </p>
                                                                {conv.unread_count > 0 && (
                                                                    <Badge className="bg-orange-500 text-white text-xs h-5 min-w-[20px] flex items-center justify-center">
                                                                        {conv.unread_count}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                )
                                            }
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    ) : (
                        // Chat/Ticket View
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                            {selectedTicket ? (
                                                <Ticket className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                            ) : (
                                                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                                    {getUserInitials(selectedConversation?.other_user)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            {selectedTicket ? (
                                                <>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                        {selectedTicket.user_name || selectedTicket.user_email || 'Unknown User'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {selectedTicket.subject}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                        {selectedConversation?.other_user?.fname} {selectedConversation?.other_user?.lname}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {selectedConversation?.other_user?.email}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>
                                {selectedTicket && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Status:</span>
                                        <Select 
                                            value={selectedTicket.status} 
                                            onValueChange={handleUpdateStatus}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="resolved">Resolved</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                                            {selectedTicket.ticket_number}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4">
                                {isLoadingMessages ? (
                                    <div className="flex items-center justify-center h-32">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                                        <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                                        <p className="text-sm">No messages yet</p>
                                        <p className="text-xs mt-1">Start the conversation</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((message) => {
                                            const isAdmin = isAdminMessage(message)
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={cn(
                                                        "flex gap-2",
                                                        isAdmin ? "justify-end" : "justify-start"
                                                    )}
                                                >
                                                    {!isAdmin && (
                                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                                            <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                                                {selectedTicket 
                                                                    ? getUserInitials({ fname: selectedTicket.user_name?.split(' ')[0], lname: selectedTicket.user_name?.split(' ')[1] })
                                                                    : getUserInitials(selectedConversation?.other_user)
                                                                }
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div
                                                        className={cn(
                                                            "max-w-[75%] rounded-lg px-3 py-2",
                                                            isAdmin
                                                                ? "bg-orange-500 text-white"
                                                                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                        )}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap break-words">
                                                            {message.message}
                                                        </p>
                                                        <div
                                                            className={cn(
                                                                "flex items-center gap-1 mt-1 text-xs",
                                                                isAdmin
                                                                    ? "text-orange-100"
                                                                    : "text-gray-500 dark:text-gray-400"
                                                            )}
                                                        >
                                                            <span>{formatMessageTime(message.created_at || message.timestamp)}</span>
                                                            {isAdmin && (
                                                                <span>
                                                                    {message.is_read ? (
                                                                        <CheckCheck className="w-3 h-3 inline" />
                                                                    ) : (
                                                                        <Check className="w-3 h-3 inline" />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isAdmin && (
                                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                                            <AvatarFallback className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs">
                                                                A
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Message Input */}
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <div className="flex gap-2">
                                    <Input
                                        ref={messageInputRef}
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type a message..."
                                        className="flex-1 text-sm"
                                        disabled={isSending}
                                    />
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim() || isSending || (!selectedConversation && !selectedTicket)}
                                        size="icon"
                                        className="bg-orange-500 hover:bg-orange-600 text-white"
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

export default AdminChat
