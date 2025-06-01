"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search } from "lucide-react";

const CoachAssignments = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([
    { name: "John Doe", coach: "None" },
    { name: "Jane Smith", coach: "None" },
    { name: "Mike Johnson", coach: "None" },
  ]);
  const [assignCoachOpen, setAssignCoachOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState("");

  const handleAssignCoach = () => {
    if (selectedMember && selectedCoach) {
      setMembers((prev) => prev.map(member => 
        member.name === selectedMember.name ? { ...member, coach: selectedCoach } : member
      ));
      setAssignCoachOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coach Assignment</CardTitle>
        <CardDescription>Assign members to coaches</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, index) => (
              <TableRow key={index}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.coach}</TableCell>
                <TableCell>
                  <Dialog open={assignCoachOpen && selectedMember?.name === member.name} onOpenChange={setAssignCoachOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => setSelectedMember(member)}>Assign Coach</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px]">
                      <DialogHeader>
                        <DialogTitle>Assign Coach</DialogTitle>
                      </DialogHeader>
                      <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="Select a coach" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Coach A">Coach A</SelectItem>
                          <SelectItem value="Coach B">Coach B</SelectItem>
                          <SelectItem value="Coach C">Coach C</SelectItem>
                        </SelectContent>
                      </Select>
                      <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setAssignCoachOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssignCoach} disabled={!selectedCoach}>Assign</Button>
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

export default CoachAssignments;
