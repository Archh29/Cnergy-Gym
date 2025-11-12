"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Ticket, MessageCircle, Send, AlertCircle, CheckCircle, Clock, ArrowLeft, User } from "lucide-react"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { cn } from "@/lib/utils"

const SUPPORT_API_URL = "https://api.cnergy.site/support_tickets.php"
const AUTO_REFRESH_INTERVAL = 5000 // 5 seconds

function TicketStatusContent() {
    const searchParams = useSearchParams()
    const [ticketNumber, setTicketNumber] = useState("")
    const [email, setEmail] = useState("")
    const [ticket, setTicket] = useState(null)
    const [messages, setMessages] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [messageInput, setMessageInput] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [verified, setVerified] = useState(false)
    const messagesEndRef = useRef(null)
    const scrollAreaRef = useRef(null)
    const autoRefreshIntervalRef = useRef(null)
    const previousMessageCountRef = useRef(0)

    // Get ticket number from URL if available
    useEffect(() => {
        const ticketParam = searchParams.get("ticket")
        if (ticketParam) {
            setTicketNumber(ticketParam)
        }
    }, [searchParams])

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        // Try scrolling the element into view first (works in most cases)
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
        // Fallback: directly scroll the ScrollArea viewport
        if (scrollAreaRef.current) {
            // Radix UI ScrollArea creates a viewport element - try to find and scroll it
            const viewport = scrollAreaRef.current.querySelector('[style*="overflow"]') ||
                scrollAreaRef.current.firstElementChild
            if (viewport && viewport.scrollHeight) {
                setTimeout(() => {
                    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })
                }, 50)
            }
        }
    }

    // Fetch ticket when both ticket number and email are provided
    const fetchTicket = useCallback(async (silent = false) => {
        if (!ticketNumber.trim() || !email.trim()) {
            setError("Please enter both ticket number and email")
            return
        }

        if (!silent) {
            setIsLoading(true)
            setError("")
            setTicket(null)
            setMessages([])
        }

        try {
            const response = await fetch(
                `${SUPPORT_API_URL}?action=get_ticket_by_number&ticket_number=${encodeURIComponent(ticketNumber.trim())}&email=${encodeURIComponent(email.trim())}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            )

            const data = await response.json()

            if (data.success) {
                const previousCount = previousMessageCountRef.current
                const newMessages = data.messages || []
                const hasNewMessages = silent && newMessages.length > previousCount

                setTicket(data.ticket)
                setMessages(newMessages)

                // Update previous message count
                previousMessageCountRef.current = newMessages.length

                // Auto-scroll to bottom if new messages arrived during silent refresh
                if (hasNewMessages) {
                    setTimeout(() => {
                        scrollToBottom()
                    }, 200)
                }

                if (!silent) {
                    setVerified(true)
                    setError("")
                    // Scroll to bottom on initial load
                    setTimeout(() => {
                        scrollToBottom()
                    }, 200)
                }
            } else {
                if (!silent) {
                    setError(data.error || "Failed to fetch ticket")
                    setTicket(null)
                    setMessages([])
                    setVerified(false)
                }
            }
        } catch (err) {
            if (!silent) {
                setError("Network error. Please try again.")
                console.error("Error fetching ticket:", err)
                setTicket(null)
                setMessages([])
                setVerified(false)
            }
        } finally {
            if (!silent) {
                setIsLoading(false)
            }
        }
    }, [ticketNumber, email])

    // Initialize message count when messages first load
    useEffect(() => {
        if (verified && ticket && messages.length > 0 && previousMessageCountRef.current === 0) {
            previousMessageCountRef.current = messages.length
        }
    }, [verified, ticket, messages.length])

    // Auto-refresh messages when ticket is verified
    useEffect(() => {
        if (verified && ticket && ticketNumber.trim() && email.trim()) {
            // Set up auto-refresh interval
            autoRefreshIntervalRef.current = setInterval(() => {
                fetchTicket(true) // Silent refresh
            }, AUTO_REFRESH_INTERVAL)

            // Cleanup interval on unmount or when verified/ticket changes
            return () => {
                if (autoRefreshIntervalRef.current) {
                    clearInterval(autoRefreshIntervalRef.current)
                    autoRefreshIntervalRef.current = null
                }
            }
        } else {
            // Clear interval if not verified
            if (autoRefreshIntervalRef.current) {
                clearInterval(autoRefreshIntervalRef.current)
                autoRefreshIntervalRef.current = null
            }
        }
    }, [verified, ticket, ticketNumber, email, fetchTicket])

    // Send reply message
    const sendMessage = async () => {
        if (!messageInput.trim() || !ticket || isSending) {
            return
        }

        const messageText = messageInput.trim()
        setMessageInput("")
        setIsSending(true)

        try {
            // Create a new message via the support API
            // Since user might not be logged in, we'll need to use the ticket's user_id
            const response = await fetch(SUPPORT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    action: "send_message",
                    ticket_id: ticket.id,
                    sender_id: ticket.user_id,
                    message: messageText,
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Refresh ticket and messages
                await fetchTicket()
                setMessageInput("")
            } else {
                setError(data.error || "Failed to send message")
            }
        } catch (err) {
            setError("Network error. Please try again.")
            console.error("Error sending message:", err)
        } finally {
            setIsSending(false)
        }
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
            <Badge className={color} variant="outline">
                {label}
            </Badge>
        )
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

    // Check if message is from admin
    const isAdminMessage = (message) => {
        return message.user_type_id === 1 || message.user_type_id === 2 || message.sender_type === 'admin' || message.sender_type === 'staff'
    }

    const handleBack = () => {
        setVerified(false)
        setTicket(null)
        setMessages([])
        setError("")
        setMessageInput("")
        previousMessageCountRef.current = 0
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-2">
                        CNERGY GYM
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Support Ticket Status
                    </p>
                </div>

                {!verified ? (
                    /* Verification Form */
                    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 pb-6">
                            <CardTitle className="flex items-center gap-3 text-2xl">
                                <div className="p-2 bg-orange-500 rounded-lg text-white">
                                    <Ticket className="w-6 h-6" />
                                </div>
                                Check Ticket Status
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                Enter your ticket number and email to view your ticket status and conversation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-5">
                                <div>
                                    <Label htmlFor="ticketNumber" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                        Ticket Number
                                    </Label>
                                    <Input
                                        id="ticketNumber"
                                        type="text"
                                        placeholder="REQ-00000"
                                        value={ticketNumber}
                                        onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                                        className="h-12 text-base border-2 focus:border-orange-500 focus:ring-orange-500"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                fetchTicket()
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 text-base border-2 focus:border-orange-500 focus:ring-orange-500"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                fetchTicket()
                                            }
                                        }}
                                    />
                                </div>
                                {error && (
                                    <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                                    </Alert>
                                )}
                                <Button
                                    onClick={fetchTicket}
                                    disabled={isLoading || !ticketNumber.trim() || !email.trim()}
                                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <Ticket className="w-5 h-5 mr-2" />
                                            View Ticket
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : ticket ? (
                    /* Ticket View */
                    <div className="space-y-6">
                        {/* Back Button */}
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            className="mb-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Search
                        </Button>

                        {/* Ticket Info Card */}
                        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-3 text-xl mb-2">
                                            <div className="p-2 bg-orange-500 rounded-lg text-white">
                                                <Ticket className="w-5 h-5" />
                                            </div>
                                            <span className="text-gray-900 dark:text-white">{ticket.subject}</span>
                                        </CardTitle>
                                        <CardDescription className="text-base mt-2">
                                            Ticket <span className="font-semibold text-gray-900 dark:text-gray-100">#{ticket.ticket_number}</span> • Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                                        </CardDescription>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {getStatusBadge(ticket.status)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    {ticket.status === 'resolved' && (
                                        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <AlertDescription className="text-green-800 dark:text-green-200">
                                                This ticket has been resolved. If you&apos;re still experiencing issues, please reply to this ticket.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Messages Card */}
                        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 border-b">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <div className="p-1.5 bg-orange-500 rounded-lg text-white">
                                            <MessageCircle className="w-4 h-4" />
                                        </div>
                                        Conversation
                                    </CardTitle>
                                    {verified && ticket && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
                                            <div className="relative">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                                            </div>
                                            <span className="text-xs font-medium text-green-700 dark:text-green-400">Live updates</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <ScrollArea ref={scrollAreaRef} className="h-[450px] pr-4">
                                    {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500 dark:text-gray-400">
                                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                                                <MessageCircle className="w-10 h-10 opacity-50" />
                                            </div>
                                            <p className="text-sm font-medium">No messages yet</p>
                                            <p className="text-xs mt-1">Start the conversation below</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-2">
                                            {messages.map((message) => {
                                                const isAdmin = isAdminMessage(message)
                                                return (
                                                    <div
                                                        key={message.id}
                                                        className={cn(
                                                            "flex gap-3 items-end",
                                                            isAdmin ? "justify-end" : "justify-start"
                                                        )}
                                                    >
                                                        {!isAdmin && (
                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold shadow-md">
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div className={cn("flex flex-col", isAdmin ? "items-end" : "items-start")}>
                                                            <div
                                                                className={cn(
                                                                    "max-w-[75%] rounded-2xl px-4 py-3 shadow-md",
                                                                    isAdmin
                                                                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm"
                                                                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-sm"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <span className={cn(
                                                                        "text-xs font-semibold",
                                                                        isAdmin ? "text-orange-50" : "text-gray-700 dark:text-gray-300"
                                                                    )}>
                                                                        {isAdmin ? "Support Team" : message.sender_name || "You"}
                                                                    </span>
                                                                </div>
                                                                <p className={cn(
                                                                    "text-sm whitespace-pre-wrap break-words leading-relaxed",
                                                                    isAdmin ? "text-white" : "text-gray-800 dark:text-gray-200"
                                                                )}>
                                                                    {message.message}
                                                                </p>
                                                                <div
                                                                    className={cn(
                                                                        "flex items-center gap-1 mt-2 text-xs",
                                                                        isAdmin
                                                                            ? "text-orange-100"
                                                                            : "text-gray-500 dark:text-gray-400"
                                                                    )}
                                                                >
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{formatMessageTime(message.created_at)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold shadow-md">
                                                                <MessageCircle className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                            {/* Invisible div for scrolling to bottom */}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Reply Card */}
                        {ticket.status !== 'resolved' && (
                            <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10">
                                    <CardTitle className="flex items-center gap-2">
                                        <Send className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                        Reply to Ticket
                                    </CardTitle>
                                    <CardDescription className="text-base">
                                        Send a message to our support team. They will respond as soon as possible.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        {error && (
                                            <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                                            </Alert>
                                        )}
                                        <div>
                                            <Label htmlFor="message" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                                Your Message
                                            </Label>
                                            <textarea
                                                id="message"
                                                rows={4}
                                                value={messageInput}
                                                onChange={(e) => setMessageInput(e.target.value)}
                                                placeholder="Type your message here... (Press Ctrl+Enter to send)"
                                                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all"
                                                onKeyPress={(e) => {
                                                    if (e.key === "Enter" && e.ctrlKey) {
                                                        sendMessage()
                                                    }
                                                }}
                                            />
                                        </div>
                                        <Button
                                            onClick={sendMessage}
                                            disabled={!messageInput.trim() || isSending}
                                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11 text-base font-semibold"
                                        >
                                            {isSending ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5 mr-2" />
                                                    Send Message
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default function TicketStatusPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        }>
            <TicketStatusContent />
        </Suspense>
    )
}

