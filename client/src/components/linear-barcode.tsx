import { useEffect, useRef } from "react";
import { inferBarcodeFormat } from "@/lib/barcode";
import { LABEL_BARCODE_DEFAULTS, renderLinearBarcode } from "@/lib/linear-barcode";

type LinearBarcodeProps = {
  value: string;
  width?: number;
  height?: number;
  showValue?: boolean;
  className?: string;
};

export function LinearBarcode({
  value,
  width,
  height,
  showValue = true,
  className,
}: LinearBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isEan = inferBarcodeFormat(value) === "EAN13";
  const barWidth = width ?? (isEan ? 2.2 : LABEL_BARCODE_DEFAULTS.width);
  const barHeight = height ?? (isEan ? 90 : LABEL_BARCODE_DEFAULTS.height);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      renderLinearBarcode(svgRef.current, value, {
        width: barWidth,
        height: barHeight,
        displayValue: showValue,
      });
    } catch {
      /* invalid value for CODE128 */
    }
  }, [value, barWidth, barHeight, showValue]);

  return <svg ref={svgRef} className={className} data-testid="img-linear-barcode" />;
}
