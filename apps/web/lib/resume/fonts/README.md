Fonts embedded in résumé PDFs (lib/resume/pdf.ts, lib/resume/doc-pdf.ts) and shown on the résumé
editor's sheet (components/resume/resume.module.css). All are under the SIL Open Font License 1.1
and copied from their @fontsource packages (5.3.x), Latin subset.

- atkinson-400.woff, atkinson-700.woff: Atkinson Hyperlegible Next.
- noto-sans-sc-400.woff: Noto Sans SC, simplified Chinese subset (also covers Latin), for text the
  chosen font has no glyph for. Only the glyphs a résumé uses are embedded.
- arimo-*.woff (Arimo, drawn to Arial's widths), carlito-*.woff (Carlito, Calibri's widths),
  tinos-*.woff (Tinos, Times New Roman's widths), gelasio-*.woff (Gelasio, Georgia's widths):
  stand-ins for the fonts recruiters expect, which we may not embed in a file we hand out.
