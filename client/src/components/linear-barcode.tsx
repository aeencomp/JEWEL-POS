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
  width = LABEL_BARCODE_DEFAULTS.width,
  height = LABEL_BARCODE_DEFAULTS.height,
  showValue = true,
  className,
}: LinearBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      renderLinearBarcode(svgRef.current, value, {
        width,
        height,
        displayValue: showValue,
      });
    } catch {
      /* invalid value for CODE128 */
    }
  }, [value, width, height, showValue]);

  return <svg ref={svgRef} className={className} data-testid="img-linear-barcode" />;
}
