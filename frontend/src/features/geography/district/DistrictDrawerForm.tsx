import React from 'react';
import { MapPin, Check, ChevronsUpDown } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProvinces } from '../province/province.hooks';
import type { District } from './district.types';

interface DistrictDrawerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDistrict: District | null;
  provinceId?: string;
  provinceName?: string;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export const DistrictDrawerForm: React.FC<DistrictDrawerFormProps> = ({
  open,
  onOpenChange,
  editingDistrict,
  provinceId,
  onSubmit,
  isSubmitting,
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    code: '',
    provinceId: '',
    status: 'active' as const,
  });
  
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const { data: provinces = [] } = useProvinces();

  React.useEffect(() => {
    if (editingDistrict) {
      setFormData({
        name: editingDistrict.name,
        code: editingDistrict.code,
        provinceId: editingDistrict.provinceId.toString(),
        status: editingDistrict.status,
      });
    } else {
      setFormData({ 
        name: '', 
        code: '', 
        provinceId: provinceId || '', 
        status: 'active' 
      });
    }
  }, [editingDistrict, open, provinceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provinceId) return;
    onSubmit(formData);
  };

  const selectedProvince = provinces.find((p) => p.id.toString() === formData.provinceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {editingDistrict ? 'Edit District' : 'Add New District'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {editingDistrict 
              ? 'Update district details and regional mapping.' 
              : 'Assign a new area to a province.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="district-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                District Name
              </Label>
              <Input
                id="district-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Downtown Area"
                required
                className="h-10 bg-background border-border focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                District Code
              </Label>
              <Input
                id="district-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., DT01"
                required
                maxLength={5}
                className="h-10 font-mono bg-background border-border focus-visible:ring-primary/20 uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Parent Province
              </Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-full justify-between h-10 bg-background border-border font-normal"
                  >
                    {selectedProvince ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary/60" />
                        <span>{selectedProvince.name}</span>
                      </div>
                    ) : (
                      "Select province..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search province..." />
                    <CommandList>
                      <CommandEmpty>No province found.</CommandEmpty>
                      <CommandGroup>
                        {provinces.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.name}
                            onSelect={() => {
                              setFormData({ ...formData, provinceId: p.id.toString() });
                              setPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.provinceId === p.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                District Status
              </Label>
              <RadioGroup 
                value={formData.status} 
                onValueChange={(val) => setFormData({ ...formData, status: val as 'active' | 'inactive' })}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="d-active" />
                  <Label htmlFor="d-active" className="cursor-pointer">
                    <StatusBadge status="active" />
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="d-inactive" />
                  <Label htmlFor="d-inactive" className="cursor-pointer">
                    <StatusBadge status="inactive" />
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-10 px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-10 px-6 min-w-[120px] bg-blue-600" 
              disabled={isSubmitting || !formData.provinceId}
            >
              {isSubmitting ? 'Saving...' : editingDistrict ? 'Save Changes' : 'Create District'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


