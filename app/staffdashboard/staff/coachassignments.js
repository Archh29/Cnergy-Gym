"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Search, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// This component handles pending coaching connections that need staff approval
const CoachAssignments = () => {
  const [searchQuery, setSearchQuery] = useState("")

  // Instead of all members, we only track pending connections
  const [pendingConnections, setPendingConnections] = useState([
    {
      id: "conn-1",
      memberName: "John Doe",
      coachName: "Coach A",
      requestDate: "2025-03-10",
      status: "pending", // pending, approved, rejected
    },
    {
      id: "conn-2",
      memberName: "Jane Smith",
      coachName: "Coach B",
      requestDate: "2025-03-11",
      status: "pending",
    },
  ])

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState(null)

  // Filter connections based on search query
  const filteredConnections = pendingConnections.filter(
    (conn) =>
      conn.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.coachName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle approving the connection and payment
  const handleApproveConnection = (connectionId) => {
    setPendingConnections((prev) =>
      prev.map((conn) => (conn.id === connectionId ? { ...conn, status: "approved" } : conn)),
    )
    setPaymentDialogOpen(false)
  }

  // Handle rejecting the connection
  const handleRejectConnection = (connectionId) => {
    setPendingConnections((prev) =>
      prev.map((conn) => (conn.id === connectionId ? { ...conn, status: "rejected" } : conn)),
    )
  }

  // Open payment dialog for a specific connection
  const openPaymentDialog = (connection) => {
    setSelectedConnection(connection)
    setPaymentDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Coach Connections</CardTitle>
        <CardDescription>Process payment for coach-member connections</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search connections..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredConnections.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell>{connection.memberName}</TableCell>
                  <TableCell>{connection.coachName}</TableCell>
                  <TableCell>{connection.requestDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        connection.status === "approved"
                          ? "success"
                          : connection.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {connection.status === "approved"
                        ? "Approved"
                        : connection.status === "rejected"
                          ? "Rejected"
                          : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {connection.status === "pending" && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => openPaymentDialog(connection)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Process
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleRejectConnection(connection.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No pending connections found</div>
        )}

        {/* Payment Processing Dialog */}
        {selectedConnection && (
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Process Connection Payment</DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Member:</div>
                  <div className="text-sm font-medium">{selectedConnection.memberName}</div>

                  <div className="text-sm text-muted-foreground">Coach:</div>
                  <div className="text-sm font-medium">{selectedConnection.coachName}</div>

                  <div className="text-sm text-muted-foreground">Request Date:</div>
                  <div className="text-sm font-medium">{selectedConnection.requestDate}</div>
                </div>

                <div className="border rounded-md p-3 bg-muted/50">
                  <p className="text-sm font-medium">Payment Information</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirm that payment has been processed for this coaching connection.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleApproveConnection(selectedConnection.id)}>Confirm Payment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}

export default CoachAssignments

