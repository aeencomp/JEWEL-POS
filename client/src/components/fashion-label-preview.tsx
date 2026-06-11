import { barcodePayload, hasArabicText } from "@/lib/barcode";
import { FASHION_LABEL_MM, getFashionLabelBarcodeOptions } from "@/lib/linear-barcode";
import { LinearBarcode } from "@/components/linear-barcode";

type FashionLabelPreviewProps = {
  name: string;
  price: string;
  barcodeValue: string;
  className?: string;
};

/** On-screen preview matching 50×25 mm thermal print layout. */
export function FashionLabelPreview({ name, price, barcodeValue, className }: FashionLabelPreviewProps) {
  const { width, height } = FASHION_LABEL_MM;
  const bcOpts = getFashionLabelBarcodeOptions(barcodeValue);
  const bcNum = barcodePayload(barcodeValue);
  const nameDir = hasArabicText(name) ? "rtl" : "ltr";

  return (
    <div
      className={`bg-white text-black overflow-hidden ${className ?? ""}`}
      style={{
        width: `${width}mm`,
        height: `${height}mm`,
        maxWidth: `${width}mm`,
        maxHeight: `${height}mm`,
        padding: "2mm 3.5mm 2.5mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <p
        className="shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-center leading-[1.15]"
        style={{ fontSize: "10.5pt", direction: nameDir }}
        dir="auto"
      >
        {name}
      </p>
      <div className="flex min-h-0 flex-1 flex-col justify-center py-[0.5mm]">
        <div className="flex h-[12mm] w-full items-center justify-center overflow-hidden">
          <LinearBarcode
            value={barcodeValue}
            width={bcOpts.width}
            height={bcOpts.height}
            showValue={false}
            className="h-full w-full max-h-[12mm]"
          />
        </div>
        <p
          className="mt-[0.5mm] leading-none"
          style={{ fontSize: "8.5pt", textAlign: "left", paddingLeft: "1.5mm", fontFamily: "Arial, sans-serif" }}
        >
          {bcNum}
        </p>
      </div>
      <p
        className="shrink-0 text-center leading-none"
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "24pt",
          fontWeight: "bold",
          paddingBottom: "0.5mm",
        }}
      >
        {price}
      </p>
    </div>
  );
}
