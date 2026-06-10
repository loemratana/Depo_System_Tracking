import React, { useRef, useState } from "react";
import { CreateEmployeeInput, Employee } from "../types/employee.types";
import { Upload, X, Loader2 } from "lucide-react";
import { employeeApi } from "../services/employee.api";
interface EmployeeFormProps {
  initialData?: Partial<Employee>;
  onSubmit: (data: CreateEmployeeInput) => void;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

const Field = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {label}
      {required && <span className="ml-0.5 text-zinc-400">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="
        h-8 px-2.5 text-[13px] rounded-md border
        bg-white dark:bg-zinc-900
        border-zinc-200 dark:border-zinc-700
        text-zinc-800 dark:text-zinc-200
        placeholder-zinc-400 dark:placeholder-zinc-600
        focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500
        transition-shadow
      "
    />
  </div>
);

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = "Save Employee",
  isSubmitting = false,
}) => {
  const isEdit = Object.keys(initialData).length > 0;

  const [formData, setFormData] = React.useState<CreateEmployeeInput & { images?: string }>({
    khmerName: initialData.khmerName || "",
    englishName: initialData.englishName || "",
    employeeCode: initialData.employeeCode || "",
    images: initialData.images || "",
    dateOfBirth: initialData.dateOfBirth || "",
    address: initialData.address || "",
    department: initialData.department || "",
    position: initialData.position || "",
    phone: initialData.phone || "",
    email: initialData.email || "",
    hireDate: initialData.hireDate || new Date().toISOString().split("T")[0],
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await employeeApi.uploadProfileImage(file);
      setFormData((prev) => ({ ...prev, images: url }));
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, images: "" }));
  };

  React.useEffect(() => {
    if (initialData && Object.values(initialData).some(Boolean)) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [JSON.stringify(initialData)]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Section: Identity */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Identity
          </p>
        </div>

        {/* Profile Image Uploader */}
        <div className="mb-4">
          <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5 block">
            Profile Image
          </label>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
              {formData.images ? (
                <>
                  <img src={formData.images} alt="Profile" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-white hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : isUploading ? (
                <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
                id="profile-upload"
              />
              <label
                htmlFor="profile-upload"
                className="h-7 px-3 flex items-center justify-center text-[11px] font-semibold rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors w-max"
              >
                {isUploading ? "Uploading..." : formData.images ? "Change Photo" : "Upload Photo"}
              </label>
              <p className="text-[10px] text-zinc-400">JPG, PNG or WEBP (Max 5MB)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field
            label="Khmer Name"
            name="khmerName"
            value={formData.khmerName || ""}
            onChange={handleChange}
            required={!isEdit}
            placeholder="e.g. ឆន សុខដារ៉ា"
          />
          <Field
            label="English Name"
            name="englishName"
            value={formData.englishName || ""}
            onChange={handleChange}
            placeholder="e.g. CHORN SOKDARA"
          />
          <Field
            label="Employee Code / ID"
            name="employeeCode"
            value={formData.employeeCode || ""}
            onChange={handleChange}
            required={!isEdit}
            placeholder="e.g. EMP001"
          />
          <Field
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth || ""}
            onChange={handleChange}
          />
          <Field
            label="Address"
            name="address"
            value={formData.address || ""}
            onChange={handleChange}
            placeholder="City, Province"
          />
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800" />

      {/* Section: Role */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
          Role & Assignment
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field
            label="Department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            placeholder="e.g. Operations"
          />
          <Field
            label="Position"
            name="position"
            value={formData.position}
            onChange={handleChange}
            placeholder="e.g. Field Supervisor"
          />
          <Field
            label="Hire Date"
            name="hireDate"
            type="date"
            value={formData.hireDate || ""}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800" />

      {/* Section: Contact */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
          Contact
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 012 345 678"
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="employee@company.com"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3.5 text-[12px] font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-8 px-4 text-[12px] font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
};
