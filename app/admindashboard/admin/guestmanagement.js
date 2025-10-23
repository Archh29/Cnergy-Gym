'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    Users,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    Eye,
    UserCheck,
    UserX,
    Search,
    Filter,
    Calendar,
    CreditCard,
    Receipt,
    Plus
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://api.cnergy.site/guest_session_admin.php';

export default function GuestManagement({ userId }) {
    const [guestSessions, setGuestSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const { toast } = useToast();

    // POS state
    const [showPOSDialog, setShowPOSDialog] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [amountReceived, setAmountReceived] = useState("");
    const [changeGiven, setChangeGiven] = useState(0);
    const [receiptNumber, setReceiptNumber] = useState("");
    const [transactionNotes, setTransactionNotes] = useState("");
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastTransaction, setLastTransaction] = useState(null);
    const [newGuestData, setNewGuestData] = useState({
        guest_name: "",
        guest_type: "walkin",
        amount_paid: "",
        payment_method: "cash",
        amount_received: "",
        notes: ""
    });

    useEffect(() => {
        fetchGuestSessions();
    }, []);

    const fetchGuestSessions = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}?action=get_all_sessions`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.success) {
                setGuestSessions(response.data.data || []);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to fetch guest sessions",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error fetching guest sessions:', error);
            toast({
                title: "Error",
                description: "Failed to fetch guest sessions",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (sessionId) => {
        // Find the session to get payment details
        const session = guestSessions?.find(s => s.id === sessionId);
        if (!session) {
            toast({
                title: "Error",
                description: "Session not found",
                variant: "destructive"
            });
            return;
        }

        // Set up payment data for this session
        setNewGuestData({
            guest_name: session.guest_name || "",
            guest_type: session.guest_type || "walkin",
            amount_paid: session.amount_paid || "",
            payment_method: "cash",
            amount_received: "",
            notes: ""
        });

        // Show payment dialog
        setShowPOSDialog(true);
    };

    const handleReject = async (sessionId) => {
        try {
            setActionLoading(true);
            const response = await axios.post(`${API_URL}`, {
                action: 'reject_session',
                session_id: sessionId,
                staff_id: userId
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                toast({
                    title: "Success",
                    description: "Guest session rejected successfully",
                });
                fetchGuestSessions();
                setShowDetailsDialog(false);
            } else {
                toast({
                    title: "Error",
                    description: response.data.message || "Failed to reject session",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error rejecting session:', error);
            toast({
                title: "Error",
                description: "Failed to reject session",
                variant: "destructive"
            });
        } finally {
            setActionLoading(false);
        }
    };

    // POS Functions
    const handleCreateGuestPOS = async () => {
        if (!newGuestData.guest_name || !newGuestData.amount_paid) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        const totalAmount = parseFloat(newGuestData.amount_paid);
        const receivedAmount = parseFloat(newGuestData.amount_received) || totalAmount;

        if (newGuestData.payment_method === "cash" && receivedAmount < totalAmount) {
            toast({
                title: "Insufficient Payment",
                description: `Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.`,
                variant: "destructive"
            });
            return;
        }

        setShowConfirmDialog(true);
    };

    const confirmGuestTransaction = async () => {
        setShowConfirmDialog(false);

        const totalAmount = parseFloat(newGuestData.amount_paid);
        const receivedAmount = parseFloat(newGuestData.amount_received) || totalAmount;
        const change = Math.max(0, receivedAmount - totalAmount);

        try {
            setActionLoading(true);

            // First, find the pending session to approve
            const pendingSession = guestSessions?.find(s =>
                s.guest_name === newGuestData.guest_name &&
                s.amount_paid == newGuestData.amount_paid &&
                (s.computed_status || getComputedStatus(s)) === 'pending'
            );

            if (pendingSession) {
                // Process payment and approve the existing session
                const response = await axios.post(`${API_URL}`, {
                    action: 'approve_session_with_payment',
                    session_id: pendingSession.id,
                    payment_method: newGuestData.payment_method,
                    staff_id: userId,
                    amount_received: receivedAmount,
                    notes: newGuestData.notes
                }, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data.success) {
                    setLastTransaction({
                        ...response.data,
                        change_given: change,
                        total_amount: totalAmount,
                        payment_method: newGuestData.payment_method
                    });
                    setReceiptNumber(response.data.receipt_number);
                    setChangeGiven(change);
                    setShowReceipt(true);

                    toast({
                        title: "Success",
                        description: "Guest session approved and payment processed successfully",
                    });
                } else {
                    throw new Error(response.data.message || "Failed to approve session with payment");
                }
            } else {
                // Fallback: create new session if no pending session found
                const response = await axios.post(`${API_URL}`, {
                    action: 'create_guest_session',
                    guest_name: newGuestData.guest_name,
                    guest_type: newGuestData.guest_type,
                    staff_id: userId,
                    amount_paid: totalAmount,
                    payment_method: newGuestData.payment_method,
                    amount_received: receivedAmount,
                    notes: newGuestData.notes
                }, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data.success) {
                    setLastTransaction({
                        ...response.data,
                        change_given: change,
                        total_amount: totalAmount,
                        payment_method: newGuestData.payment_method
                    });
                    setReceiptNumber(response.data.receipt_number);
                    setChangeGiven(change);
                    setShowReceipt(true);

                    toast({
                        title: "Success",
                        description: "Guest session created and payment processed successfully",
                    });
                } else {
                    throw new Error(response.data.message || "Failed to create guest session");
                }
            }

            // Reset form and close dialogs
            setNewGuestData({
                guest_name: "",
                guest_type: "walkin",
                amount_paid: "",
                payment_method: "cash",
                amount_received: "",
                notes: ""
            });
            setShowPOSDialog(false);
            setShowDetailsDialog(false);
            fetchGuestSessions();

        } catch (error) {
            console.error('Error processing guest payment:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to process payment",
                variant: "destructive"
            });
        } finally {
            setActionLoading(false);
        }
    };

    const calculateChange = () => {
        const total = parseFloat(newGuestData.amount_paid) || 0;
        const received = parseFloat(newGuestData.amount_received) || 0;
        const change = Math.max(0, received - total);
        setChangeGiven(change);
        return change;
    };

    // Calculate change whenever amount received or amount paid changes
    useEffect(() => {
        if (newGuestData.payment_method === "cash" && newGuestData.amount_received) {
            calculateChange();
        }
    }, [newGuestData.amount_received, newGuestData.amount_paid, newGuestData.payment_method]);

    const getStatusBadge = (session) => {
        const computedStatus = session.computed_status || getComputedStatus(session);

        switch (computedStatus) {
            case 'pending':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case 'awaiting_payment':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Awaiting Payment</Badge>;
            case 'active':
                return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
            case 'expired':
                return <Badge variant="destructive" className="bg-red-100 text-red-800">Expired</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="outline">{computedStatus}</Badge>;
        }
    };

    const getComputedStatus = (session) => {
        // Add null checks to prevent errors
        if (!session || !session.valid_until) {
            return session?.status || 'unknown';
        }

        const isExpired = new Date(session.valid_until) < new Date();

        if (session.status === 'pending') {
            return 'pending';
        } else if (session.status === 'approved' && session.paid == 0) {
            return 'awaiting_payment';
        } else if (session.status === 'approved' && session.paid == 1) {
            return isExpired ? 'expired' : 'active';
        } else if (session.status === 'rejected') {
            return 'rejected';
        }

        return session.status;
    };

    const getGuestTypeBadge = (type) => {
        const colors = {
            'walkin': 'bg-purple-100 text-purple-800',
            'trial': 'bg-orange-100 text-orange-800',
            'guest': 'bg-gray-100 text-gray-800'
        };
        return <Badge variant="secondary" className={colors[type] || 'bg-gray-100 text-gray-800'}>{type}</Badge>;
    };

    const isSessionExpired = (validUntil) => {
        if (!validUntil) return false;
        const date = new Date(validUntil);
        if (isNaN(date.getTime())) return false;
        return date < new Date();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredSessions = (guestSessions || []).filter(session => {
        // Add null check for session
        if (!session) return false;

        // Search filter
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                (session.guest_name || '').toLowerCase().includes(searchLower) ||
                (session.guest_type || '').toLowerCase().includes(searchLower) ||
                (session.qr_token || '').toLowerCase().includes(searchLower) ||
                (session.amount_paid || '').toString().includes(searchLower);

            if (!matchesSearch) return false;
        }

        // Date filter
        if (dateFilter && session.created_at) {
            const sessionDate = new Date(session.created_at).toDateString();
            const filterDate = new Date(dateFilter).toDateString();
            if (sessionDate !== filterDate) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
            const computedStatus = session.computed_status || getComputedStatus(session);
            if (computedStatus !== statusFilter) return false;
        }

        // Tab filter
        const computedStatus = session.computed_status || getComputedStatus(session);
        if (activeTab === 'pending') return computedStatus === 'pending';
        if (activeTab === 'active') return computedStatus === 'active';
        if (activeTab === 'expired') return computedStatus === 'expired';
        if (activeTab === 'rejected') return computedStatus === 'rejected';

        return true;
    });

    const stats = {
        pending: (guestSessions || []).filter(s => s && (s.computed_status || getComputedStatus(s)) === 'pending').length,
        active: (guestSessions || []).filter(s => s && (s.computed_status || getComputedStatus(s)) === 'active').length,
        expired: (guestSessions || []).filter(s => s && (s.computed_status || getComputedStatus(s)) === 'expired').length,
        rejected: (guestSessions || []).filter(s => s && (s.computed_status || getComputedStatus(s)) === 'rejected').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading guest sessions...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Guest Management</h1>
                    <p className="text-muted-foreground">
                        Manage guest session requests and payments
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchGuestSessions} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">
                            Awaiting approval
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">
                            Paid and active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.expired}</div>
                        <p className="text-xs text-muted-foreground">
                            Expired sessions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.rejected}</div>
                        <p className="text-xs text-muted-foreground">
                            Rejected requests
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Guest Sessions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Guest Sessions</CardTitle>
                    <CardDescription>
                        Manage guest session requests and track their status
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Search and Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name, type, QR token, or amount..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-[160px]"
                                placeholder="Filter by date"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDateFilter("")}
                                className="px-2"
                            >
                                Clear
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                            <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
                            <TabsTrigger value="expired">Expired ({stats.expired})</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-6">
                            <div className="rounded-md border overflow-hidden">
                                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-white z-10">
                                            <TableRow>
                                                <TableHead>Guest Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Payment</TableHead>
                                                <TableHead>Receipt</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Requested</TableHead>
                                                <TableHead>Valid Until</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSessions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                        No guest sessions found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredSessions.map((session) => (
                                                    <TableRow key={session.id}>
                                                        <TableCell className="font-medium">
                                                            {session.guest_name || 'N/A'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getGuestTypeBadge(session.guest_type || 'unknown')}
                                                        </TableCell>
                                                        <TableCell>₱{session.amount_paid || '0.00'}</TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {session.payment_method || "N/A"}
                                                                </Badge>
                                                                {session.change_given > 0 && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Change: ₱{session.change_given}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs font-mono">
                                                                {session.receipt_number || "N/A"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(session)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatDate(session.created_at)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center space-x-2">
                                                                <span>{formatDate(session.valid_until)}</span>
                                                                {(session.computed_status || getComputedStatus(session)) === 'expired' && (
                                                                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedSession(session);
                                                                    setShowDetailsDialog(true);
                                                                }}
                                                            >
                                                                <Eye className="h-4 w-4 mr-1" />
                                                                View
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Session Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Guest Session Details</DialogTitle>
                        <DialogDescription>
                            Review guest session information and take action
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Guest Name</label>
                                    <p className="text-lg font-semibold">{selectedSession.guest_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Guest Type</label>
                                    <div className="mt-1">
                                        {getGuestTypeBadge(selectedSession.guest_type || 'unknown')}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Amount Paid</label>
                                    <p className="text-lg font-semibold">₱{selectedSession.amount_paid || '0.00'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        {getStatusBadge(selectedSession)}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Requested At</label>
                                    <p>{formatDate(selectedSession.created_at)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Valid Until</label>
                                    <div className="flex items-center space-x-2">
                                        <p>{formatDate(selectedSession.valid_until)}</p>
                                        {isSessionExpired(selectedSession.valid_until) && selectedSession.status === 'rejected' && (
                                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const computedStatus = selectedSession.computed_status || getComputedStatus(selectedSession);

                                switch (computedStatus) {
                                    case 'pending':
                                        return (
                                            <Alert>
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    This guest session is pending approval. Review the details and approve or reject the request.
                                                </AlertDescription>
                                            </Alert>
                                        );
                                    case 'active':
                                        return (
                                            <Alert>
                                                <CheckCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    This guest session is active and paid. The guest can now use the gym facilities.
                                                </AlertDescription>
                                            </Alert>
                                        );
                                    case 'expired':
                                        return (
                                            <Alert>
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    This guest session has expired. The guest can no longer use the gym facilities.
                                                </AlertDescription>
                                            </Alert>
                                        );
                                    case 'rejected':
                                        return (
                                            <Alert>
                                                <XCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    This guest session has been rejected.
                                                </AlertDescription>
                                            </Alert>
                                        );
                                    default:
                                        return null;
                                }
                            })()}
                        </div>
                    )}

                    <DialogFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                            Close
                        </Button>
                        <div className="flex space-x-2">
                            {(() => {
                                const computedStatus = selectedSession?.computed_status || getComputedStatus(selectedSession);

                                switch (computedStatus) {
                                    case 'pending':
                                        return (
                                            <>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleReject(selectedSession.id)}
                                                    disabled={actionLoading}
                                                >
                                                    <UserX className="h-4 w-4 mr-2" />
                                                    Reject
                                                </Button>
                                                <Button
                                                    onClick={() => handleApprove(selectedSession.id)}
                                                    disabled={actionLoading}
                                                >
                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                    Approve & Mark Paid
                                                </Button>
                                            </>
                                        );
                                    default:
                                        return null;
                                }
                            })()}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* POS Dialog */}
            <Dialog open={showPOSDialog} onOpenChange={setShowPOSDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Process Payment & Approve Guest Session</DialogTitle>
                        <DialogDescription>
                            Process payment to approve this guest session
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Guest Name *</Label>
                                <Input
                                    value={newGuestData.guest_name}
                                    onChange={(e) => setNewGuestData({ ...newGuestData, guest_name: e.target.value })}
                                    placeholder="Enter guest name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Guest Type</Label>
                                <Select value={newGuestData.guest_type} onValueChange={(value) => setNewGuestData({ ...newGuestData, guest_type: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="walkin">Walk-in</SelectItem>
                                        <SelectItem value="trial">Trial</SelectItem>
                                        <SelectItem value="guest">Guest</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Amount to Pay (₱) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={newGuestData.amount_paid}
                                    onChange={(e) => setNewGuestData({ ...newGuestData, amount_paid: e.target.value })}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select value={newGuestData.payment_method} onValueChange={(value) => setNewGuestData({ ...newGuestData, payment_method: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="digital">Digital Payment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {newGuestData.payment_method === "cash" && (
                            <div className="space-y-2">
                                <Label>Amount Received (₱)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={newGuestData.amount_received}
                                    onChange={(e) => setNewGuestData({ ...newGuestData, amount_received: e.target.value })}
                                    placeholder="Enter amount received"
                                />
                                {newGuestData.amount_received && (
                                    <div className="text-sm text-muted-foreground">
                                        Change: ₱{changeGiven.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Input
                                value={newGuestData.notes}
                                onChange={(e) => setNewGuestData({ ...newGuestData, notes: e.target.value })}
                                placeholder="Add notes for this transaction"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPOSDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateGuestPOS} disabled={actionLoading}>
                            {actionLoading ? "Processing..." : "Process Payment & Approve"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Guest Transaction</DialogTitle>
                        <DialogDescription>Please review the transaction details before proceeding</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-medium">Guest Details:</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Guest Name:</span>
                                    <span>{newGuestData.guest_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Guest Type:</span>
                                    <span className="capitalize">{newGuestData.guest_type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-2 space-y-2">
                            <div className="flex justify-between font-medium">
                                <span>Total Amount:</span>
                                <span>₱{parseFloat(newGuestData.amount_paid || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Payment Method:</span>
                                <span className="capitalize">{newGuestData.payment_method}</span>
                            </div>
                            {newGuestData.payment_method === "cash" && (
                                <>
                                    <div className="flex justify-between">
                                        <span>Amount Received:</span>
                                        <span>₱{parseFloat(newGuestData.amount_received || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Change Given:</span>
                                        <span>₱{changeGiven.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {newGuestData.notes && (
                                <div className="pt-2">
                                    <p className="text-sm">
                                        <strong>Notes:</strong> {newGuestData.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmGuestTransaction} disabled={actionLoading}>
                            {actionLoading ? "Processing..." : "Confirm Transaction"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Dialog */}
            <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Guest Session Receipt</DialogTitle>
                        <DialogDescription>Guest session created successfully</DialogDescription>
                    </DialogHeader>
                    {lastTransaction && (
                        <div className="space-y-4">
                            <div className="text-center border-b pb-4">
                                <h3 className="text-lg font-bold">CNERGY GYM</h3>
                                <p className="text-sm text-muted-foreground">Guest Session Receipt</p>
                                <p className="text-xs text-muted-foreground">Receipt #: {receiptNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                    Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Guest Name:</span>
                                    <span className="font-medium">{newGuestData.guest_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Guest Type:</span>
                                    <span className="font-medium capitalize">{newGuestData.guest_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Payment Method:</span>
                                    <span className="font-medium capitalize">{lastTransaction.payment_method}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Amount:</span>
                                    <span className="font-medium">₱{lastTransaction.total_amount}</span>
                                </div>
                                {lastTransaction.payment_method === "cash" && (
                                    <>
                                        <div className="flex justify-between">
                                            <span>Amount Received:</span>
                                            <span>₱{parseFloat(newGuestData.amount_received) || lastTransaction.total_amount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Change Given:</span>
                                            <span className="font-medium">₱{changeGiven}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {newGuestData.notes && (
                                <div className="border-t pt-2">
                                    <p className="text-sm">
                                        <strong>Notes:</strong> {newGuestData.notes}
                                    </p>
                                </div>
                            )}

                            <div className="text-center pt-4">
                                <p className="text-sm text-muted-foreground">Thank you for choosing CNERGY!</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setShowReceipt(false)} className="w-full">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
