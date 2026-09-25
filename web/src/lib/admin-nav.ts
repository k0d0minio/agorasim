/**
 * The admin operations map — **the** definition of it.
 *
 * This used to exist three times: `SECTIONS` on the dashboard, `NAV_GROUPS` in
 * the shell, and the `title` string every page hand-passed to `<AdminShell>`.
 * They happened to agree; nothing made them. Everything now derives from the
 * list below — the dashboard cards, the desktop sidebar, the mobile sheet, the
 * bottom toolbar and the page heading. Add an area here and all five follow.
 *
 * This is the repo's own ICM principle — *configure the factory, not the
 * product* — applied to its own UI.
 */
import type { ComponentType } from "react";
import {
  CalendarDays,
  CarFront,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  MessageSquareShare,
  Newspaper,
  ScrollText,
  Share2,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { AdminRole } from "@/db/schema";

/** Groups, in the order they appear in both navs. Named for jobs, not tables. */
export const ADMIN_NAV_GROUP_ORDER = [
  "Resumo",
  "Vendas",
  "Marketing",
  "Sistema",
  "Definições",
] as const;

export type AdminNavGroup = (typeof ADMIN_NAV_GROUP_ORDER)[number];

export type AdminNavItem = {
  href: string;
  /** Sidebar and sheet entry, and the page's `<h1>`. */
  label: string;
  /**
   * Dashboard card heading, where a longer, more descriptive name reads better
   * than the nav entry. Falls back to `label`.
   */
  cardTitle?: string;
  /**
   * Bottom-toolbar label, where horizontal space is tight. Falls back to `label`.
   *
   * The toolbar gives each of its five slots `(width - 32px) / 5`: 68.6px at
   * 375px and **57.6px at the 320px reflow floor** (spec D2/D3). A label wider
   * than that truncates, and N1 says these are always labelled. So a
   * `shortLabel` here is a width decision, not a translation: the sidebar, the
   * "Mais" sheet and the page `<h1>` all keep `label`. Measured in the rendered
   * toolbar at 12px/500 Geist, not estimated — Portuguese runs ~20% longer than
   * the English these slots were sized for, and the margin is small enough that
   * guessing is guessing.
   */
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  group: AdminNavGroup;
  /** Sentence shown on the dashboard card. */
  description: string;
  /** Design preview — the feature behind it is still in development. */
  dev: boolean;
  /**
   * Earns one of the fixed slots in the mobile bottom toolbar. Reserved for
   * the areas an operator reaches for daily — the toolbar once spent two of
   * its four slots on design previews while the screens with real data sat
   * behind "Mais", and this flag is what keeps that from happening again.
   */
  primary: boolean;
  /**
   * Minimum role needed to see this entry. Absent means every signed-in operator.
   *
   * This is presentation only — hiding a link is not access control. The page
   * behind an owner-only entry calls `requireAdmin("owner")` for itself, and so
   * does every action it can reach. Typing the URL gets you the forbidden
   * screen, not the page.
   */
  role?: AdminRole;
};

/** The dashboard itself, which is a nav destination but not one of its own cards. */
export const ADMIN_HOME_HREF = "/admin";

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: ADMIN_HOME_HREF,
    label: "Início",
    icon: LayoutDashboard,
    group: "Resumo",
    description: "Os números de hoje e a porta de entrada para todas as áreas.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/sales",
    label: "Vendas",
    cardTitle: "Pedidos e reservas",
    shortLabel: "Vendas",
    icon: Inbox,
    group: "Vendas",
    description:
      "Todos os pedidos e reservas num quadro — Novo → Contactado → Orçamentado → Reservado.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/calendar",
    label: "Calendário",
    cardTitle: "Disponibilidade",
    /*
     * "Calendário" measures 60.5px against a 57.6px slot at 320px — it was the
     * English "Calendar" that fitted. "Agenda" (42.9px) is what a Portuguese
     * speaker calls this screen anyway, and the area is still "Calendário"
     * everywhere it has the room.
     */
    shortLabel: "Agenda",
    icon: CalendarDays,
    group: "Vendas",
    description:
      "Que dias estão à venda, quantos lugares tem cada um e os dias que guarda para si.",
    dev: false,
    /*
     * Takes the toolbar slot the Blog studio was holding. The flag's whole
     * purpose (see its doc comment) is to keep design previews out of the four
     * slots while screens with real data sit behind "Mais" — and this is the
     * screen Diogo & Rita open every morning to say what the week looks like.
     */
    primary: true,
  },
  {
    href: "/admin/experiences",
    label: "Experiências",
    cardTitle: "O catálogo",
    shortLabel: "Catálogo",
    icon: CarFront,
    group: "Vendas",
    description:
      "As experiências e os extras que vende: nomes, descrições, durações e o que aparece no site.",
    dev: false,
    primary: false,
  },
  {
    href: "/admin/blog",
    label: "Blog",
    icon: Newspaper,
    group: "Marketing",
    description:
      "Artigos escritos no seu tom, à espera de uma leitura sua antes de irem para o site.",
    dev: false,
    /*
     * Gave its bottom-toolbar slot to the availability calendar, and keeps it
     * given now that it has real data behind it: publishing an article is a
     * once-a-fortnight act, and the calendar is opened every morning — which is
     * the trade the `primary` flag exists to keep making correctly.
     */
    primary: false,
  },
  {
    href: "/admin/social",
    label: "Redes sociais",
    icon: Share2,
    group: "Marketing",
    description:
      "Um calendário de publicações gerado para o Instagram e o Facebook — aprove e sai sozinho.",
    dev: true,
    primary: false,
  },
  {
    href: "/admin/notifications",
    label: "Mensagens automáticas",
    icon: MessageSquareShare,
    group: "Sistema",
    description:
      "Confirmações, lembretes e agradecimentos automáticos para os clientes — avisos imediatos para si.",
    dev: false,
    primary: false,
  },
  {
    href: "/admin/feature-requests",
    label: "Sugestões",
    /*
     * 59.7px against the same 57.6px slot. "Ideias" (33.3px) is the word this
     * area's own description already leads with — not a second name for
     * *sugestão*, just the shorter one the toolbar has room for.
     */
    shortLabel: "Ideias",
    icon: Lightbulb,
    group: "Sistema",
    description:
      "Onde escrever e organizar ideias e melhorias para o painel — uma lista livre para a equipa.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/settings/account",
    label: "A minha conta",
    cardTitle: "A minha conta",
    shortLabel: "Conta",
    icon: UserCog,
    group: "Definições",
    description: "Mude a sua palavra-passe e saia de todos os dispositivos de uma vez.",
    dev: false,
    primary: false,
  },
  {
    href: "/admin/settings/users",
    label: "Equipa",
    cardTitle: "Contas da equipa",
    shortLabel: "Equipa",
    icon: ShieldCheck,
    group: "Definições",
    description:
      "Quem pode entrar no painel, o que cada pessoa pode fazer e como desativar uma conta.",
    dev: false,
    primary: false,
    role: "owner",
  },
  {
    href: "/admin/settings/audit",
    label: "Registo de atividade",
    cardTitle: "Registo de atividade",
    shortLabel: "Registo",
    icon: ScrollText,
    group: "Definições",
    description: "Todas as alterações feitas no painel, quem as fez e quando.",
    dev: false,
    primary: false,
    role: "owner",
  },
];

