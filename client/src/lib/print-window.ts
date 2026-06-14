/** Open HTML in a new tab/window for printing; iframe fallback if popups are blocked. */
export function printHtmlDocument(html: string, windowFeatures?: string): boolean {
  const features = windowFeatures ?? "width=420,height=640";
  const popup = window.open("", "_blank", features);
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    return true;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none",
  );
  document.body.appendChild(iframe);
  const frameWin = iframe.contentWindow;
  const doc = frameWin?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    frameWin?.focus();
    frameWin?.print();
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  }, 200);
  return true;
}
