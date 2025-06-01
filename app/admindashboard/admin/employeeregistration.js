import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

const EmployeeRegistration = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Registration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Input placeholder="Last name" />
          <Input placeholder="First name" />
          <Input placeholder="Middle name" />
        </div>
        <Input placeholder="Current Address" />
        <Input placeholder="Permanent Address" />
        <div className="grid grid-cols-2 gap-4">
          <Input type="email" placeholder="Email Address" />
          <Input placeholder="Phone Number" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Input placeholder="Month" />
          <Input placeholder="Day" />
          <Input placeholder="Year" />
          <RadioGroup defaultValue="male">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female">Female</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="Civil Status" />
          <Input placeholder="Citizenship" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="Person to be contacted in case of emergency" />
          <Input placeholder="Phone Number" />
        </div>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="coach">Coach</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <Button className="w-full">SUBMIT</Button>
      </CardContent>
    </Card>
  )
}

export default EmployeeRegistration

