import type { VariantProps } from "class-variance-authority";
import type {
  AdminRole,
  EnquiryKind,
  ExperienceKind,
  FeatureRequestPriority,
  FeatureRequestStatus,
  RequestStatus,
} from "@/db/schema";
import type { AuditAction } from "@/lib/audit";
import type { badgeVariants } from "@/components/ui/badge";

/**
 * The password rule, as shown under a password field. Re-exported here so the
 * client forms have one admin-facing module to import their copy from, and so
 * they never reach into `password.ts`, which is `server-only`.
 */
export { MIN_PASSWORD_LENGTH_HINT } from "@/lib/password-policy";

/**
 * The word an operator types to confirm an irreversible erasure.
 *
 * Lives here rather than in `form-schemas.ts` because both sides need it — the
 * dialog to render the instruction and arm its button, the schema to validate
 * the submission — and `form-schemas.ts` is `server-only`.
 */
export const DELETE_CONFIRMATION = "DELETE";

/**
 * Badge variant, taken straight from `ui/badge.tsx`. The hand-written mirror
 * this replaces had already fallen behind — it never gained `ghost` or `link`,
 * both of which the admin uses. Type-only import, so nothing is bundled.
 */
type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/**
 * The lead lifecycle: the status badge on a row, and the columns of the Sales
 * board. One vocabulary for both — the board used to invent its own stage names
 * ("Lead") next to a table that said "New" for the same record.
 */
export const requestStatusMeta: Record<
  RequestStatus,
  { label: string; variant: BadgeVariant; hint: string }
> = {
  new: {
    label: "Novo",
    variant: "default",
    hint: "Sem resposta — ainda ninguém respondeu",
  },
  contacted: {
    label: "Contactado",
    variant: "secondary",
    hint: "À espera da resposta do cliente",
  },
  quoted: { label: "Orçamentado", variant: "secondary", hint: "Orçamento enviado" },
  booked: { label: "Reservado", variant: "outline", hint: "Confirmado" },
  archived: {
    label: "Arquivado",
    variant: "outline",
    hint: "Fechado, ou deixou de responder",
  },
};

/**
 * Statuses in picker order. Read off the meta record rather than written out
 * again: `Record<RequestStatus, …>` already forces every status to appear
 * exactly once, so the list cannot fall behind the database enum.
 */
export const REQUEST_STATUSES = Object.keys(requestStatusMeta) as RequestStatus[];

export const featureRequestStatusMeta: Record<
  FeatureRequestStatus,
  { label: string; variant: BadgeVariant }
> = {
  new: { label: "Nova", variant: "default" },
  planned: { label: "Planeada", variant: "secondary" },
  in_progress: { label: "Em curso", variant: "secondary" },
  completed: { label: "Concluída", variant: "outline" },
  declined: { label: "Recusada", variant: "outline" },
};

export const FEATURE_REQUEST_STATUSES = Object.keys(
  featureRequestStatusMeta,
) as FeatureRequestStatus[];

export const featureRequestPriorityMeta: Record<
  FeatureRequestPriority,
  { label: string; variant: BadgeVariant }
> = {
  low: { label: "Baixa", variant: "outline" },
  medium: { label: "Média", variant: "secondary" },
  high: { label: "Alta", variant: "secondary" },
  urgent: { label: "Urgente", variant: "destructive" },
};

export const FEATURE_REQUEST_PRIORITIES = Object.keys(
  featureRequestPriorityMeta,
) as FeatureRequestPriority[];

export const adminRoleMeta: Record<
  AdminRole,
  { label: string; variant: BadgeVariant; description: string }
> = {
  owner: {
    label: "Responsável",
    variant: "default",
    description:
      "Acesso total, incluindo as contas da equipa, o registo de atividade e exportar ou eliminar dados de clientes.",
  },
  collaborator: {
    label: "Colaborador",
    variant: "secondary",
    description:
      "Tudo o que é operação. Sem contas da equipa e sem exportar ou eliminar dados de clientes.",
  },
};

/** Roles in picker order — read off the meta record, so it cannot fall behind. */
export const ADMIN_ROLES = Object.keys(adminRoleMeta) as AdminRole[];

/**
 * Plain-language labels for audit actions, read as "{who} {label}, {when}".
 *
 * `Record<AuditAction, …>` on purpose: adding an action to `AUDIT_ACTIONS`
 * without giving it a label stops the build, rather than shipping an audit view
 * that renders a raw `tour_request.bulk_deleted` at an operator.
 */