/**
 * The nav entries `role` may see. Ordering and grouping are unchanged; entries
 * above the caller's role simply are not there.
 *
 * `null` — nobody signed in — sees nothing role-gated, which is what the login
 * screen and the boundary components render against.
 */
export function visibleAdminNav(role: AdminRole | null): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => {
    if (!item.role) return true;
    return role === "owner" || role === item.role;
  });
}

/** The nav grouped for the sidebar and the mobile sheet, in display order. */
export function adminNavGroups(
  role: AdminRole | null,
): { title: AdminNavGroup; items: AdminNavItem[] }[] {
  const visible = visibleAdminNav(role);
  return ADMIN_NAV_GROUP_ORDER.map((title) => ({
    title,
    items: visible.filter((item) => item.group === title),
  })).filter((group) => group.items.length > 0);
}

/**
 * The fixed slots in the mobile bottom toolbar. Derived from the `primary`
 * flag, so there is no separate href list to keep in step — and no `.find()!`
 * that would take the whole shell down at module evaluation over a typo.
 *
 * Nothing role-gated is `primary`, so this needs no role argument.
 */
export const ADMIN_PRIMARY_NAV: AdminNavItem[] = ADMIN_NAV.filter((item) => item.primary);

/** Every operations area that earns a dashboard card — everything but the dashboard. */
export function adminAreas(role: AdminRole | null): AdminNavItem[] {
  return visibleAdminNav(role).filter((item) => item.href !== ADMIN_HOME_HREF);
}

/** Whether `href` is the area the operator is currently in. */
export function isAdminNavItemActive(href: string, pathname: string): boolean {
  return href === ADMIN_HOME_HREF ? pathname === ADMIN_HOME_HREF : pathname.startsWith(href);
}

/** The nav entry a pathname belongs to — the most specific match wins. */
export function findAdminNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV.filter((item) => isAdminNavItemActive(item.href, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

/** Heading for the admin page at `pathname`. */
export function adminPageTitle(pathname: string): string {
  return findAdminNavItem(pathname)?.label ?? "Painel";
}

/**
 * Where the app bar's up-affordance goes from `pathname` — up, not home.
 *
 * The header arrow used to send every page to the dashboard, which from
 * `/admin/sales/[id]` threw away the board the operator was just triaging.
 * Up is the section the page belongs to (`/admin/sales/[id]` → `/admin/sales`),
 * and only a section root goes up to the dashboard. `null` at the dashboard
 * itself: there is no up from the top.
 */
export function adminUpHref(pathname: string): string | null {
  if (pathname === ADMIN_HOME_HREF) return null;
  const item = findAdminNavItem(pathname);
  if (item && item.href !== ADMIN_HOME_HREF && pathname !== item.href) return item.href;
  return ADMIN_HOME_HREF;
}
