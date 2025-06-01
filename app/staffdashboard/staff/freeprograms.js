"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search } from "lucide-react";

const FreePrograms = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [programs, setPrograms] = useState([
    { name: "Beginner Yoga", description: "A basic yoga program for beginners." },
    { name: "Strength Training", description: "A program focused on building strength." },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: "", description: "" });

  const handleAddProgram = () => {
    if (newProgram.name && newProgram.description) {
      setPrograms([...programs, newProgram]);
      setNewProgram({ name: "", description: "" });
      setModalOpen(false);
    }
  };

  const handleDeleteProgram = (index) => {
    setPrograms(programs.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Free Programs</CardTitle>
            <CardDescription>Manage and add free fitness programs</CardDescription>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add Program</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Add New Program</DialogTitle>
              </DialogHeader>
              <Input
                type="text"
                placeholder="Program Name"
                className="mt-2"
                value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
              />
              <Input
                type="text"
                placeholder="Description"
                className="mt-2"
                value={newProgram.description}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
              />
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAddProgram} disabled={!newProgram.name || !newProgram.description}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search program..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.filter((program) => program.name.toLowerCase().includes(searchQuery.toLowerCase())).map((program, index) => (
              <TableRow key={index}>
                <TableCell>{program.name}</TableCell>
                <TableCell>{program.description}</TableCell>
                <TableCell>
                  <Button variant="outline" onClick={() => handleDeleteProgram(index)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FreePrograms;