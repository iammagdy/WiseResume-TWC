import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Trash2 } from "lucide-react";

const meta: Meta = {
  title: "Components/Modals & Overlays",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

export const DialogDemo: Story = {
  render: () => (
    <div className="bg-background p-6 rounded-xl space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dialog</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Edit Profile</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your public profile. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" defaultValue="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" defaultValue="Senior Software Engineer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
};

export const AlertDialogDemo: Story = {
  render: () => (
    <div className="bg-background p-6 rounded-xl space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alert Dialog</p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="w-4 h-4" />
            Delete Resume
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "Senior Engineer Resume 2026". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
};

export const TooltipDemo: Story = {
  render: () => (
    <TooltipProvider>
      <div className="space-y-4 p-6 bg-background rounded-xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tooltip</p>
        <div className="flex flex-wrap gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>More information</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Tooltip on bottom</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary">Right side</Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Tooltip on right</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  ),
};

export const PopoverDemo: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background rounded-xl">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popover</p>
      <div className="flex gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm text-foreground">Resume settings</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Configure your resume preferences.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default font</Label>
                <Input className="h-8 text-sm" defaultValue="Inter" />
              </div>
              <Button size="sm" className="w-full">Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  ),
};