export const auditActionLabels: Record<AuditAction, string> = {
  "admin_user.signed_in": "entrou",
  "admin_user.signed_out": "saiu",
  "admin_user.sessions_revoked": "saiu de todos os dispositivos",
  "admin_user.created": "criou uma conta",
  "admin_user.disabled": "desativou uma conta",
  "admin_user.enabled": "reativou uma conta",
  "admin_user.password_changed": "mudou a palavra-passe",
  "tour_request.status_changed": "mudou o estado de um pedido",
  "tour_request.updated": "editou os dados de um pedido",
  "tour_request.contact_logged": "registou um contacto",
  "tour_request.deleted": "eliminou um pedido",
  "tour_request.exported": "exportou os dados de um cliente",
  "tour_request.anonymised_by_retention": "anonimizou pedidos expirados",
  "feature_request.created": "escreveu uma sugestão",
  "feature_request.status_changed": "mudou o estado de uma sugestão",
  "experience.created": "adicionou uma experiência",
  "experience.updated": "editou uma experiência",
  "experience.image_uploaded": "enviou a fotografia de uma experiência",
  "experience.archived": "arquivou uma experiência",
  "experience.restored": "restaurou uma experiência",
  "experience.reordered": "reordenou o catálogo",
  "experience.deleted": "eliminou uma experiência",
  "availability.opened": "pôs dias à venda",
  "availability.closed": "fechou dias",
  "availability.cleared": "limpou dias do calendário",
  "booking.confirmed": "uma reserva foi paga e confirmada",
  "booking.expired": "uma reserva não foi paga a tempo",
};

/**
 * The three kinds of job a lead can be about, as the admin words them. Mirrors
 * `enquiryKindEnum`; the icons live in `lib/experience-icons.ts`.
 */
export const enquiryKindMeta: Record<EnquiryKind, { label: string }> = {
  tour: { label: "Passeio" },
  wedding: { label: "Casamento" },
  event: { label: "Evento" },
};

export const ENQUIRY_KINDS = Object.keys(enquiryKindMeta) as EnquiryKind[];

/** Catalogue entry kinds, as the editor words them. */
export const experienceKindMeta: Record<
  ExperienceKind,
  { label: string; hint: string; variant: BadgeVariant }
> = {
  signature: {
    label: "Principal",
    hint: "O passeio principal, em destaque na página inicial e na página de experiências.",
    variant: "default",
  },
  complement: {
    label: "Extra",
    hint: "Um extra que o cliente pode juntar à experiência principal.",
    variant: "secondary",
  },
};

export const EXPERIENCE_KINDS = Object.keys(experienceKindMeta) as ExperienceKind[];

/**
 * Labels for actions nothing writes any more, still present in old rows. The
 * bulk actions went with the Sales table's row checkboxes; the log is
 * append-only, so their entries are history that must keep rendering.
 */
const retiredAuditActionLabels: Record<string, string> = {
  "tour_request.bulk_status_changed": "mudou o estado de vários pedidos",
  "tour_request.bulk_deleted": "eliminou vários pedidos",
};

/** Label for an action string read back from the database. */
export function auditActionLabel(action: string): string {
  return (
    auditActionLabels[action as AuditAction] ?? retiredAuditActionLabels[action] ?? action
  );
}

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a timestamp/date for compact display in admin tables. */
export function formatDate(value: Date | string | null): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

/** Full date *and* time — used as the title/secondary line next to an age. */
export function formatDateTime(value: Date | string | null): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * How long ago something happened, in the largest unit that still reads
 * naturally: "agora mesmo", "há 12 min", "há 3 h", "há 2 d", "há 5 sem.",
 * "há 3 meses".
 *
 * Triage is the job on Submissions and Feature requests, and for triage the age
 * of a lead matters far more than its calendar date — so this is the primary
 * line, with `formatDateTime` as the exact value behind it.
 */
export function formatRelativeTime(
  value: Date | string | null,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return "—";

  const diff = now.getTime() - date.getTime();
  // Clock skew, or a date in the future: don't claim it happened in the past.
  if (diff < 0) return "agora mesmo";
  if (diff < MINUTE) return "agora mesmo";
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  if (diff < WEEK) return `há ${Math.floor(diff / DAY)} d`;
  if (diff < MONTH) return `há ${Math.floor(diff / WEEK)} sem.`;
  // Months and years are spelled out, so they take a singular: "há 1 mês".
  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH);
    return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  }
  const years = Math.floor(diff / YEAR);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}
