import JsBarcode from "jsbarcode";

export type LinearBarcodeOptions = {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
};

export const LABEL_BARCODE_DEFAULTS: LinearBarcodeOptions = {
  width: 3,
  height: 80,
  displayValue: true,
  fontSize: 16,
  margin: 12,
};

export const PRINT_BARCODE_DEFAULTS: LinearBarcodeOptions = {
  width: 3.5,
  height: 100,
  displayValue: true,
  fontSize: 18,
  margin: 14,
};

export function renderLinearBarcode(
  element: SVGSVGElement | HTMLCanvasElement,
  value: string,
  options: LinearBarcodeOptions = {},
) {
  JsBarcode(element, value, {
    format: "CODE128",
    width: options.width ?? LABEL_BARCODE_DEFAULTS.width,
    height: options.height ?? LABEL_BARCODE_DEFAULTS.height,
    displayValue: options.displayValue ?? true,
    fontSize: options.fontSize ?? LABEL_BARCODE_DEFAULTS.fontSize,
    margin: options.margin ?? LABEL_BARCODE_DEFAULTS.margin,
  });
}

export function linearBarcodeToDataUrl(value: string, options: LinearBarcodeOptions = {}): string {
  const canvas = document.createElement("canvas");
  renderLinearBarcode(canvas, value, options);
  return canvas.toDataURL("image/png");
}
