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
        padding: "1.5mm 2.5mm 1.2mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <p
        className="shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-center leading-[1.1] mb-[0.4mm]"
        style={{ fontSize: "9pt", direction: nameDir }}
        dir="auto"
      >
        {name}
      </p>
      <div className="flex w-full shrink-0 flex-col">
        <div className="flex w-full items-center justify-center overflow-hidden">
          <LinearBarcode
            value={barcodeValue}
            width={bcOpts.width}
            height={bcOpts.height}
            showValue={false}
            className="block h-auto w-full max-w-[45mm]"
          />
        </div>
        <p
          className="mt-[0.3mm] leading-none"
          style={{ fontSize: "7.5pt", textAlign: "left", paddingLeft: "1mm", fontFamily: "Arial, sans-serif" }}
        >
          {bcNum}
        </p>
      </div>
      <p
        className="mt-[0.6mm] shrink-0 text-center leading-none"
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "14pt",
          fontWeight: "bold",
        }}
      >
        {price}
      </p>
    </div>
  );
}
