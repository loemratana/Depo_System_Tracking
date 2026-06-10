import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";

const ImportDepotButton = () => {
  return (
    <Link
      to="/depos/bulk-import"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:border-border-strong"
    >
      <Upload className="h-3 w-3" /> Import CSV
    </Link>
  );
};

export default ImportDepotButton;
