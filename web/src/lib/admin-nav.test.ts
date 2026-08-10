import { describe, expect, it } from "vitest";
import { adminPageTitle, adminUpHref, findAdminNavItem } from "./admin-nav";

describe("adminUpHref", () => {
  it("has no up from the dashboard itself", () => {
    expect(adminUpHref("/admin")).toBeNull();
  });

  it("goes to the section from a record inside it, not to the dashboard", () => {
    expect(adminUpHref("/admin/sales/0b96070b-0000-0000-0000-000000000000")).toBe(
      "/admin/sales",
    );
    expect(adminUpHref("/admin/experiences/new")).toBe("/admin/experiences");
    expect(
      adminUpHref("/admin/experiences/0b96070b-0000-0000-0000-000000000000"),
    ).toBe("/admin/experiences");
  });

  it("goes to the dashboard from a section root", () => {
    expect(adminUpHref("/admin/sales")).toBe("/admin");
    expect(adminUpHref("/admin/settings/users")).toBe("/admin");
    expect(adminUpHref("/admin/settings/audit")).toBe("/admin");
  });

  it("still offers a way out on a route the nav map doesn't know", () => {
    expect(adminUpHref("/admin/does-not-exist")).toBe("/admin");
  });
});

describe("findAdminNavItem", () => {
  it("prefers the most specific match for nested settings routes", () => {
    // /admin/settings/users and /admin/settings/audit are siblings; each page
    // must resolve to its own entry, not whichever sorts first.
    expect(findAdminNavItem("/admin/settings/audit")?.href).toBe("/admin/settings/audit");
    expect(adminPageTitle("/admin/settings/audit")).toBe("Audit log");
  });
});
