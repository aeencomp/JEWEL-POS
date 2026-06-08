import { useEffect, useRef } from "react";
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
  const digits = value.replace(/\D/g, "");
  const isShort = digits.length > 0 && digits.length <= 8;
  const barWidth = width ?? (isShort ? 3.5 : LABEL_BARCODE_DEFAULTS.width);
  const barHeight = height ?? (isShort ? 70 : LABEL_BARCODE_DEFAULTS.height);

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
