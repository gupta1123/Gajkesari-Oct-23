import type { EmployeeUserDto, LiveLocationDto } from "./api";

export type EmployeeMapMarker = {
  id: number | string;
  name?: string;
  lat: number;
  lng: number;
  subtitle?: string;
  type?: "live" | "house" | "visit";
  tooltipLines?: string[];
  employeeId?: number;
  order?: number;
};

export type EmployeeJourneyPoint = {
  id: number;
  employeeId: number;
  employeeName?: string;
  storeName?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  coordinateSource?: string;
  visitDate?: string | null;
  checkinDate?: string | null;
  checkinTime?: string | null;
  checkoutDate?: string | null;
  checkoutTime?: string | null;
  purpose?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

export function employeeLocationAge(timestamp: number | null | undefined, now = Date.now()) {
  if (timestamp == null || !Number.isFinite(timestamp) || timestamp > now + 60_000) {
    return { label: "Update time unavailable", fresh: false };
  }
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  const age = minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago`
    : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`;
  return { label: `Updated ${age}`, fresh: minutes < 15 };
}

export function mapCoordinates(lat: unknown, lng: unknown): [number, number] | null {
  if (
    !["number", "string"].includes(typeof lat) ||
    !["number", "string"].includes(typeof lng) ||
    String(lat).trim() === "" ||
    String(lng).trim() === ""
  ) {
    return null;
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }

  return [latitude, longitude];
}

// Keep backend calendar dates local; converting date-only values through UTC
// can move an Indian business date to the previous day.
export function mapTimestamp(date?: string | null, time?: string | null): Date | null {
  if (!date) return null;
  const value = new Date(
    date.includes("T") ? date : `${date}T${time?.split(".")[0] || "00:00:00"}`,
  );
  return Number.isNaN(value.getTime()) ? null : value;
}

export function latestEmployeeLocations(
  locations: LiveLocationDto[],
  allowedIds?: Set<number>,
): LiveLocationDto[] {
  const latest = new Map<number, LiveLocationDto>();

  for (const location of locations) {
    const id = Number(location.empId);
    if (
      !Number.isFinite(id) ||
      (allowedIds && !allowedIds.has(id)) ||
      !mapCoordinates(location.latitude, location.longitude)
    ) {
      continue;
    }

    const previous = latest.get(id);
    const timestamp = mapTimestamp(location.updatedAt, location.updatedTime)?.getTime() ?? -Infinity;
    const previousTimestamp = previous
      ? mapTimestamp(previous.updatedAt, previous.updatedTime)?.getTime() ?? -Infinity
      : -Infinity;

    if (!previous || timestamp > previousTimestamp) latest.set(id, location);
  }

  return [...latest.values()];
}

export function journeyMapMarkers(
  employee: { id: number; name: string },
  detail: EmployeeUserDto | null,
  visits: EmployeeJourneyPoint[],
  start: string,
  end: string,
  formatTimestamp: (date?: string | null, time?: string | null) => string,
): EmployeeMapMarker[] {
  const result: EmployeeMapMarker[] = [];
  const home = detail && mapCoordinates(detail.houseLatitude, detail.houseLongitude);

  if (home && detail) {
    result.push({
      id: `house-${employee.id}`,
      employeeId: employee.id,
      name: `${employee.name}'s Home`,
      type: "house",
      lat: home[0],
      lng: home[1],
      subtitle: [detail.city, detail.state, detail.country].filter(Boolean).join(", "),
    });
  }

  const seen = new Set<number>();
  const validVisits = visits
    .filter((visit) => {
      const date = (visit.checkinDate || visit.visitDate || "").split("T")[0];
      if (
        Number(visit.employeeId) !== employee.id ||
        !date ||
        date < start ||
        date > end ||
        seen.has(visit.id) ||
        !mapCoordinates(visit.lat, visit.lng)
      ) {
        return false;
      }
      seen.add(visit.id);
      return true;
    })
    .sort(
      (a, b) =>
        (mapTimestamp(a.checkinDate || a.visitDate, a.checkinTime)?.getTime() ?? 0) -
        (mapTimestamp(b.checkinDate || b.visitDate, b.checkinTime)?.getTime() ?? 0),
    );

  validVisits.forEach((visit, index) => {
    const coordinates = mapCoordinates(visit.lat, visit.lng)!;
    result.push({
      id: `visit-${visit.id}`,
      employeeId: employee.id,
      name: visit.storeName || "Visit",
      type: "visit",
      lat: coordinates[0],
      lng: coordinates[1],
      order: index + 1,
      subtitle: visit.purpose || "Visit",
      tooltipLines: [
        `Employee: ${visit.employeeName || employee.name}`,
        `Check-in: ${formatTimestamp(visit.checkinDate || visit.visitDate, visit.checkinTime)}`,
        `Check-out: ${visit.checkoutDate ? formatTimestamp(visit.checkoutDate, visit.checkoutTime) : "Not recorded"}`,
        ...(visit.coordinateSource ? [`Location source: ${visit.coordinateSource}`] : []),
        ...([visit.city, visit.state, visit.country].some(Boolean)
          ? [`Address: ${[visit.city, visit.state, visit.country].filter(Boolean).join(", ")}`]
          : []),
      ],
    });
  });

  return result;
}

// Nearby pins share one popup instead of obscuring each other or moving the
// underlying coordinates.
export function groupMapMarkers<T extends { x: number; y: number }>(
  points: T[],
  distance = 44,
): T[][] {
  const groups: T[][] = [];
  for (const point of points) {
    const merged = [point];
    for (let index = groups.length - 1; index >= 0; index -= 1) {
      if (groups[index].some((item) => Math.hypot(item.x - point.x, item.y - point.y) < distance)) {
        merged.unshift(...groups.splice(index, 1)[0]);
      }
    }
    groups.push(merged);
  }
  return groups;
}
