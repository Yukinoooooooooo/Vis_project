import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FactBadge } from "./FactBadge";

describe("FactBadge", () => {
  it("renders the user-facing derivation label", () => {
    render(<FactBadge factType="ruleDerived" />);
    expect(screen.getByText("规则推导")).toBeInTheDocument();
  });
});

