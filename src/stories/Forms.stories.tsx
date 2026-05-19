import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

const meta: Meta = {
  title: "Components/Forms",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

export const CheckboxDemo: Story = {
  render: () => {
    const [checked, setChecked] = useState<boolean | "indeterminate">(false);
    return (
      <div className="space-y-4 p-6 bg-background rounded-xl w-72">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checkbox</p>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="c1" checked={checked} onCheckedChange={setChecked} />
            <Label htmlFor="c1">Include cover letter</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c2" defaultChecked />
            <Label htmlFor="c2">Open to remote work</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c3" disabled />
            <Label htmlFor="c3" className="text-muted-foreground">Disabled</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="c4" disabled defaultChecked />
            <Label htmlFor="c4" className="text-muted-foreground">Disabled checked</Label>
          </div>
        </div>
      </div>
    );
  },
};

export const SwitchDemo: Story = {
  render: () => {
    const [values, setValues] = useState({ notifications: true, darkMode: false, analytics: true });
    return (
      <div className="space-y-4 p-6 bg-background rounded-xl w-72">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Switch</p>
        <div className="space-y-4">
          {(Object.entries(values) as [keyof typeof values, boolean][]).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
              <Switch
                id={key}
                checked={val}
                onCheckedChange={v => setValues(prev => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
          <div className="flex items-center justify-between opacity-50">
            <Label>Disabled off</Label>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between opacity-50">
            <Label>Disabled on</Label>
            <Switch disabled checked />
          </div>
        </div>
      </div>
    );
  },
};

export const RadioGroupDemo: Story = {
  render: () => {
    const [val, setVal] = useState("weekly");
    return (
      <div className="space-y-4 p-6 bg-background rounded-xl w-72">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Radio Group</p>
        <RadioGroup value={val} onValueChange={setVal} className="space-y-2">
          {[
            { value: "daily", label: "Daily digest" },
            { value: "weekly", label: "Weekly summary" },
            { value: "never", label: "Never" },
          ].map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={value} />
              <Label htmlFor={value}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">Selected: <strong>{val}</strong></p>
      </div>
    );
  },
};

export const SelectDemo: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background rounded-xl w-72">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Job type</Label>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a type…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fulltime">Full-time</SelectItem>
              <SelectItem value="parttime">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Experience level</Label>
          <Select defaultValue="mid">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Individual contributor</SelectLabel>
                <SelectItem value="junior">Junior (0–2 yrs)</SelectItem>
                <SelectItem value="mid">Mid (2–5 yrs)</SelectItem>
                <SelectItem value="senior">Senior (5+ yrs)</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Management</SelectLabel>
                <SelectItem value="lead">Tech Lead</SelectItem>
                <SelectItem value="manager">Engineering Manager</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Disabled</Label>
          <Select disabled>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Not available" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="x">Option</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ),
};

export const SliderDemo: Story = {
  render: () => {
    const [val, setVal] = useState([60]);
    return (
      <div className="space-y-6 p-6 bg-background rounded-xl w-80">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slider</p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Resume strength threshold</span>
            <span className="font-medium text-foreground">{val[0]}%</span>
          </div>
          <Slider value={val} onValueChange={setVal} min={0} max={100} step={1} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Default value (uncontrolled)</span>
            <span>50%</span>
          </div>
          <Slider defaultValue={[50]} min={0} max={100} step={5} />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Disabled</p>
          <Slider defaultValue={[30]} disabled />
        </div>
      </div>
    );
  },
};
