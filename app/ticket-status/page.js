"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Ticket, Mail, MessageCircle, Send, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { cn } from "@/lib/utils"

const SUPPORT_API_URL = "https://api.cnergy.site/support_tickets.php"

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

    // Get ticket number from URL if available
    useEffect(() => {
        const ticketParam = searchParams.get("ticket")
        if (ticketParam) {
            setTicketNumber(ticketParam)
        }
    }, [searchParams])

    // Fetch ticket when both ticket number and email are provided
    const fetchTicket = async () => {
        if (!ticketNumber.trim() || !email.trim()) {
            setError("Please enter both ticket number and email")
            return
        }

        setIsLoading(true)
        setError("")
        setTicket(null)
        setMessages([])

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
                setTicket(data.ticket)
                setMessages(data.messages || [])
                setVerified(true)
                setError("")
            } else {
                setError(data.error || "Failed to fetch ticket")
                setTicket(null)
                setMessages([])
                setVerified(false)
            }
        } catch (err) {
            setError("Network error. Please try again.")
            console.error("Error fetching ticket:", err)
            setTicket(null)
            setMessages([])
            setVerified(false)
        } finally {
            setIsLoading(false)
        }
    }

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        CNERGY GYM
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Support Ticket Status
                    </p>
                </div>

                {!verified ? (
                    /* Verification Form */
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Ticket className="w-5 h-5" />
                                Check Ticket Status
                            </CardTitle>
                            <CardDescription>
                                Enter your ticket number and email to view your ticket status and conversation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="ticketNumber">Ticket Number</Label>
                                    <Input
                                        id="ticketNumber"
                                        type="text"
                                        placeholder="REQ-00000"
                                        value={ticketNumber}
                                        onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                                        className="mt-1"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                fetchTicket()
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1"
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                fetchTicket()
                                            }
                                        }}
                                    />
                                </div>
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <Button
                                    onClick={fetchTicket}
                                    disabled={isLoading || !ticketNumber.trim() || !email.trim()}
                                    className="w-full"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <Ticket className="w-4 h-4 mr-2" />
                                            View Ticket
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : ticket ? (
                    /* Ticket View */
                    <div className="space-y-4">
                        {/* Ticket Info Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Ticket className="w-5 h-5" />
                                        {ticket.subject}
                                    </CardTitle>
                                    {getStatusBadge(ticket.status)}
                                </div>
                                <CardDescription>
                                    Ticket #{ticket.ticket_number} • Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</Label>
                                        <p className="text-sm">{getStatusBadge(ticket.status)}</p>
                                    </div>
                                    {ticket.status === 'resolved' && (
                                        <Alert>
                                            <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        This ticket has been resolved. If you&apos;re still experiencing issues, please reply to this ticket.
                                    </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Messages Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5" />
                                    Conversation
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] pr-4">
                                    {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                                            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                                            <p className="text-sm">No messages yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((message) => {
                                                const isAdmin = isAdminMessage(message)
                                                return (
                                                    <div
                                                        key={message.id}
                                                        className={cn(
                                                            "flex gap-3",
                                                            isAdmin ? "justify-end" : "justify-start"
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "max-w-[75%] rounded-lg px-4 py-3",
                                                                isAdmin
                                                                    ? "bg-orange-500 text-white"
                                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-medium">
                                                                    {isAdmin ? "Support Team" : message.sender_name || "You"}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm whitespace-pre-wrap break-words">
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
                                                )
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Reply Card */}
                        {ticket.status !== 'resolved' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Reply to Ticket</CardTitle>
                                    <CardDescription>
                                        Send a message to our support team. They will respond as soon as possible.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {error && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        )}
                                        <div>
                                            <Label htmlFor="message">Your Message</Label>
                                            <textarea
                                                id="message"
                                                rows={4}
                                                value={messageInput}
                                                onChange={(e) => setMessageInput(e.target.value)}
                                                placeholder="Type your message here..."
                                                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white"
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
                                            className="w-full"
                                        >
                                            {isSending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Send Message
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Back Button */}
                        <div className="text-center">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setVerified(false)
                                    setTicket(null)
                                    setMessages([])
                                    setError("")
                                }}
                            >
                                Check Another Ticket
                            </Button>
                        </div>
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

