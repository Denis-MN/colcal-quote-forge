import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, FileDown, Upload, LogOut, Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import colcalLogo from "@/assets/colcal-logo.webp";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import ProductSearch, { type CatalogProduct } from "./ProductSearch";

interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  quantity: number;
  unitPrice: number;
}

interface CustomerInfo {
  name: string;
  company: string;
  location: string;
  phone: string;
  email: string;
}

interface SalesRepInfo {
  name: string;
  position: string;
  phone: string;
  email: string;
  signature: string;
}

interface SavedQuotation {
  id: string;
  quotation_number: string;
  date: string;
  customer_info: CustomerInfo;
  sales_rep_info: SalesRepInfo;
  project_title: string;
  intro_text: string;
  project_details: string;
  products: Product[];
  installation_cost: number;
  include_tax: boolean;
  created_at: string;
}

const QuotationForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedQuotations, setSavedQuotations] = useState<SavedQuotation[]>([]);
  const [quotationNumber] = useState(
    `COL/GEN/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0")}`
  );
  const [date] = useState(new Date().toLocaleDateString("en-GB"));
  
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    company: "",
    location: "",
    phone: "",
    email: "",
  });

  const [salesRepInfo, setSalesRepInfo] = useState<SalesRepInfo>({
    name: "",
    position: "Sales Engineer",
    phone: "",
    email: "",
    signature: "",
  });

  const [projectTitle, setProjectTitle] = useState("");
  const [introText, setIntroText] = useState(
    "Thank you for choosing Colcal Machinery. Below is our quotation for the requested system. We guarantee reliable equipment, professional installation, and full after-sales support across Kenya and East Africa."
  );
  const [projectDetails, setProjectDetails] = useState("");

  const [products, setProducts] = useState<Product[]>([
    {
      id: "1",
      name: "",
      description: "",
      image: "",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  
  const [installationCost, setInstallationCost] = useState(0);
  const [includeTax, setIncludeTax] = useState(false);
  const vatRate = 0.16;

  // Check authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load saved quotations
  useEffect(() => {
    if (user && activeTab === "saved") {
      loadSavedQuotations();
    }
  }, [user, activeTab]);

  const loadSavedQuotations = async () => {
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load saved quotations.",
        variant: "destructive",
      });
    } else {
      // Cast Json types to proper types
      const quotations = (data || []).map(q => ({
        ...q,
        customer_info: q.customer_info as unknown as CustomerInfo,
        sales_rep_info: q.sales_rep_info as unknown as SalesRepInfo,
        products: q.products as unknown as Product[],
      }));
      setSavedQuotations(quotations);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const saveQuotation = async () => {
    if (!user) return;

    const quotationData = {
      user_id: user.id,
      quotation_number: quotationNumber,
      date,
      customer_info: customerInfo as any,
      sales_rep_info: salesRepInfo as any,
      project_title: projectTitle,
      intro_text: introText,
      project_details: projectDetails,
      products: products as any,
      installation_cost: installationCost,
      include_tax: includeTax,
    };

    if (editingId) {
      // Update existing quotation
      const { error } = await supabase
        .from("quotations")
        .update(quotationData)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update quotation.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: "Quotation updated successfully.",
        });
        setEditingId(null);
        setActiveTab("saved");
        loadSavedQuotations();
      }
    } else {
      // Create new quotation
      const { error } = await supabase
        .from("quotations")
        .insert([quotationData]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save quotation.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: "Quotation saved successfully.",
        });
        setActiveTab("saved");
        loadSavedQuotations();
      }
    }
  };

  const loadQuotation = (quotation: SavedQuotation) => {
    setEditingId(quotation.id);
    setCustomerInfo(quotation.customer_info);
    setSalesRepInfo(quotation.sales_rep_info);
    setProjectTitle(quotation.project_title);
    setIntroText(quotation.intro_text);
    setProjectDetails(quotation.project_details || "");
    setProducts(quotation.products);
    setInstallationCost(Number(quotation.installation_cost));
    setIncludeTax(quotation.include_tax);
    setActiveTab("create");
    
    toast({
      title: "Quotation Loaded",
      description: "You can now edit this quotation.",
    });
  };

  const deleteQuotation = async (id: string) => {
    const { error } = await supabase
      .from("quotations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete quotation.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Quotation deleted successfully.",
      });
      loadSavedQuotations();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCustomerInfo({ name: "", company: "", location: "", phone: "", email: "" });
    setSalesRepInfo({ name: "", position: "Sales Engineer", phone: "", email: "", signature: "" });
    setProjectTitle("");
    setProjectDetails("");
    setIntroText("Thank you for choosing Colcal Machinery. Below is our quotation for the requested system. We guarantee reliable equipment, professional installation, and full after-sales support across Kenya and East Africa.");
    setProducts([{ id: "1", name: "", description: "", image: "", quantity: 1, unitPrice: 0 }]);
    setInstallationCost(0);
    setIncludeTax(false);
  };

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now().toString(),
        name: "",
        description: "",
        image: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const calculateSubtotal = () => {
    return products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  };

  const calculateVAT = () => {
    if (!includeTax) return 0;
    // VAT only applies to products (subtotal), not installation
    return calculateSubtotal() * vatRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + installationCost + calculateVAT();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleImageUpload = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProductImageUpload = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("quote-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("quote-images").getPublicUrl(path);
      updateProduct(productId, "image", data.publicUrl);
    } catch (err: any) {
      // fallback to data URL if storage upload fails
      handleImageUpload(file, (dataUrl) => updateProduct(productId, "image", dataUrl));
      toast({ title: "Image stored locally", description: err?.message ?? "Upload fallback used" });
    }
  };

  const addProductFromCatalog = (p: CatalogProduct) => {
    setProducts((prev) => {
      const isFirstEmpty =
        prev.length === 1 && !prev[0].name && !prev[0].description && !prev[0].image && prev[0].unitPrice === 0;
      const newItem: Product = {
        id: Date.now().toString(),
        name: p.name,
        description: p.short_description || p.description || "",
        image: p.image_url || "",
        quantity: 1,
        unitPrice: Number(p.price) || 0,
      };
      return isFirstEmpty ? [newItem] : [...prev, newItem];
    });
    toast({ title: "Product added", description: p.name });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, (dataUrl) => {
        setSalesRepInfo({ ...salesRepInfo, signature: dataUrl });
      });
    }
  };

  const generatePDF = async () => {
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we prepare your quotation.",
      });

      // jsPDF cannot embed WEBP and needs intrinsic image sizes, so every image
      // (logo, product photos, signature) is redrawn through a canvas as a
      // downscaled JPEG first — keeps the PDF small and embed-safe.
      const normalizeImage = (src: string) =>
        new Promise<{ dataUrl: string; width: number; height: number } | null>((resolve) => {
          if (!src) {
            resolve(null);
            return;
          }
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try {
              const maxSide = 600;
              const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
              canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(null);
                return;
              }
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve({
                dataUrl: canvas.toDataURL("image/jpeg", 0.85),
                width: canvas.width,
                height: canvas.height,
              });
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = src;
        });

      const [logoImg, signatureImg, ...productImgs] = await Promise.all([
        normalizeImage(colcalLogo),
        normalizeImage(salesRepInfo.signature || ""),
        ...products.map((p) => normalizeImage(p.image || "")),
      ]);

      const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const PRIMARY: [number, number, number] = [28, 110, 141];
      const SECONDARY: [number, number, number] = [170, 203, 77];
      const TEXT: [number, number, number] = [36, 41, 45];
      const MUTED: [number, number, number] = [105, 112, 119];
      const BORDER: [number, number, number] = [214, 222, 231];
      const LIGHT: [number, number, number] = [240, 246, 248];

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const M = { left: 14, right: 14, top: 16, bottom: 24 };
      const contentW = pageW - M.left - M.right;
      const footerTop = pageH - 18;
      let y = M.top;

      const ensureSpace = (needed: number) => {
        if (y + needed > footerTop) {
          doc.addPage();
          y = M.top;
        }
      };

      const setFont = (
        style: "normal" | "bold" | "italic",
        size: number,
        color: [number, number, number]
      ) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
      };

      const sectionTitle = (text: string) => {
        ensureSpace(12);
        setFont("bold", 12, PRIMARY);
        doc.text(text, M.left, y + 4);
        y += 9;
      };

      // Bold label + wrapped normal value on one line; returns height used (mm).
      const kv = (x: number, baseY: number, label: string, value: string, width: number): number => {
        setFont("bold", 9, TEXT);
        doc.text(label, x, baseY);
        const lw = doc.getTextWidth(label);
        setFont("normal", 9, MUTED);
        const lines = doc.splitTextToSize(value || "-", Math.max(10, width - lw - 2)) as string[];
        lines.forEach((ln, i) => doc.text(ln, x + lw + 1.5, baseY + i * 4.2));
        return lines.length * 4.2;
      };

      const paragraph = (
        text: string,
        opts?: { width?: number; x?: number; size?: number; lineHeight?: number; color?: [number, number, number] }
      ) => {
        const size = opts?.size ?? 9;
        const lh = opts?.lineHeight ?? 4.4;
        const x = opts?.x ?? M.left;
        const width = opts?.width ?? contentW;
        setFont("normal", size, opts?.color ?? TEXT);
        const lines = doc.splitTextToSize(text, width) as string[];
        ensureSpace(lines.length * lh + 4);
        lines.forEach((ln, i) => doc.text(ln, x, y + 3.5 + i * lh));
        y += lines.length * lh + 2;
      };

      const drawCheck = (x: number, baseY: number) => {
        doc.setDrawColor(...SECONDARY);
        doc.setLineWidth(0.7);
        doc.line(x, baseY - 0.6, x + 1.1, baseY + 0.8);
        doc.line(x + 1.1, baseY + 0.8, x + 3.2, baseY - 2);
      };

      // ---------- Page 1 header ----------
      setFont("bold", 20, PRIMARY);
      doc.text("QUOTATION", pageW - M.right, y + 9, { align: "right" });
      setFont("normal", 9, MUTED);
      doc.text(`No: ${quotationNumber}`, pageW - M.right, y + 15, { align: "right" });
      doc.text(`Date: ${date}`, pageW - M.right, y + 19.5, { align: "right" });
      if (logoImg) {
        const h = 17;
        const w = h * (logoImg.width / logoImg.height);
        doc.addImage(logoImg.dataUrl, "JPEG", M.left, y, w, h);
      }
      y += 21;
      setFont("normal", 8, MUTED);
      doc.text("Powering Homes, Businesses & Industries Across East Africa", M.left, y + 2);
      y += 6;
      doc.setDrawColor(...PRIMARY);
      doc.setLineWidth(0.6);
      doc.line(M.left, y, pageW - M.right, y);
      y += 7;

      // ---------- Company contact block ----------
      const colW3 = contentW / 3;
      ensureSpace(26);
      doc.setFillColor(...LIGHT);
      doc.roundedRect(M.left, y, contentW, 21, 1.5, 1.5, "F");
      kv(M.left + 4, y + 6, "Email:", "sales@colcalmachinery.co.ke", colW3 - 8);
      kv(M.left + colW3 + 2, y + 6, "Phone:", "0701 652100", colW3 - 8);
      kv(M.left + 2 * colW3, y + 6, "Website:", "www.colcalmachinery.co.ke", colW3 - 6);
      kv(M.left + 4, y + 14, "Address:", "Ruai, Kangundo rd, Opposite Shell Petrol Station", contentW - 10);
      y += 21 + 7;

      // ---------- Bill To ----------
      sectionTitle("Bill To:");
      const halfW = contentW / 2;
      const billPairs: Array<[string, string]> = [
        ["Name:", customerInfo.name],
        ["Company:", customerInfo.company],
        ["Location:", customerInfo.location],
        ["Phone:", customerInfo.phone],
      ];
      for (let i = 0; i < billPairs.length; i += 2) {
        ensureSpace(8);
        const h1 = kv(M.left, y + 4, billPairs[i][0], billPairs[i][1], halfW - 8);
        const h2 = billPairs[i + 1]
          ? kv(M.left + halfW, y + 4, billPairs[i + 1][0], billPairs[i + 1][1], halfW - 8)
          : 0;
        y += Math.max(h1, h2, 5) + 2;
      }
      ensureSpace(8);
      const emailH = kv(M.left, y + 4, "Email:", customerInfo.email, contentW - 8);
      y += Math.max(emailH, 5) + 5;

      // ---------- Project title ----------
      if (projectTitle) {
        sectionTitle(`Quotation for ${projectTitle}`);
      }

      // ---------- Introduction ----------
      {
        setFont("normal", 9, TEXT);
        const lines = doc.splitTextToSize(introText, contentW - 10) as string[];
        const boxH = lines.length * 4.4 + 9;
        ensureSpace(boxH + 2);
        doc.setFillColor(...LIGHT);
        doc.roundedRect(M.left, y, contentW, boxH, 1.5, 1.5, "F");
        lines.forEach((ln, i) => doc.text(ln, M.left + 5, y + 6.5 + i * 4.4));
        y += boxH + 6;
      }

      // ---------- Technical specifications / project overview ----------
      if (projectDetails) {
        sectionTitle("Technical Specifications & Project Overview");
        projectDetails.split("\n").forEach((line) => {
          if (!line.trim()) {
            y += 2;
            return;
          }
          paragraph(line);
        });
        y += 2;
      }

      // ---------- Products table (header repeats on every page) ----------
      ensureSpace(34);
      autoTable(doc, {
        startY: y,
        margin: { left: M.left, right: M.right, top: M.top, bottom: M.bottom },
        head: [["", "#", "Product", "Description", "Qty", "Unit Price (KES)", "Total (KES)"]],
        body: products.map((p, i) => [
          "",
          String(i + 1),
          p.name || "[Product Name]",
          p.description || "-",
          String(p.quantity),
          formatCurrency(p.unitPrice),
          formatCurrency(p.quantity * p.unitPrice),
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: 2,
          textColor: TEXT,
          lineColor: BORDER,
          lineWidth: 0.15,
          valign: "middle",
        },
        headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        alternateRowStyles: { fillColor: [248, 250, 251] },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 8, halign: "center" },
          2: { cellWidth: 46, fontStyle: "bold" },
          3: { cellWidth: 56, textColor: MUTED, fontSize: 8 },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 22, halign: "right" },
          6: { cellWidth: 22, halign: "right" },
        },
        rowPageBreak: "avoid",
        didParseCell: (data: any) => {
          if (data.section === "body" && productImgs[data.row.index]) {
            data.cell.styles.minCellHeight = 17;
          }
        },
        didDrawCell: (data: any) => {
          const img = productImgs[data.row.index];
          if (data.section === "body" && data.column.index === 0 && img) {
            const maxH = 14;
            const maxW = 12;
            const aspect = img.width / img.height;
            let w = maxH * aspect;
            let h = maxH;
            if (w > maxW) {
              w = maxW;
              h = maxW / aspect;
            }
            doc.addImage(
              img.dataUrl,
              "JPEG",
              data.cell.x + (data.cell.width - w) / 2,
              data.cell.y + (data.cell.height - h) / 2,
              w,
              h
            );
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ---------- Price summary ----------
      const sumW = 85;
      const sumX = pageW - M.right - sumW;
      const summaryRows: Array<[string, string]> = [
        ["Subtotal:", `KES ${formatCurrency(calculateSubtotal())}`],
        ["Installation:", `KES ${formatCurrency(installationCost)}`],
      ];
      if (includeTax) summaryRows.push(["VAT (16%):", `KES ${formatCurrency(calculateVAT())}`]);
      const summaryH = summaryRows.length * 7 + 13;
      ensureSpace(summaryH + 2);
      summaryRows.forEach(([label, val], i) => {
        const baseY = y + 5 + i * 7;
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(sumX, baseY + 2.5, pageW - M.right, baseY + 2.5);
        setFont("normal", 9, MUTED);
        doc.text(label, sumX, baseY);
        setFont("bold", 9, TEXT);
        doc.text(val, pageW - M.right, baseY, { align: "right" });
      });
      y += summaryRows.length * 7 + 2;
      doc.setFillColor(232, 242, 245);
      doc.rect(sumX, y, sumW, 11, "F");
      setFont("bold", 11, PRIMARY);
      doc.text("Total Payable:", sumX + 3, y + 7.2);
      setFont("bold", 12, PRIMARY);
      doc.text(`KES ${formatCurrency(calculateTotal())}`, pageW - M.right - 3, y + 7.2, {
        align: "right",
      });
      y += 11 + 8;

      // ---------- Why Choose block ----------
      {
        const bullets = [
          "Trusted brands like Perkins, Cummins, Jinko, SRNE, and Premier",
          "Expert installation and training",
          "5-year warranty on solar systems",
          "24/7 technical support and spare parts availability",
        ];
        const proposalText =
          "Colcal Machinery specializes in reliable power and machinery solutions across Kenya and East Africa. We offer complete installation, testing, and commissioning services handled by certified technicians. Every project is delivered on time, professionally executed, and backed by after-sales support.";
        const bulletColW = (contentW - 16) / 2;
        setFont("normal", 9, TEXT);
        const bulletLineCounts = bullets.map(
          (b) => (doc.splitTextToSize(b, bulletColW - 7) as string[]).length
        );
        const bulletRows = [0, 2].map((start) =>
          Math.max(bulletLineCounts[start], bulletLineCounts[start + 1] ?? 0)
        );
        const paraLineCount = (doc.splitTextToSize(proposalText, contentW - 12) as string[]).length;
        const blockH =
          12 + paraLineCount * 4.4 + 4 + bulletRows.reduce((s, r) => s + r * 4.4 + 3, 0) + 4;
        ensureSpace(blockH + 2);
        doc.setFillColor(244, 248, 245);
        doc.roundedRect(M.left, y, contentW, blockH, 1.5, 1.5, "F");
        setFont("bold", 12, PRIMARY);
        doc.text("Why Choose Colcal Machinery?", M.left + 6, y + 7.5);
        setFont("normal", 9, TEXT);
        const paraLines = doc.splitTextToSize(proposalText, contentW - 12) as string[];
        paraLines.forEach((ln, i) => doc.text(ln, M.left + 6, y + 14 + i * 4.4));
        let by = y + 14 + paraLineCount * 4.4 + 4;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const idx = r * 2 + c;
            if (idx >= bullets.length) break;
            const bx = M.left + 6 + c * (bulletColW + 8);
            drawCheck(bx, by + 1);
            const lines = doc.splitTextToSize(bullets[idx], bulletColW - 7) as string[];
            lines.forEach((ln, i) => doc.text(ln, bx + 5.5, by + i * 4.4));
          }
          by += bulletRows[r] * 4.4 + 3;
        }
        y += blockH + 7;
      }

      // ---------- Payment details ----------
      {
        sectionTitle("Payment Details");
        const leftLines: Array<[string, string]> = [
          ["Paybill:", "880100"],
          ["Account Number:", "308388"],
        ];
        const rightLines: Array<[string, string]> = [
          ["Bank Name:", "NCBA BANK KENYA PLC"],
          ["Account Name:", "COLCAL EQUIPMENTS LIMITED"],
          ["Account Number:", "1011585472"],
          ["SWIFT Code:", "CBAFKENX"],
          ["Bank Code:", "7"],
          ["Branch Code:", "130 (Kitengela Branch)"],
        ];
        const colWp = (contentW - 20) / 2;
        const boxH = 10 + 6 * 4.6 + 6;
        ensureSpace(boxH + 2);
        doc.setFillColor(...LIGHT);
        doc.roundedRect(M.left, y, contentW, boxH, 1.5, 1.5, "F");
        setFont("bold", 10, TEXT);
        doc.text("LIPA NA MPESA", M.left + 6, y + 6.5);
        doc.text("BANKING DETAILS", M.left + 10 + colWp, y + 6.5);
        let py = y + 13;
        leftLines.forEach(([l, v]) => {
          kv(M.left + 6, py, l, v, colWp);
          py += 4.6;
        });
        let pry = y + 13;
        rightLines.forEach(([l, v]) => {
          kv(M.left + 10 + colWp, pry, l, v, colWp);
          pry += 4.6;
        });
        y += boxH + 7;
      }

      // ---------- Prepared by / signature ----------
      sectionTitle("Quotation Prepared By:");
      const repPairs: Array<[string, string]> = [
        ["Name:", salesRepInfo.name],
        ["Position:", salesRepInfo.position],
        ["Phone:", salesRepInfo.phone],
        ["Email:", salesRepInfo.email],
      ];
      for (let i = 0; i < repPairs.length; i += 2) {
        ensureSpace(8);
        const h1 = kv(M.left, y + 4, repPairs[i][0], repPairs[i][1], halfW - 8);
        const h2 = repPairs[i + 1]
          ? kv(M.left + halfW, y + 4, repPairs[i + 1][0], repPairs[i + 1][1], halfW - 8)
          : 0;
        y += Math.max(h1, h2, 5) + 2;
      }
      y += 3;
      ensureSpace(30);
      setFont("normal", 8, MUTED);
      doc.text("Authorized Signature:", M.left, y + 3);
      y += 6;
      if (signatureImg) {
        const maxH = 15;
        const maxW = 60;
        const aspect = signatureImg.width / signatureImg.height;
        let w = maxH * aspect;
        let h = maxH;
        if (w > maxW) {
          w = maxW;
          h = maxW / aspect;
        }
        doc.addImage(signatureImg.dataUrl, "JPEG", M.left, y, w, h);
        y += h + 2;
      }
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.line(M.left, y + 4, M.left + 60, y + 4);
      setFont("normal", 8, MUTED);
      doc.text(`Date: ${date}`, M.left, y + 9);
      y += 13;

      // ---------- Footer on every page (with page numbers) ----------
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...PRIMARY);
        doc.setLineWidth(0.6);
        doc.line(M.left, footerTop, pageW - M.right, footerTop);
        setFont("bold", 8.5, PRIMARY);
        doc.text(
          "For reliable solar, generator, and machinery solutions — trust Colcal machinery",
          M.left,
          footerTop + 4.5
        );
        setFont("normal", 8, MUTED);
        doc.text(`Page ${i} of ${totalPages}`, pageW - M.right, footerTop + 4.5, { align: "right" });
        setFont("normal", 7.5, MUTED);
        doc.text(
          "Delivering power across Kenya & East Africa  |  www.colcalmachinery.co.ke  |  sales@colcalmachinery.co.ke  |  Tel: 0701 652100",
          M.left,
          footerTop + 8.5
        );
      }

      doc.save(`Colcal_Quotation_${quotationNumber}.pdf`);

      toast({
        title: "PDF Generated!",
        description: "Your quotation has been downloaded successfully.",
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-4 sm:py-8">
      <div className="container max-w-6xl mx-auto px-3 sm:px-4">
        {/* Header with Logout */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Colcal Quotation System</h1>
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-auto">
            <TabsTrigger value="create" className="text-xs sm:text-sm whitespace-normal py-2">
              {editingId ? "Edit Quotation" : "Create New"}
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-xs sm:text-sm whitespace-normal py-2">
              <span className="sm:hidden">Saved</span>
              <span className="hidden sm:inline">Saved Quotations (Last 30 Days)</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            {/* Form Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary to-secondary text-primary-foreground p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">Create New Quotation</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 px-4 sm:px-6 space-y-6 sm:space-y-8">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Customer Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company/Organization</Label>
                  <Input
                    id="company"
                    value={customerInfo.company}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, company: e.target.value })
                    }
                    placeholder="ABC Limited"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location/Site</Label>
                  <Input
                    id="location"
                    value={customerInfo.location}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, location: e.target.value })
                    }
                    placeholder="Nairobi, Kenya"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, phone: e.target.value })
                    }
                    placeholder="0700 000000"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, email: e.target.value })
                    }
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Project Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Project Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectTitle">Project/System Name</Label>
                  <Input
                    id="projectTitle"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g., 50kW Solar Power System"
                  />
                </div>
                <div>
                  <Label htmlFor="introText">Introduction Text</Label>
                  <Textarea
                    id="introText"
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="projectDetails">Technical Specifications / Project Overview</Label>
                  <Textarea
                    id="projectDetails"
                    value={projectDetails}
                    onChange={(e) => setProjectDetails(e.target.value)}
                    placeholder="e.g., System components, panel count, inverter capacity, battery backup, site assessment notes..."
                    rows={5}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Products/Systems</h3>
                <Button onClick={addProduct} size="sm" variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Blank
                </Button>
              </div>

              <div className="mb-4">
                <ProductSearch onSelect={addProductFromCatalog} />
              </div>

              <div className="space-y-4">
                {products.map((product, index) => (
                  <Card key={product.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-medium text-foreground">Product {index + 1}</h4>
                        {products.length > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Product Name</Label>
                          <Input
                            value={product.name}
                            onChange={(e) =>
                              updateProduct(product.id, "name", e.target.value)
                            }
                            placeholder="50kW Solar Kit"
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={product.description}
                            onChange={(e) =>
                              updateProduct(product.id, "description", e.target.value)
                            }
                            placeholder="Detailed description of product and components"
                            rows={3}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Product Image</Label>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProductImageUpload(product.id, e)}
                              className="flex-1"
                            />
                            {product.image && (
                              <img
                                src={product.image}
                                alt="Product preview"
                                className="h-16 w-16 sm:h-12 sm:w-12 object-cover rounded border"
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Unit Price (KES)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={product.unitPrice}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Total Price (KES)</Label>
                          <Input
                            value={formatCurrency(product.quantity * product.unitPrice)}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Installation Cost */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Additional Costs</h3>
              <div className="max-w-md space-y-4">
                <div>
                  <Label htmlFor="installation">Installation Cost (KES)</Label>
                  <Input
                    id="installation"
                    type="number"
                    min="0"
                    value={installationCost}
                    onChange={(e) =>
                      setInstallationCost(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTax"
                    checked={includeTax}
                    onCheckedChange={(checked) => setIncludeTax(checked as boolean)}
                  />
                  <Label
                    htmlFor="includeTax"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include VAT (16%) - applied to products only, not installation
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sales Representative */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Sales Representative</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="repName">Name</Label>
                  <Input
                    id="repName"
                    value={salesRepInfo.name}
                    onChange={(e) =>
                      setSalesRepInfo({ ...salesRepInfo, name: e.target.value })
                    }
                    placeholder="Sales Rep Name"
                  />
                </div>
                <div>
                  <Label htmlFor="repPosition">Position</Label>
                  <Input
                    id="repPosition"
                    value={salesRepInfo.position}
                    onChange={(e) =>
                      setSalesRepInfo({ ...salesRepInfo, position: e.target.value })
                    }
                    placeholder="Sales Engineer"
                  />
                </div>
                <div>
                  <Label htmlFor="repPhone">Phone</Label>
                  <Input
                    id="repPhone"
                    value={salesRepInfo.phone}
                    onChange={(e) =>
                      setSalesRepInfo({ ...salesRepInfo, phone: e.target.value })
                    }
                    placeholder="0700 000000"
                  />
                </div>
                <div>
                  <Label htmlFor="repEmail">Email</Label>
                  <Input
                    id="repEmail"
                    type="email"
                    value={salesRepInfo.email}
                    onChange={(e) =>
                      setSalesRepInfo({ ...salesRepInfo, email: e.target.value })
                    }
                    placeholder="rep@colcalmachinery.co.ke"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="repSignature">E-Signature</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="repSignature"
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="flex-1"
                    />
                    {salesRepInfo.signature && (
                      <img
                        src={salesRepInfo.signature}
                        alt="Signature preview"
                        className="h-12 w-24 object-contain rounded border bg-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end pt-4">
              {editingId && (
                <Button onClick={resetForm} size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  Cancel Edit
                </Button>
              )}
              <Button onClick={saveQuotation} size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                <Save className="h-5 w-5" />
                {editingId ? "Update Quotation" : "Save Quotation"}
              </Button>
              <Button onClick={generatePDF} size="lg" className="gap-2 w-full sm:w-auto">
                <FileDown className="h-5 w-5" />
                Generate PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card id="quotation-preview" className="bg-white shadow-xl">
          <CardContent className="p-4 sm:p-8 md:p-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 pb-6 border-b-2 border-primary">
              <div className="mb-4 md:mb-0">
                <img
                  src={colcalLogo}
                  alt="Colcal Machinery"
                  className="h-16 md:h-20 mb-3"
                />
                <p className="text-sm text-muted-foreground font-medium">
                  Powering Homes, Businesses & Industries Across East Africa
                </p>
              </div>
              <div className="text-right">
                <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
                  QUOTATION
                </h1>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">No:</span> {quotationNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Date:</span> {date}
                </p>
              </div>
            </div>

            {/* Company Contact Info */}
            <div className="grid md:grid-cols-3 gap-4 mb-8 p-4 bg-muted/50 rounded-lg text-sm">
              <div>
                <p className="font-semibold text-foreground">Email:</p>
                <p className="text-muted-foreground">sales@colcalmachinery.co.ke</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Phone:</p>
                <p className="text-muted-foreground">0701 652100</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Website:</p>
                <p className="text-muted-foreground">www.colcalmachinery.co.ke</p>
              </div>
              <div className="md:col-span-3">
                <p className="font-semibold text-foreground">Address:</p>
                <p className="text-muted-foreground">
                  Ruai, Kangundo rd, Opposite Shell Petrol Station
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-primary mb-3">Bill To:</h2>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="font-semibold text-foreground">Name:</span>{" "}
                  <span className="text-muted-foreground">
                    {customerInfo.name || "[Customer Name]"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Company:</span>{" "}
                  <span className="text-muted-foreground">
                    {customerInfo.company || "[Company]"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Location:</span>{" "}
                  <span className="text-muted-foreground">
                    {customerInfo.location || "[Location]"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Phone:</span>{" "}
                  <span className="text-muted-foreground">
                    {customerInfo.phone || "[Phone]"}
                  </span>
                </p>
                <p className="md:col-span-2">
                  <span className="font-semibold text-foreground">Email:</span>{" "}
                  <span className="text-muted-foreground">
                    {customerInfo.email || "[Email]"}
                  </span>
                </p>
              </div>
            </div>

            {/* Project Title */}
            {projectTitle && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-primary">
                  Quotation for {projectTitle}
                </h2>
              </div>
            )}

            {/* Introduction */}
            <div className="mb-8 p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-foreground leading-relaxed">{introText}</p>
            </div>

            {/* Technical Specifications / Project Overview */}
            {projectDetails && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-primary mb-3">Technical Specifications & Project Overview</h3>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{projectDetails}</p>
              </div>
            )}

            {/* Products Table */}
            <div className="mb-8 -mx-4 sm:mx-0 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="border border-primary p-2 sm:p-3 text-left">#</th>
                    <th className="border border-primary p-2 sm:p-3 text-left">Product</th>
                    <th className="border border-primary p-2 sm:p-3 text-left">Description</th>
                    <th className="border border-primary p-2 sm:p-3 text-center">Qty</th>
                    <th className="border border-primary p-2 sm:p-3 text-right">
                      Unit Price (KES)
                    </th>
                    <th className="border border-primary p-2 sm:p-3 text-right">
                      Total (KES)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id} className="hover:bg-muted/30">
                      <td className="border border-border p-2 sm:p-3 text-foreground">
                        {index + 1}
                      </td>
                      <td className="border border-border p-2 sm:p-3">
                        <div className="flex items-center gap-3">
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 object-cover rounded border"
                            />
                          )}
                          <span className="font-medium text-foreground">
                            {product.name || "[Product Name]"}
                          </span>
                        </div>
                      </td>
                      <td className="border border-border p-2 sm:p-3 text-muted-foreground text-xs">
                        {product.description || "[Description]"}
                      </td>
                      <td className="border border-border p-2 sm:p-3 text-center text-foreground">
                        {product.quantity}
                      </td>
                      <td className="border border-border p-2 sm:p-3 text-right text-foreground">
                        {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="border border-border p-2 sm:p-3 text-right font-semibold text-foreground">
                        {formatCurrency(product.quantity * product.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Summary */}
            <div className="mb-8 flex justify-end">
              <div className="w-full md:w-96">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 text-muted-foreground">Subtotal:</td>
                      <td className="py-2 text-right font-semibold text-foreground">
                        KES {formatCurrency(calculateSubtotal())}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 text-muted-foreground">Installation:</td>
                      <td className="py-2 text-right font-semibold text-foreground">
                        KES {formatCurrency(installationCost)}
                      </td>
                    </tr>
                    {includeTax && (
                      <tr className="border-b border-border">
                        <td className="py-2 text-muted-foreground">VAT (16%):</td>
                        <td className="py-2 text-right font-semibold text-foreground">
                          KES {formatCurrency(calculateVAT())}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-primary/10">
                      <td className="py-3 text-lg font-bold text-primary">
                        Total Payable:
                      </td>
                      <td className="py-3 text-right text-xl font-bold text-primary">
                        KES {formatCurrency(calculateTotal())}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Value Proposition */}
            <div className="mb-8 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
              <h3 className="text-lg font-bold text-primary mb-3">
                Why Choose Colcal Machinery?
              </h3>
              <p className="text-sm text-foreground mb-4 leading-relaxed">
                Colcal Machinery specializes in reliable power and machinery solutions
                across Kenya and East Africa. We offer complete installation, testing,
                and commissioning services handled by certified technicians. Every
                project is delivered on time, professionally executed, and backed by
                after-sales support.
              </p>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-secondary font-bold text-lg">✓</span>
                  <span className="text-foreground">
                    Trusted brands like Perkins, Cummins, Jinko, SRNE, and Premier
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary font-bold text-lg">✓</span>
                  <span className="text-foreground">
                    Expert installation and training
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary font-bold text-lg">✓</span>
                  <span className="text-foreground">5-year warranty on solar systems</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary font-bold text-lg">✓</span>
                  <span className="text-foreground">
                    24/7 technical support and spare parts availability
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary mb-4">Payment Details</h3>
              <div className="grid md:grid-cols-2 gap-6 p-6 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="font-bold text-foreground mb-3">LIPA NA MPESA</p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Paybill:</span> 880100
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold">Account Number:</span> 308388
                  </p>
                </div>
                <div>
                  <p className="font-bold text-foreground mb-3">BANKING DETAILS</p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Bank Name:</span> NCBA BANK KENYA PLC
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Account Name:</span> COLCAL EQUIPMENTS LIMITED
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Account Number:</span> 1011585472
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">SWIFT Code:</span> CBAFKENX
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Bank Code:</span> 7
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold">Branch Code:</span> 130 (Kitengela Branch)
                  </p>
                </div>
              </div>
            </div>

            {/* Sales Representative */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary mb-4">
                Quotation Prepared By:
              </h3>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="font-semibold text-foreground">Name:</span>{" "}
                  <span className="text-muted-foreground">
                    {salesRepInfo.name || "[Sales Rep Name]"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Position:</span>{" "}
                  <span className="text-muted-foreground">
                    {salesRepInfo.position}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Phone:</span>{" "}
                  <span className="text-muted-foreground">
                    {salesRepInfo.phone || "[Phone]"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Email:</span>{" "}
                  <span className="text-muted-foreground">
                    {salesRepInfo.email || "[Email]"}
                  </span>
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Authorized Signature:</p>
                {salesRepInfo.signature ? (
                  <div className="w-64">
                    <img
                      src={salesRepInfo.signature}
                      alt="Signature"
                      className="max-h-16 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 border-b-2 border-foreground/20 w-64"></div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Date: {date}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t-2 border-primary text-center">
              <p className="text-sm font-semibold text-primary mb-2">
                For reliable solar, generator, and machinery solutions — trust Colcal machinery
              </p>
              <p className="text-xs text-muted-foreground">
                Delivering power across Kenya & East Africa
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>www.colcalmachinery.co.ke</span>
                <span>|</span>
                <span>sales@colcalmachinery.co.ke</span>
                <span>|</span>
                <span>Tel: 0701 652100</span>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Quotations (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {savedQuotations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No saved quotations found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {savedQuotations.map((quotation) => (
                      <Card key={quotation.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-foreground mb-2 break-words">
                                {quotation.project_title || "Untitled Quotation"}
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <p>
                                  <span className="font-medium">Number:</span> {quotation.quotation_number}
                                </p>
                                <p>
                                  <span className="font-medium">Date:</span> {quotation.date}
                                </p>
                                <p>
                                  <span className="font-medium">Customer:</span> {quotation.customer_info.name}
                                </p>
                                <p>
                                  <span className="font-medium">Company:</span> {quotation.customer_info.company}
                                </p>
                                <p>
                                  <span className="font-medium">Total:</span> KES{" "}
                                  {formatCurrency(
                                    quotation.products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0) +
                                    Number(quotation.installation_cost) +
                                    (quotation.include_tax ? quotation.products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0) * 0.16 : 0)
                                  )}
                                </p>
                                <p>
                                  <span className="font-medium">Created:</span>{" "}
                                  {new Date(quotation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 sm:ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadQuotation(quotation)}
                                className="flex-1 sm:flex-none"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteQuotation(quotation.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QuotationForm;
