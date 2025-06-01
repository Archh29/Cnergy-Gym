"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search } from "lucide-react";

const Exercises = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState([
    { id: 1, name: "Push Up", category: "Strength" },
    { id: 2, name: "Squat", category: "Strength" },
    { id: 3, name: "Running", category: "Cardio" },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState("");

  const handleSaveExercise = () => {
    if (selectedExercise) {
      setExercises((prev) => prev.map(ex => 
        ex.id === selectedExercise.id ? { ...ex, name: exerciseName, category: exerciseCategory } : ex
      ));
    } else {
      setExercises([...exercises, { id: Date.now(), name: exerciseName, category: exerciseCategory }]);
    }
    setDialogOpen(false);
    setSelectedExercise(null);
    setExerciseName("");
    setExerciseCategory("");
  };

  const handleDeleteExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Exercises</CardTitle>
        <CardDescription>Add, edit, or remove exercises</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search exercise..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => { setDialogOpen(true); setSelectedExercise(null); }}>Add Exercise</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercises.map((exercise) => (
              <TableRow key={exercise.id}>
                <TableCell>{exercise.name}</TableCell>
                <TableCell>{exercise.category}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setSelectedExercise(exercise);
                    setExerciseName(exercise.name);
                    setExerciseCategory(exercise.category);
                    setDialogOpen(true);
                  }}>Edit</Button>
                  <Button variant="destructive" onClick={() => handleDeleteExercise(exercise.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedExercise ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Exercise Name"
              className="mt-2"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
            />
            <Input
              placeholder="Category"
              className="mt-2"
              value={exerciseCategory}
              onChange={(e) => setExerciseCategory(e.target.value)}
            />
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveExercise} disabled={!exerciseName || !exerciseCategory}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default Exercises;