"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search } from "lucide-react";

const MonitorSubscriptions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [subscriptions, setSubscriptions] = useState([
    { name: "John Doe", expiration: "2025-03-15", status: "Active" },
    { name: "Jane Smith", expiration: "2025-03-10", status: "Expiring Soon" },
    { name: "Mike Johnson", expiration: "2025-02-25", status: "Expired" },
  ]);
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  
  const handleRenewSubscription = () => {
    if (selectedMember && selectedPlan) {
      setSubscriptions((prev) => prev.map(sub => 
        sub.name === selectedMember.name ? { ...sub, status: "Active", expiration: "2026-03-15" } : sub
      ));
      setRenewOpen(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter === "all") return true;
    return sub.status.toLowerCase() === filter;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monitor Subscriptions</CardTitle>
            <CardDescription>Track and manage gym member subscriptions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search member..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring soon">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Expiration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.map((sub, index) => (
              <TableRow key={index}>
                <TableCell>{sub.name}</TableCell>
                <TableCell>{sub.expiration}</TableCell>
                <TableCell className={
                  sub.status === "Active" ? "text-green-500" :
                  sub.status === "Expiring Soon" ? "text-yellow-500" : "text-red-500"
                }>
                  {sub.status}
                </TableCell>
                <TableCell>
                  <Dialog open={renewOpen && selectedMember?.name === sub.name} onOpenChange={setRenewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={sub.status === "Active"} onClick={() => setSelectedMember(sub)}>Renew</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px]">
                      <DialogHeader>
                        <DialogTitle>Renew Subscription</DialogTitle>
                      </DialogHeader>
                      <p>Renew subscription for {selectedMember?.name}?</p>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly - $30</SelectItem>
                          <SelectItem value="quarterly">Quarterly - $80</SelectItem>
                          <SelectItem value="yearly">Yearly - $300</SelectItem>
                        </SelectContent>
                      </Select>
                      <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
                        <Button onClick={handleRenewSubscription} disabled={!selectedPlan}>Confirm</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MonitorSubscriptions;