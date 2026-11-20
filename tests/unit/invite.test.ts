import { describe, expect, it } from "vitest";
import { advisorMetadata, teamMetadata } from "@/lib/hub/invite";

describe("advisorMetadata", () => {
  it("skips the finish-your-profile step when name and agency are known", () => {
    const { complete, data } = advisorMetadata({ firstName: " María ", lastName: "López", company: "Sun Travel" });
    expect(complete).toBe(true);
    expect(data).toEqual({ first_name: "María", last_name: "López", full_name: "María López", company: "Sun Travel", is_independent: false, hub_signup: true });
  });

  it("treats Zoho's Independent company as the solo-agent answer", () => {
    const { complete, data } = advisorMetadata({ firstName: "Ana", lastName: "Ruiz", company: "independent" });
    expect(complete).toBe(true);
    expect(data.company).toBeNull();
    expect(data.is_independent).toBe(true);
  });

  it("leaves the profile step for anything missing", () => {
    expect(advisorMetadata({ firstName: "Ana", lastName: "", company: "Sun Travel" }).complete).toBe(false);
    expect(advisorMetadata({ firstName: "Ana", lastName: "Ruiz" }).complete).toBe(false);
    const { data } = advisorMetadata({});
    expect(data).toEqual({ company: null, is_independent: false });
  });
});

describe("teamMetadata", () => {
  it("marks a team invitation with its role and who sent it, and clears the advisor wording", () => {
    expect(teamMetadata({ firstName: " Ana ", lastName: "Mora" }, "content_manager", "Marta Rojas")).toEqual({
      first_name: "Ana",
      last_name: "Mora",
      full_name: "Ana Mora",
      company: "TravelXM",
      is_independent: false,
      hub_signup: true,
      team_invite: true,
      staff_invite: null,
      team_role_label: "Content manager",
      invited_by: "Marta Rojas",
    });
  });

  it("leaves the sender out when the admin has no name", () => {
    expect(teamMetadata({ firstName: "Ana", lastName: "Mora" }, "admin", "  ")).toMatchObject({ team_role_label: "Admin", invited_by: null });
  });
});
