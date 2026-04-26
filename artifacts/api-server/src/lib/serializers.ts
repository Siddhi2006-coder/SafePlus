import type {
  User as DbUser,
  Contact as DbContact,
  Incident as DbIncident,
  LocationRow,
  MediaRow,
  Alert as DbAlert,
  Responder as DbResponder,
} from "@workspace/db";

export function toApiUser(u: DbUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    responderStatus: u.responderStatus ?? "available",
    helperAlias: u.helperAlias ?? null,
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
    riskScore: i.riskScore ?? 15,
    riskLevel: i.riskLevel ?? "medium",
    motionMaxSpeed: i.motionMaxSpeed ?? null,
    triggerCount24h: i.triggerCount24h ?? 1,
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
    encrypted: l.encrypted ?? true,
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
    encrypted: m.encrypted ?? true,
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
    attempts: a.attempts ?? 1,
    priority: a.priority ?? "circle",
    lastError: a.lastError ?? null,
    deliveredAt: a.deliveredAt ? a.deliveredAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
  };
}

export function toApiResponder(r: DbResponder) {
  return {
    id: r.id,
    incidentId: r.incidentId,
    alias: r.alias,
    status: r.status,
    distanceKm: r.distanceKm,
    etaMinutes: r.etaMinutes ?? null,
    createdAt: r.createdAt.toISOString(),
    respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
  };
}
