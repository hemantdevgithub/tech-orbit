import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from "./card.tsx";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardBody>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardSubtitle>This is a subtitle</CardSubtitle>
        </CardHeader>
        <p className="text-base text-forest-800">
          This is the card body content. Cards are used to group related information.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card interactive>
      <CardBody>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
        </CardHeader>
        <p className="text-base text-forest-800">
          Hover over me to see the shadow change.
        </p>
      </CardBody>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardBody>
        <CardHeader>
          <CardTitle>Card with Footer</CardTitle>
        </CardHeader>
        <p className="text-base text-forest-800">
          This card has a footer with actions.
        </p>
      </CardBody>
      <CardFooter className="border-t border-surface-border pt-4 mt-4">
        <button className="px-4 py-2 bg-forest-800 text-white rounded-lg text-sm">Save</button>
        <button className="px-4 py-2 text-forest-800 text-sm">Cancel</button>
      </CardFooter>
    </Card>
  ),
};