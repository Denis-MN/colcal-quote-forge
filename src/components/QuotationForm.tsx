import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileDown, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import colcalLogo from "@/assets/colcal-logo.webp";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

const QuotationForm = () => {
  const { toast } = useToast();
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

  const handleProductImageUpload = (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, (dataUrl) => {
        updateProduct(productId, "image", dataUrl);
      });
    }
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
      const element = document.getElementById("quotation-preview");
      if (!element) return;

      toast({
        title: "Generating PDF...",
        description: "Please wait while we prepare your quotation.",
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Colcal_Quotation_${quotationNumber}.pdf`);

      toast({
        title: "PDF Generated!",
        description: "Your quotation has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Form Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
            <CardTitle className="text-2xl">Create New Quotation</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
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
              </div>
            </div>

            <Separator />

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Products/Systems</h3>
                <Button onClick={addProduct} size="sm" variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
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
                          <div className="flex items-center gap-3">
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
                                className="h-12 w-12 object-cover rounded border"
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

            <div className="flex justify-end pt-4">
              <Button onClick={generatePDF} size="lg" className="gap-2">
                <FileDown className="h-5 w-5" />
                Generate PDF Quotation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card id="quotation-preview" className="bg-white shadow-xl">
          <CardContent className="p-8 md:p-12">
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
                  Barkat Biashara Mall, Kumasi Road, Opp SBM Bank, Nairobi, Kenya
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

            {/* Products Table */}
            <div className="mb-8 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="border border-primary p-3 text-left">#</th>
                    <th className="border border-primary p-3 text-left">Product</th>
                    <th className="border border-primary p-3 text-left">Description</th>
                    <th className="border border-primary p-3 text-center">Qty</th>
                    <th className="border border-primary p-3 text-right">
                      Unit Price (KES)
                    </th>
                    <th className="border border-primary p-3 text-right">
                      Total (KES)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id} className="hover:bg-muted/30">
                      <td className="border border-border p-3 text-foreground">
                        {index + 1}
                      </td>
                      <td className="border border-border p-3">
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
                      <td className="border border-border p-3 text-muted-foreground text-xs">
                        {product.description || "[Description]"}
                      </td>
                      <td className="border border-border p-3 text-center text-foreground">
                        {product.quantity}
                      </td>
                      <td className="border border-border p-3 text-right text-foreground">
                        {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="border border-border p-3 text-right font-semibold text-foreground">
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
                    <span className="font-semibold">Business Number:</span> 400200
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold">Account Number:</span> 889545
                  </p>
                </div>
                <div>
                  <p className="font-bold text-foreground mb-3">BANKING DETAILS</p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Bank Name:</span> CO-OPERATIVE BANK OF KENYA
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Account Name:</span> COLCAL MACHINERY AND EQUIPMENT COMPANY
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Account Number:</span> 01101384733002
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">SWIFT Code:</span> KCOOKENA
                  </p>
                  <p className="text-muted-foreground mb-1">
                    <span className="font-semibold">Bank Code:</span> 11000
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold">Branch Code:</span> 11135 (Tom Mboya Branch)
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
      </div>
    </div>
  );
};

export default QuotationForm;
