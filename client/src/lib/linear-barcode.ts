import JsBarcode from "jsbarcode";

export type LinearBarcodeOptions = {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
};

export function renderLinearBarcode(
  element: SVGSVGElement | HTMLCanvasElement,
  value: string,
  options: LinearBarcodeOptions = {},
) {
  JsBarcode(element, value, {
    format: "CODE128",
    width: options.width ?? 2,
    height: options.height ?? 50,
    displayValue: options.displayValue ?? true,
    fontSize: options.fontSize ?? 12,
    margin: 6,
  });
}

export function linearBarcodeToDataUrl(value: string, options: LinearBarcodeOptions = {}): string {
  const canvas = document.createElement("canvas");
  renderLinearBarcode(canvas, value, options);
  return canvas.toDataURL("image/png");
}
