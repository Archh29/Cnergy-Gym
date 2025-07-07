"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Search, Plus, QrCode } from 'lucide-react'

const AttendanceTracking = () => {
  const [open, setOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [attendance, setAttendance] = useState([])
  const [manualName, setManualName] = useState("")

  const handleManualEntry = () => {
    if (manualName.trim() === "") return;
    const today = new Date().toLocaleDateString()
    setAttendance((prev) => [...prev, { name: manualName, date: today }])
    setManualName("")
    setManualOpen(false)
  }

  const handleQrScan = async (scannedData) => {
    const today = new Date().toLocaleDateString()
    const member = { id: scannedData.id, name: scannedData.name, date: today }

    // Add to UI
    setAttendance((prev) => [...prev, member])

    // Send to backend
    try {
      await fetch("http://localhost/cynergy/attendance.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(member)
      })
    } catch (err) {
      console.error("Failed to record attendance", err)
    }
  }

  // Real QR scanner input listener
  useEffect(() => {
    let scannedData = ""

    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        try {
          const parsed = JSON.parse(scannedData)
          handleQrScan(parsed)
        } catch {
          const [id, name] = scannedData.split("|")
          if (id && name) {
            handleQrScan({ id, name })
          }
        }
        scannedData = ""
      } else {
        scannedData += e.key
      }
    }

    window.addEventListener("keypress", handleKeyPress)
    return () => window.removeEventListener("keypress", handleKeyPress)
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Attendance Tracking</CardTitle>
            <CardDescription>Record gym attendance manually or via QR code</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Scan QR Code</DialogTitle>
                </DialogHeader>
                <p>QR Scanner functionality will be implemented here.</p>
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Manual Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Manual Attendance Entry</DialogTitle>
                </DialogHeader>
                <Input
                  type="text"
                  placeholder="Enter member name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
                  <Button onClick={handleManualEntry}>Submit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
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
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{entry.name}</TableCell>
                <TableCell>{entry.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default AttendanceTracking
