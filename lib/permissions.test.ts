import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  getPermissionsForRoles,
  getUserRoles,
} from "./permissions";

describe("getUserRoles", () => {
  it("gives every account guest as the baseline", () => {
    expect(getUserRoles({ is_host: false })).toEqual(["guest"]);
  });

  it("stacks host on top of guest, never replacing it", () => {
    expect(getUserRoles({ is_host: true })).toEqual(["guest", "host"]);
  });
});

describe("getPermissionsForRoles", () => {
  it("returns exactly the guest catalog for a guest", () => {
    expect(getPermissionsForRoles(["guest"])).toEqual(ROLE_PERMISSIONS.guest);
  });

  it("concatenates both catalogs for a guest+host, keeping shared keys twice", () => {
    expect(getPermissionsForRoles(["guest", "host"])).toEqual([
      ...ROLE_PERMISSIONS.guest,
      ...ROLE_PERMISSIONS.host,
    ]);
  });

  it("exposes host-only actions only once host is present", () => {
    const guestKeys = getPermissionsForRoles(["guest"]).map((p) => p.key);
    const hostKeys = getPermissionsForRoles(["guest", "host"]).map((p) => p.key);

    expect(guestKeys).not.toContain("bookings:manage");
    expect(guestKeys).not.toContain("listings:create");
    expect(hostKeys).toContain("bookings:manage");
    expect(hostKeys).toContain("listings:create");
  });
});
