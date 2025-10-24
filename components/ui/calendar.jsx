"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-4 bg-white rounded-lg shadow-lg border", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center mb-4",
                caption_label: "text-lg font-semibold text-gray-900",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 p-0 rounded-md transition-colors"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex w-full mb-2",
                head_cell: "text-gray-500 font-medium text-sm w-10 h-8 flex items-center justify-center flex-shrink-0",
                row: "flex w-full mb-1",
                cell: "h-10 w-10 text-center text-sm p-0 relative rounded-md transition-colors hover:bg-gray-100 flex-shrink-0 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-50 [&:has([aria-selected])]:bg-blue-500 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 w-10 p-0 font-normal text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors aria-selected:opacity-100 flex-shrink-0"
                ),
                day_range_end: "day-range-end",
                day_selected:
                    "bg-blue-500 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-500 focus:text-white font-semibold",
                day_today: "bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200",
                day_outside:
                    "day-outside text-gray-400 opacity-50 aria-selected:bg-gray-100 aria-selected:text-gray-500 aria-selected:opacity-30",
                day_disabled: "text-gray-300 opacity-50 cursor-not-allowed",
                day_range_middle:
                    "aria-selected:bg-blue-100 aria-selected:text-blue-700",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4 text-gray-600" />,
                IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4 text-gray-600" />,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }