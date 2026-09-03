"use client";

import React, { useEffect, useMemo } from 'react';
import { buildAttendanceCalendar } from '@/lib/attendance-calendar';
import "./custom-calendar.css";

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

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  month,
  year,
  attendanceData,
  onSummaryChange,
  onDateClick,
  employeeName,
}) => {

  const calendarData = useMemo(
    () => buildAttendanceCalendar(month, year, attendanceData),
    [month, year, attendanceData],
  );

  // Sync summary to parent whenever the calculated summary changes
  useEffect(() => {
    onSummaryChange(calendarData.summary);
  }, [calendarData.summary, onSummaryChange]);

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
      <div className="calendar-dates">
        {calendarData.daysArray.map((item) => {
          if (item.type === 'empty') {
            return <div key={item.key} className="empty" />;
          }
          return (
            <div
              key={item.key}
              className={item.className}
              onClick={() => onDateClick(item.dateKey!, employeeName)}
            >
              {item.dayNumber}
              {/* Tooltip inline to ensure it syncs with React state */}
              <span
                className="calendar-tooltip"
                style={item.isSunday ? {
                  '--tooltip-translate-x': '-20%',
                  '--tooltip-arrow-left': '35%'
                } as React.CSSProperties : undefined}
              >
                {item.tooltipText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomCalendar;
