import type {
  User as DbUser,
  Contact as DbContact,
  Incident as DbIncident,
  LocationRow,
  MediaRow,
  Alert as DbAlert,
} from "@workspace/db";

export function toApiUser(u: DbUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toApiContact(c: DbContact) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    relation: c.relation,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toApiIncident(i: DbIncident) {
  return {
    id: i.id,
    status: i.status,
    trigger: i.trigger,
    startLat: i.startLat,
    startLng: i.startLng,
    alertsSent: i.alertsSent,
    escalated: i.escalated,
    discreet: i.discreet,
    message: i.message ?? null,
    resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
  };
}

export function toApiLocation(l: LocationRow) {
  return {
    id: l.id,
    incidentId: l.incidentId,
    lat: l.lat,
    lng: l.lng,
    accuracy: l.accuracy ?? null,
    speed: l.speed ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

export function toApiMedia(m: MediaRow) {
  return {
    id: m.id,
    incidentId: m.incidentId,
    kind: m.kind,
    sizeBytes: m.sizeBytes,
    durationMs: m.durationMs ?? null,
    mimeType: m.mimeType ?? null,
    url: null,
    createdAt: m.createdAt.toISOString(),
  };
}

export function toApiAlert(a: DbAlert) {
  return {
    id: a.id,
    incidentId: a.incidentId,
    channel: a.channel,
    target: a.target,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  };
}
