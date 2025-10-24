"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarStatus = 'full day' | 'half day' | 'absent' | 'paid' | 'activity';

interface AttendanceData {
  employeeId: number;
  attendanceStatus: CalendarStatus;
  checkinDate: string;
  checkoutDate: string | null;
}

interface CustomCalendarProps {
  month: number;
  year: number;
  attendanceData: AttendanceData[];
  onSummaryChange: (summary: { fullDays: number; halfDays: number; absentDays: number }) => void;
  onDateClick: (date: string, employeeName: string) => void;
  employeeName: string;
}

const formatStatusLabel = (status: string): string => {
  switch (status) {
    case 'full day':
      return 'Full Day';
    case 'present':
      return 'Present';
    case 'half day':
      return 'Half Day';
    case 'absent':
      return 'Absent';
    case 'paid':
      return 'Paid Leave';
    case 'activity':
      return 'Activity';
    default:
      return status
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
};

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  month,
  year,
  attendanceData,
  onSummaryChange,
  onDateClick,
  employeeName,
}) => {
  const datesRef = useRef<HTMLDivElement>(null);
  const onSummaryChangeRef = useRef(onSummaryChange);

  // Update the ref whenever the callback changes
  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange;
  }, [onSummaryChange]);

  useEffect(() => {
    const renderCalendar = () => {
      if (datesRef.current) {
        datesRef.current.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let fullDays = 0;
        let halfDays = 0;
        let absentDays = 0;

        // Helper function to normalize date format (matches reference logic)
        const normalizeDate = (dateStr: string) => {
          return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        };

        // Render empty slots for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
          const emptyDiv = document.createElement('div');
          emptyDiv.classList.add('empty');
          datesRef.current.appendChild(emptyDiv);
        }

        // Render each day of the month
        for (let i = 1; i <= daysInMonth; i++) {
          const dateDiv = document.createElement('div');
          dateDiv.textContent = i.toString();

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const date = new Date(year, month, i);
          const isSunday = date.getDay() === 0;

          // Find an attendance record (if any) for this date
          const attendanceRecord = attendanceData.find((data) => {
            const checkinDatePart = normalizeDate(data.checkinDate);
            const matches = checkinDatePart === dateKey;
            if (matches) {
              console.log(`Found attendance record for ${dateKey}:`, data);
            }
            return matches;
          });
          
          const attendanceStatus = attendanceRecord?.attendanceStatus;

          const tooltip = document.createElement('span');
          tooltip.classList.add('calendar-tooltip');

          // Check if it's Sunday first (like reference code)
          if (isSunday) {
            dateDiv.classList.add('paid');
            tooltip.textContent = formatStatusLabel('paid');
            tooltip.style.setProperty('--tooltip-translate-x', '-20%');
            tooltip.style.setProperty('--tooltip-arrow-left', '35%');
            // Keep Sunday tally in the full-day summary so card totals remain consistent.
            fullDays++;
          }
          // If there's an attendance record, use it (but don't double-count Sundays)
          else if (attendanceStatus) {
            const normalizedStatus = attendanceStatus.toLowerCase().trim();
            const statusClass = normalizedStatus.replace(/\s+/g, '-');
            dateDiv.classList.add(statusClass);
            tooltip.textContent = formatStatusLabel(normalizedStatus);

            if (normalizedStatus === 'full day' || normalizedStatus === 'present') {
              fullDays++;
            } else if (normalizedStatus === 'half day') {
              halfDays++;
            } else if (normalizedStatus === 'absent') {
              absentDays++;
            }
          }
          // If no attendance record and it's not Sunday, count as absent
          else {
            dateDiv.classList.add('absent');
            tooltip.textContent = formatStatusLabel('absent');
            absentDays++;
          }

          dateDiv.appendChild(tooltip);

          // Handle date click
          dateDiv.addEventListener('click', () => {
            onDateClick(dateKey, employeeName);
          });

          datesRef.current.appendChild(dateDiv);
        }

        // Update the summary in the parent (matches reference approach)
        const summary = { fullDays, halfDays, absentDays };
        onSummaryChangeRef.current(summary);
      }
    };

    renderCalendar();
  }, [month, year, attendanceData, employeeName, onDateClick]);

  return (
    <div className="custom-calendar">
      <div className="calendar-days">
        <div>S</div>
        <div>M</div>
        <div>T</div>
        <div>W</div>
        <div>T</div>
        <div>F</div>
        <div>S</div>
      </div>
      <div className="calendar-dates" ref={datesRef}></div>
    </div>
  );
};

export default CustomCalendar;
