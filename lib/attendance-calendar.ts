export interface CalendarAttendanceRecord {
  attendanceStatus?: string | null;
  checkinDate: string;
}

type CalendarDay =
  | { type: 'empty'; key: string }
  | {
      type: 'day';
      key: string;
      dayNumber: number;
      className: string;
      tooltipText: string;
      dateKey: string;
      isSunday: boolean;
    };

const formatStatusLabel = (status: string): string => {
  switch (status) {
    case 'full day': return 'Full Day';
    // Preserve the existing weekday rule; Sunday paid offs are handled separately.
    case 'present': return 'Absent';
    case 'half day': return 'Half Day';
    case 'absent': return 'Absent';
    case 'paid':
    case 'paid leave': return 'Paid Leave';
    case 'activity': return 'Activity';
    default:
      return status.split(' ').filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
};

export function buildAttendanceCalendar(
  month: number,
  year: number,
  attendanceData: readonly CalendarAttendanceRecord[],
  currentDate: Date = new Date(),
) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  let fullDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  const daysArray: CalendarDay[] = [];

  for (let i = 0; i < firstDay; i++) {
    daysArray.push({ type: 'empty', key: `empty-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(year, month, day);
    const isSunday = date.getDay() === 0;
    const isFutureDate = date > today;
    const record = attendanceData.find(item => item.checkinDate.split('T')[0] === dateKey);
    const status = record?.attendanceStatus?.trim().toLowerCase();
    let className: string;
    let tooltipText: string;

    if (status) {
      className = isSunday ? 'sunday' : status.replace(/\s+/g, '-');
      tooltipText = formatStatusLabel(status);

      // Keep credited Sunday work, but never treat a paid weekly off as an absence.
      if (status === 'full day') fullDays++;
      else if (status === 'half day') halfDays++;
      else if (!isSunday && (status === 'absent' || status === 'present')) absentDays++;

      if (isSunday) {
        tooltipText = status === 'full day' || status === 'half day'
          ? `${formatStatusLabel(status)} · Sunday`
          : 'Paid weekly off (Sunday)';
      }
    } else if (isFutureDate) {
      className = 'future';
      tooltipText = 'Upcoming';
    } else if (isSunday) {
      className = 'sunday';
      tooltipText = 'Paid weekly off (Sunday)';
    } else {
      className = 'absent';
      tooltipText = 'Absent';
      absentDays++;
    }

    daysArray.push({ type: 'day', key: dateKey, dayNumber: day, className, tooltipText, dateKey, isSunday });
  }

  return { daysArray, summary: { fullDays, halfDays, absentDays } };
}
