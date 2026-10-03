import { Github, Info, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PIECE_IMG } from "@/lib/pieces";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, t, setLang } = useI18n();
  return (
    <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="gap-1.5 text-muted-foreground" lang={lang === "en" ? "ar" : "en"}>
      <Languages aria-hidden="true" /> {t.switchLang}
    </Button>
  );
}

export function AboutDialog() {
  const { t, dir } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"><Info aria-hidden="true" /> {t.about}</Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <span className="mb-2 flex size-14 items-center justify-center rounded-md bg-primary"><img src={PIECE_IMG.b.N} alt="" className="size-12" /></span>
          <DialogTitle className="font-display text-2xl">{t.appName}</DialogTitle>
          <DialogDescription className="leading-6">{t.aboutBody}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border/60 rounded-md border border-border/60 text-sm">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <dt className="text-muted-foreground">{t.version}</dt>
            <dd dir="ltr" className="font-semibold tabular-nums">v{__APP_VERSION__}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <dt className="text-muted-foreground">{t.source}</dt>
            <dd className="min-w-0">
              <a href={__REPO_URL__} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1.5 break-all font-semibold text-primary hover:underline">
                <Github className="size-4 shrink-0" aria-hidden="true" /> {__REPO_URL__.replace("https://github.com/", "")}
              </a>
            </dd>
          </div>
        </dl>
        <p className="text-center text-xs text-muted-foreground">{t.pieceCredit}</p>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" className="w-full">{t.close}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
