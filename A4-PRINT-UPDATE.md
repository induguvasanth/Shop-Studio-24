# Shop Studio 23 — A4 workspace update

## Changes
- Removed top-bar slogan `LOCAL • PRIVATE • PRINT READY`.
- Disabled the shared script's duplicate `🖨 Print / Chrome dialog` button injection across sections. Existing purposeful PDF/Print actions are retained.
- Print Studio → Collage & Layout defaults: **4 images**, **A4**.
- New **A4 Print** workspace directly after Scan Document in sidebar.
- White A4 page (portrait by default), multi-file image/PDF upload, one editable item per image or PDF page, blank page insertion, page switcher, Ctrl+click multiple selection, drag, eight edge/corner resize handles, per-item 90-degree rotation, crop and remove, page rotation, light background cleanup, PDF export, print-ready PDF.
- Existing sections and backend files retained without altering their implementations.

## Operation
1. Click A4 Print, upload one or several images and/or PDFs; each imported PDF page becomes a separate movable item on the current A4 page.
2. Click a photo to select, Ctrl+click to select multiple. Drag a selection; pull the white resize handles on the active item. Individual rotation and crop apply to the active/selected image as indicated.
3. Use **+ Blank Page** to insert another A4 page, then upload images into the new page. Choose page thumbnails to switch pages.
4. Export PDF or open the print-ready PDF to print. Editing controls are not included in the generated pages.
5. Background clean targets near-white/gray areas; it is not AI segmentation. Review the result before printing.

## Browser/architecture limitations
- Browser automation could not navigate to localhost or file URL in the testing sandbox (`ERR_BLOCKED_BY_ADMINISTRATOR`), so pointer/print integration must be verified on GitHub Pages.
- PDF imports require the existing PDF.js CDN; PDF exports require the existing pdf-lib CDN. Internet access must be available for these libraries.
- PDF imports are rasterized for editing, so vector text will not remain independently selectable in exported sheets.
- Printed size is A4, but verify printer settings (paper A4, scale 100%).
- The new A4 editor is independent and does not alter the existing Scan Document page-editing code.

## Deployment
Replace the repo files with ZIP contents, or update `index.html`, `shopstudio.bundle.js`, `sw.js`, and add `a4-print.js`, `a4-print.css`. Cache refresh: close old tabs and hard reload.
