import { describe, expect, it } from "vitest";
import { PRODUCT_BRANDING } from "@risk-map/shared";

describe("PRODUCT_BRANDING", () => {
  it("names the dashboard around hot events driving tech-sector linkage", () => {
    expect(PRODUCT_BRANDING.name).toBe("热点事件科技板联动看板");
    expect(PRODUCT_BRANDING.positioning).toContain("国际热点事件");
    expect(PRODUCT_BRANDING.positioning).toContain("科技板块");
  });
});
