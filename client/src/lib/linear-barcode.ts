import JsBarcode from "jsbarcode";

export type LinearBarcodeOptions = {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
};

export const LABEL_BARCODE_DEFAULTS: LinearBarcodeOptions = {
  width: 2.5,
  height: 120,
  displayValue: true,
  fontSize: 18,
  margin: 10,
};

/** Tall bars for thermal labels — narrow modules when code is long so it still fits width. */
export function getPrintBarcodeOptions(code: string): LinearBarcodeOptions {
  const len = code.length;
  const width = len > 18 ? 1.8 : len > 14 ? 2 : len > 10 ? 2.5 : 3;
  return {
    width,
    height: 200,
    displayValue: true,
    fontSize: 22,
    margin: 8,
  };
}

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
