import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../src/components/button.tsx";
import { Badge } from "../src/components/badge.tsx";

describe("Button", () => {
  it("should render with default props", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeDefined();
  });

  it("should apply primary variant classes", () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByText("Primary");
    expect(button.className).toContain("bg-forest-800");
  });
});

describe("Badge", () => {
  it("should render with variant", () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeDefined();
  });
});