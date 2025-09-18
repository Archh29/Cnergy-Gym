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
import { 
    Users, 
    Clock, 
    CheckCircle, 
    XCircle, 
    DollarSign, 
    AlertCircle,
    RefreshCw,
    Eye,
    UserCheck,
    UserX
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://api.cnergy.site/guest_session_admin.php';

export default function GuestManagement() {
    const [guestSessions, setGuestSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const { toast } = useToast();

    useEffect(() => {
        fetchGuestSessions();
    }, []);

    const fetchGuestSessions = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}?action=get_all_sessions`);
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
        try {
            setActionLoading(true);
            const response = await axios.post(API_URL, {
                action: 'approve_session',
                session_id: sessionId
            });

            if (response.data.success) {
                toast({
                    title: "Success",
                    description: "Guest session approved successfully",
                });
                fetchGuestSessions();
                setShowDetailsDialog(false);
            } else {
                toast({
                    title: "Error",
                    description: response.data.message || "Failed to approve session",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error approving session:', error);
            toast({
                title: "Error",
                description: "Failed to approve session",
                variant: "destructive"
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (sessionId) => {
        try {
            setActionLoading(true);
            const response = await axios.post(API_URL, {
                action: 'reject_session',
                session_id: sessionId
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

    const handleMarkPaid = async (sessionId) => {
        try {
            setActionLoading(true);
            const response = await axios.post(API_URL, {
                action: 'mark_paid',
                session_id: sessionId
            });

            if (response.data.success) {
                toast({
                    title: "Success",
                    description: "Payment confirmed successfully",
                });
                fetchGuestSessions();
                setShowDetailsDialog(false);
            } else {
                toast({
                    title: "Error",
                    description: response.data.message || "Failed to confirm payment",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error marking as paid:', error);
            toast({
                title: "Error",
                description: "Failed to confirm payment",
                variant: "destructive"
            });
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status, paid) => {
        if (status === 'pending') {
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
        } else if (status === 'approved' && paid == 0) {
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Approved - Awaiting Payment</Badge>;
        } else if (status === 'approved' && paid == 1) {
            return <Badge variant="secondary" className="bg-green-100 text-green-800">Paid & Active</Badge>;
        } else if (status === 'rejected') {
            return <Badge variant="destructive">Rejected</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
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
        return new Date(validUntil) < new Date();
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredSessions = guestSessions.filter(session => {
        if (activeTab === 'pending') return session.status === 'pending';
        if (activeTab === 'approved') return session.status === 'approved' && session.paid == 0;
        if (activeTab === 'active') return session.status === 'approved' && session.paid == 1;
        if (activeTab === 'rejected') return session.status === 'rejected';
        return true;
    });

    const stats = {
        pending: guestSessions.filter(s => s.status === 'pending').length,
        awaitingPayment: guestSessions.filter(s => s.status === 'approved' && s.paid == 0).length,
        active: guestSessions.filter(s => s.status === 'approved' && s.paid == 1).length,
        rejected: guestSessions.filter(s => s.status === 'rejected').length
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
                <Button onClick={fetchGuestSessions} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
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
                        <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.awaitingPayment}</div>
                        <p className="text-xs text-muted-foreground">
                            Approved, not paid
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
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                            <TabsTrigger value="approved">Awaiting Payment ({stats.awaitingPayment})</TabsTrigger>
                            <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value={activeTab} className="mt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Guest Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Requested</TableHead>
                                        <TableHead>Valid Until</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No guest sessions found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSessions.map((session) => (
                                            <TableRow key={session.id}>
                                                <TableCell className="font-medium">
                                                    {session.guest_name}
                                                </TableCell>
                                                <TableCell>
                                                    {getGuestTypeBadge(session.guest_type)}
                                                </TableCell>
                                                <TableCell>₱{session.amount_paid}</TableCell>
                                                <TableCell>
                                                    {getStatusBadge(session.status, session.paid)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(session.created_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <span>{formatDate(session.valid_until)}</span>
                                                        {isSessionExpired(session.valid_until) && activeTab === 'rejected' && (
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
                                    <p className="text-lg font-semibold">{selectedSession.guest_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Guest Type</label>
                                    <div className="mt-1">
                                        {getGuestTypeBadge(selectedSession.guest_type)}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Amount Paid</label>
                                    <p className="text-lg font-semibold">₱{selectedSession.amount_paid}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        {getStatusBadge(selectedSession.status, selectedSession.paid)}
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

                            {selectedSession.status === 'pending' && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        This guest session is pending approval. Review the details and approve or reject the request.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {selectedSession.status === 'approved' && selectedSession.paid == 0 && (
                                <Alert>
                                    <DollarSign className="h-4 w-4" />
                                    <AlertDescription>
                                        This session has been approved. Mark as paid once payment is received.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {selectedSession.status === 'approved' && selectedSession.paid == 1 && (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        This guest session is active and paid. The guest can now use the gym facilities.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                            Close
                        </Button>
                        <div className="flex space-x-2">
                            {selectedSession?.status === 'pending' && (
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
                                        Approve
                                    </Button>
                                </>
                            )}
                            {selectedSession?.status === 'approved' && selectedSession.paid == 0 && (
                                <Button
                                    onClick={() => handleMarkPaid(selectedSession.id)}
                                    disabled={actionLoading}
                                >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Mark as Paid
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
