import React from "react";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileLock2,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Document {
  id: number;
  name: string;
  type: string;
  size: string;
  status: string;
  date: string;
}

const documents: Document[] = [
  {
    id: 1,
    name: "National ID Card (Front/Back)",
    type: "Image/PDF",
    size: "2.4 MB",
    status: "verified",
    date: "May 10, 2026",
  },
  {
    id: 2,
    name: "Employment Contract - 2026",
    type: "PDF",
    size: "1.1 MB",
    status: "verified",
    date: "May 10, 2026",
  },
  {
    id: 3,
    name: "Background Verification Report",
    type: "PDF",
    size: "850 KB",
    status: "pending",
    date: "May 12, 2026",
  },
  {
    id: 4,
    name: "Educational Certificates",
    type: "Archive",
    size: "12.5 MB",
    status: "verified",
    date: "May 10, 2026",
  },
];

const DocumentCard: React.FC<{ doc: Document }> = ({ doc }) => (
  <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {doc.name}
            </span>
            {doc.status === "verified" ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">
            <span>{doc.type}</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span>{doc.size}</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span>Added {doc.date}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900">
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

export const EmployeeDocuments: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100">
            Verified Documents
          </h3>
          <p className="text-[11px] text-zinc-500">
            Official identification and employment records.
          </p>
        </div>
        <Button className="h-8 text-[11px] font-black uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-none">
          Upload New
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
};
