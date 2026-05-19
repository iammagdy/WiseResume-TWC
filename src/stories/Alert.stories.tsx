import type { Meta, StoryObj } from "@storybook/react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";

const meta: Meta<typeof Alert> = {
  title: "Components/Alert",
  component: Alert,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <div className="w-96 bg-background p-4 rounded-xl space-y-4">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>
          Your resume has been saved successfully and is ready to share.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const Destructive: Story = {
  render: () => (
    <div className="w-96 bg-background p-4 rounded-xl space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to save your resume. Please check your connection and try again.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="w-96 bg-background p-4 rounded-xl space-y-4">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>Your trial expires in 3 days.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong. Please try again.</AlertDescription>
      </Alert>
    </div>
  ),
};
