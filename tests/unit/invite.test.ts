import { describe, expect, it } from "vitest";
import { advisorMetadata } from "@/lib/hub/invite";

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
