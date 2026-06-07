import { useEffect } from "react";

export function usePwaManifest(href: string) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prev = link?.getAttribute("href") ?? "/manifest.json";
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = href;
    return () => { if (link) link.href = prev; };
  }, [href]);
}
