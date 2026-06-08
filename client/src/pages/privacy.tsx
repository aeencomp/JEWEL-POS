import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";

export default function PrivacyPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <header className="border-b px-4 py-3 flex items-center justify-between max-w-3xl mx-auto">
        <h1 className="font-bold text-lg">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
        <LanguageToggle />
      </header>
      <main className="max-w-3xl mx-auto p-4 prose prose-sm dark:prose-invert space-y-4 text-sm leading-relaxed">
        {isAr ? (
          <>
            <p><strong>IQ Order</strong> — تطبيق توصيل طعام من IQ-POS (iq-pos.com).</p>
            <p>نجمع الاسم ورقم الهاتف وعنوان التوصيل لإتمام الطلبات. قد نستخدم الموقع التقريبي لعرض تتبع السائق. لا نبيع بياناتك لأطراف ثالثة.</p>
            <p>للاستفسارات: support@iq-pos.com</p>
            <p className="text-muted-foreground">آخر تحديث: يونيو 2026</p>
          </>
        ) : (
          <>
            <p><strong>IQ Order</strong> is a food delivery app by IQ-POS (iq-pos.com).</p>
            <p>We collect your name, phone number, and delivery address to fulfill orders. Approximate location may be used to show driver tracking on a map. We do not sell your data to third parties.</p>
            <p>Contact: support@iq-pos.com</p>
            <p className="text-muted-foreground">Last updated: June 2026</p>
          </>
        )}
      </main>
    </div>
  );
}
